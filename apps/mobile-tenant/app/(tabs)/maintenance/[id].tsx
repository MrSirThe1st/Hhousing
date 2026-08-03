import { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CardSkeleton } from "@/components/skeleton";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { ApiResult } from "@/lib/api-client";
import { getWithAuth } from "@/lib/api-client";
import { ScreenShell } from "@/components/screen-shell";
import i18n from "@/i18n";
import { formatLocaleDate, formatLocaleDateTime } from "@/i18n/format";
import { fontWeight, fontSize, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

type MaintenanceStatus = "open" | "in_progress" | "resolved" | "cancelled";

type MaintenanceRequestView = {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: MaintenanceStatus;
  createdAtIso: string;
  assignedToName?: string;
  resolutionNotes?: string;
  photoUrls: string[];
};

type MaintenanceTimelineEventView = {
  id: string;
  eventType: "created" | "status_changed" | "assigned" | "internal_note_updated" | "resolution_note_updated";
  createdAtIso: string;
  statusFrom?: string;
  statusTo?: string;
  assignedToName?: string;
  note?: string;
};

interface DetailOutput {
  request: MaintenanceRequestView;
  timeline: MaintenanceTimelineEventView[];
}

function statusLabel(status: MaintenanceStatus, t: TFunction): string {
  switch (status) {
    case "open":
      return t("maintenance.status.open");
    case "in_progress":
      return t("maintenance.status.inProgress");
    case "resolved":
      return t("maintenance.status.resolved");
    case "cancelled":
      return t("maintenance.status.cancelled");
  }
}

function priorityLabel(priority: MaintenanceRequestView["priority"], t: TFunction): string {
  switch (priority) {
    case "low":
      return t("maintenance.priority.low");
    case "medium":
      return t("maintenance.priority.medium");
    case "high":
      return t("maintenance.priority.high");
    case "urgent":
      return t("maintenance.priority.urgent");
  }
}

function eventLabel(eventType: MaintenanceTimelineEventView["eventType"], t: TFunction): string {
  switch (eventType) {
    case "created":
      return t("maintenance.event.created");
    case "status_changed":
      return t("maintenance.event.statusChanged");
    case "assigned":
      return t("maintenance.event.assigned");
    case "internal_note_updated":
      return t("maintenance.event.internalNote");
    case "resolution_note_updated":
      return t("maintenance.event.resolutionNote");
  }
}

function statusLabelFromRaw(value: string | undefined, t: TFunction): string {
  switch (value) {
    case "open":
    case "in_progress":
    case "resolved":
    case "cancelled":
      return statusLabel(value, t);
    default:
      return value ?? "";
  }
}

function getStatusColor(colors: ThemeColors): Record<MaintenanceStatus, string> {
  return {
    open: colors.warning,
    in_progress: colors.brand,
    resolved: colors.success,
    cancelled: colors.textMuted
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeStatus(value: unknown): MaintenanceStatus {
  switch (value) {
    case "open":
    case "in_progress":
    case "resolved":
    case "cancelled":
      return value;
    default:
      return "open";
  }
}

function normalizePriority(value: unknown): MaintenanceRequestView["priority"] {
  switch (value) {
    case "low":
    case "medium":
    case "high":
    case "urgent":
      return value;
    default:
      return "medium";
  }
}

function normalizeEventType(value: unknown): MaintenanceTimelineEventView["eventType"] {
  switch (value) {
    case "created":
    case "status_changed":
    case "assigned":
    case "internal_note_updated":
    case "resolution_note_updated":
      return value;
    default:
      return "created";
  }
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function normalizeRequest(value: unknown): MaintenanceRequestView {
  const raw = isRecord(value) ? value : {};
  const rawPhotos = Array.isArray(raw.photoUrls) ? raw.photoUrls : [];
  const photoUrls = rawPhotos.filter((item): item is string => typeof item === "string" && item.length > 0);

  return {
    id: asString(raw.id, ""),
    title: asString(raw.title, i18n.t("maintenance.defaultTitle")),
    description: asString(raw.description, ""),
    priority: normalizePriority(raw.priority),
    status: normalizeStatus(raw.status),
    createdAtIso: asString(raw.createdAtIso || raw.createdAt, new Date().toISOString()),
    assignedToName: asString(raw.assignedToName) || undefined,
    resolutionNotes: asString(raw.resolutionNotes) || undefined,
    photoUrls
  };
}

function normalizeTimeline(value: unknown): MaintenanceTimelineEventView[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item, index) => {
    const raw = isRecord(item) ? item : {};
    return {
      id: asString(raw.id, `event-${index}`),
      eventType: normalizeEventType(raw.eventType || raw.type),
      createdAtIso: asString(raw.createdAtIso || raw.createdAt, new Date().toISOString()),
      statusFrom: asString(raw.statusFrom) || undefined,
      statusTo: asString(raw.statusTo) || undefined,
      assignedToName: asString(raw.assignedToName) || undefined,
      note: asString(raw.note || raw.description) || undefined
    };
  });
}

type DetailStyles = ReturnType<typeof createStyles>;

export default function MaintenanceDetailScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const statusColor = useMemo(() => getStatusColor(colors), [colors]);
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DetailOutput | null>(null);

  const createdDateLabel = useMemo(
    () => (data ? formatLocaleDate(data.request.createdAtIso) : ""),
    [data, i18n.language]
  );

  const load = useCallback(async (): Promise<void> => {
    if (!id) {
      setError(t("maintenance.invalidRequestId"));
      return;
    }
    setIsLoading(true);
    setError(null);
    const result: ApiResult<DetailOutput> = await getWithAuth<DetailOutput>(
      `/api/mobile/maintenance/${encodeURIComponent(id)}`
    );
    if (!result.success) {
      setError(result.error);
    } else {
      setData({
        request: normalizeRequest(result.data.request),
        timeline: normalizeTimeline(result.data.timeline)
      });
    }
    setIsLoading(false);
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!id) {
    return (
      <ScreenShell title={t("common.error")} subtitle={t("maintenance.invalidId")}>
        <Text style={styles.errorText}>{t("maintenance.loadError")}</Text>
      </ScreenShell>
    );
  }

  if (isLoading) {
    return (
      <ScreenShell title={t("maintenance.title")} subtitle={t("maintenance.detailSubtitle")}>
        <CardSkeleton />
        <CardSkeleton />
      </ScreenShell>
    );
  }

  if (error || !data) {
    return (
      <ScreenShell title={t("common.error")} subtitle={t("maintenance.loadErrorSubtitle")}>
        <View style={styles.notice}>
          <Text style={styles.errorText}>{error ?? t("maintenance.unknownError")}</Text>
          <Pressable style={styles.retry} onPress={() => { void load(); }}>
            <Text style={styles.retryText}>{t("common.retry")}</Text>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  const { request, timeline } = data;

  return (
    <ScreenShell title={request.title} subtitle={priorityLabel(request.priority, t)}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        {/* Request Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: statusColor[request.status] }
                ]}
              />
              <Text
                style={[
                  styles.statusLabel,
                  { color: statusColor[request.status] }
                ]}
              >
                {statusLabel(request.status, t)}
              </Text>
            </View>
            <Text style={styles.createdDate}>
              {createdDateLabel}
            </Text>
          </View>

          <Text style={styles.description}>{request.description}</Text>

          {request.assignedToName ? (
            <View style={styles.assignedRow}>
              <Text style={styles.fieldLabel}>{t("maintenance.assignedTo")}</Text>
              <Text style={styles.fieldValue}>{request.assignedToName}</Text>
            </View>
          ) : null}

          {request.resolutionNotes ? (
            <View style={styles.resolutionSection}>
              <Text style={styles.fieldLabel}>{t("maintenance.resolution")}</Text>
              <Text style={styles.resolutionNotes}>{request.resolutionNotes}</Text>
            </View>
          ) : null}

          {request.photoUrls.length > 0 ? (
            <View style={styles.photosSection}>
              <Text style={styles.fieldLabel}>{t("maintenance.photos")}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.photosRow}
              >
                {request.photoUrls.map((url: string) => (
                  <Pressable
                    key={url}
                    onPress={() => { void Linking.openURL(url); }}
                  >
                    <Image source={{ uri: url }} style={styles.photoThumb} />
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          ) : null}
        </View>

        {/* Timeline Section */}
        {timeline.length > 0 ? (
          <View style={styles.timelineSection}>
            <Text style={styles.sectionTitle}>{t("maintenance.history")}</Text>
            <View style={styles.timeline}>
              {timeline.map((event, index) => (
                <TimelineEvent
                  key={event.id}
                  event={event}
                  isLast={index === timeline.length - 1}
                  styles={styles}
                  iconColor={colors.iconMuted}
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* Back Button */}
        <Pressable style={styles.backButton} onPress={() => { router.back(); }}>
          <Text style={styles.backButtonText}>{t("maintenance.backToList")}</Text>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function TimelineEvent({
  event,
  isLast,
  styles,
  iconColor
}: {
  event: MaintenanceTimelineEventView;
  isLast: boolean;
  styles: DetailStyles;
  iconColor: string;
}): React.ReactElement {
  const { t, i18n } = useTranslation();

  const getEventIcon = (type: MaintenanceTimelineEventView["eventType"]): IoniconName => {
    switch (type) {
      case "created":
        return "clipboard-outline";
      case "status_changed":
        return "refresh-outline";
      case "assigned":
        return "person-outline";
      case "internal_note_updated":
        return "create-outline";
      case "resolution_note_updated":
        return "checkmark-circle-outline";
      default:
        return "ellipse-outline";
    }
  };

  const getEventDescription = (
    event: MaintenanceTimelineEventView
  ): string => {
    switch (event.eventType) {
      case "created":
        return t("maintenance.event.createdDesc");
      case "status_changed":
        return t("maintenance.event.statusChangedDesc", {
          from: statusLabelFromRaw(event.statusFrom, t),
          to: statusLabelFromRaw(event.statusTo, t)
        });
      case "assigned":
        return t("maintenance.event.assignedDesc", {
          name: event.assignedToName || t("maintenance.event.someone")
        });
      case "internal_note_updated":
        return event.note ?? t("maintenance.event.internalNote");
      case "resolution_note_updated":
        return event.note ?? t("maintenance.event.resolutionNote");
      default:
        return eventLabel(event.eventType, t);
    }
  };

  const eventTimeLabel = useMemo(
    () =>
      formatLocaleDateTime(event.createdAtIso, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }),
    [event.createdAtIso, i18n.language]
  );

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineConnector}>
        <View style={styles.timelineDot} />
        {!isLast ? <View style={styles.timelineLine} /> : null}
      </View>
      <View style={styles.timelineContent}>
        <View style={styles.eventHeader}>
          <Ionicons name={getEventIcon(event.eventType)} size={16} color={iconColor} style={styles.eventIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.eventDescription}>{getEventDescription(event)}</Text>
            <Text style={styles.eventTime}>
              {eventTimeLabel}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1 },
    centerContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center"
    },
    notice: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 10
    },
    errorText: { color: colors.danger, fontSize: fontSize.secondary },
    retry: {
      alignSelf: "flex-start",
      borderRadius: 8,
      backgroundColor: colors.brand,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    retryText: { color: colors.onBrand, fontWeight: "600", fontSize: fontSize.secondary },
    headerCard: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 12,
      marginBottom: 16
    },
    headerRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center"
    },
    statusBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4
    },
    statusLabel: {
      fontSize: fontSize.secondary,
      fontWeight: "600"
    },
    createdDate: {
      fontSize: fontSize.caption,
      color: colors.textMuted
    },
    description: {
      fontSize: fontSize.secondary,
      color: colors.textSecondary,
      lineHeight: 20
    },
    assignedRow: {
      gap: 4,
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border
    },
    fieldLabel: {
      fontSize: fontSize.caption,
      fontWeight: "600",
      color: colors.textMuted
    },
    fieldValue: {
      fontSize: fontSize.secondary,
      color: colors.text,
      fontWeight: "500"
    },
    resolutionSection: {
      paddingTop: 8,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 4
    },
    resolutionNotes: {
      fontSize: fontSize.secondary,
      color: colors.success,
      lineHeight: 18
    },
    timelineSection: {
      marginBottom: 20,
      gap: 12
    },
    sectionTitle: {
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
      color: colors.text
    },
    timeline: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: "hidden"
    },
    timelineItem: {
      flexDirection: "row",
      paddingHorizontal: 14,
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.surfaceMuted
    },
    timelineConnector: {
      width: 32,
      alignItems: "center",
      marginRight: 12
    },
    timelineDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: colors.brand
    },
    timelineLine: {
      width: 2,
      flex: 1,
      backgroundColor: colors.border,
      marginTop: 6
    },
    timelineContent: {
      flex: 1,
      justifyContent: "center"
    },
    eventHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8
    },
    eventIcon: {
      marginTop: 1
    },
    eventDescription: {
      fontSize: fontSize.secondary,
      color: colors.text,
      fontWeight: "500"
    },
    eventTime: {
      fontSize: fontSize.caption,
      color: colors.textFaint,
      marginTop: 2
    },
    backButton: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      paddingVertical: 12,
      alignItems: "center",
      marginBottom: 30
    },
    backButtonText: {
      color: colors.textSecondary,
      fontWeight: "600",
      fontSize: fontSize.secondary
    },
    photosSection: { marginTop: 12 },
    photosRow: { gap: 10, paddingVertical: 4 },
    photoThumb: {
      width: 90,
      height: 90,
      borderRadius: 8,
      backgroundColor: colors.surfaceMuted
    }
  });
}
