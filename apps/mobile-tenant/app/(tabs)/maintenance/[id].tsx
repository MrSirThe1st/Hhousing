import { useCallback, useEffect, useState } from "react";
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { CardSkeleton } from "@/components/skeleton";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ApiResult } from "@/lib/api-client";
import { getWithAuth } from "@/lib/api-client";
import { ScreenShell } from "@/components/screen-shell";

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

const STATUS_LABEL: Record<MaintenanceStatus, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  resolved: "Résolu",
  cancelled: "Annulé"
};

const STATUS_COLOR: Record<MaintenanceStatus, string> = {
  open: "#D97706",
  in_progress: "#2563EB",
  resolved: "#16A34A",
  cancelled: "#6B7280"
};

const PRIORITY_LABEL: Record<MaintenanceRequestView["priority"], string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente"
};

const EVENT_LABEL: Record<MaintenanceTimelineEventView["eventType"], string> = {
  created: "Créée",
  status_changed: "Statut modifié",
  assigned: "Assignée",
  internal_note_updated: "Note interne ajoutée",
  resolution_note_updated: "Note de résolution"
};

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
    title: asString(raw.title, "Demande de maintenance"),
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

export default function MaintenanceDetailScreen(): React.ReactElement {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DetailOutput | null>(null);

  const load = useCallback(async (): Promise<void> => {
    if (!id) {
      setError("Invalid request ID");
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
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!id) {
    return (
      <ScreenShell title="Erreur" subtitle="ID manquant">
        <Text style={styles.errorText}>Impossible de charger la demande.</Text>
      </ScreenShell>
    );
  }

  if (isLoading) {
    return (
      <ScreenShell title="Maintenance" subtitle="Détail de la demande">
        <CardSkeleton />
        <CardSkeleton />
      </ScreenShell>
    );
  }

  if (error || !data) {
    return (
      <ScreenShell title="Erreur" subtitle="Impossible de charger">
        <View style={styles.notice}>
          <Text style={styles.errorText}>{error ?? "Unknown error"}</Text>
          <Pressable style={styles.retry} onPress={() => { void load(); }}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  const { request, timeline } = data;

  return (
    <ScreenShell title={request.title} subtitle={PRIORITY_LABEL[request.priority]}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        {/* Request Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <View style={styles.statusBadge}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: STATUS_COLOR[request.status] }
                ]}
              />
              <Text
                style={[
                  styles.statusLabel,
                  { color: STATUS_COLOR[request.status] }
                ]}
              >
                {STATUS_LABEL[request.status]}
              </Text>
            </View>
            <Text style={styles.createdDate}>
              {new Date(request.createdAtIso).toLocaleDateString("fr-FR")}
            </Text>
          </View>

          <Text style={styles.description}>{request.description}</Text>

          {request.assignedToName ? (
            <View style={styles.assignedRow}>
              <Text style={styles.fieldLabel}>Assignée à</Text>
              <Text style={styles.fieldValue}>{request.assignedToName}</Text>
            </View>
          ) : null}

          {request.resolutionNotes ? (
            <View style={styles.resolutionSection}>
              <Text style={styles.fieldLabel}>Résolution</Text>
              <Text style={styles.resolutionNotes}>{request.resolutionNotes}</Text>
            </View>
          ) : null}

          {request.photoUrls.length > 0 ? (
            <View style={styles.photosSection}>
              <Text style={styles.fieldLabel}>Photos</Text>
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
            <Text style={styles.sectionTitle}>Historique</Text>
            <View style={styles.timeline}>
              {timeline.map((event, index) => (
                <TimelineEvent
                  key={event.id}
                  event={event}
                  isLast={index === timeline.length - 1}
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* Back Button */}
        <Pressable style={styles.backButton} onPress={() => { router.back(); }}>
          <Text style={styles.backButtonText}>Retour à la liste</Text>
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function TimelineEvent({
  event,
  isLast
}: {
  event: MaintenanceTimelineEventView;
  isLast: boolean;
}): React.ReactElement {
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
        return "Demande créée";
      case "status_changed":
        return `Statut changé de ${event.statusFrom} à ${event.statusTo}`;
      case "assigned":
        return `Assignée à ${event.assignedToName || "quelqu'un"}`;
      case "internal_note_updated":
        return event.note ?? "Note interne ajoutée";
      case "resolution_note_updated":
        return event.note ?? "Note de résolution";
      default:
        return EVENT_LABEL[event.eventType];
    }
  };

  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineConnector}>
        <View style={styles.timelineDot} />
        {!isLast ? <View style={styles.timelineLine} /> : null}
      </View>
      <View style={styles.timelineContent}>
        <View style={styles.eventHeader}>
          <Ionicons name={getEventIcon(event.eventType)} size={16} color="#6B7280" style={styles.eventIcon} />
          <View style={{ flex: 1 }}>
            <Text style={styles.eventDescription}>{getEventDescription(event)}</Text>
            <Text style={styles.eventTime}>
              {new Date(event.createdAtIso).toLocaleString("fr-FR", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  notice: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#ffffff",
    padding: 14,
    gap: 10
  },
  errorText: { color: "#B91C1C", fontSize: 14 },
  retry: {
    alignSelf: "flex-start",
    borderRadius: 8,
    backgroundColor: "#0063FE",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  retryText: { color: "#ffffff", fontWeight: "600", fontSize: 13 },
  headerCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#ffffff",
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
    fontSize: 13,
    fontWeight: "600"
  },
  createdDate: {
    fontSize: 12,
    color: "#6B7280"
  },
  description: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20
  },
  assignedRow: {
    gap: 4,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB"
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#6B7280"
  },
  fieldValue: {
    fontSize: 13,
    color: "#010A19",
    fontWeight: "500"
  },
  resolutionSection: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E5E7EB",
    gap: 4
  },
  resolutionNotes: {
    fontSize: 13,
    color: "#16A34A",
    lineHeight: 18
  },
  timelineSection: {
    marginBottom: 20,
    gap: 12
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#010A19"
  },
  timeline: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#ffffff",
    overflow: "hidden"
  },
  timelineItem: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6"
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
    backgroundColor: "#0063FE"
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#E5E7EB",
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
    fontSize: 13,
    color: "#010A19",
    fontWeight: "500"
  },
  eventTime: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 2
  },
  backButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 30
  },
  backButtonText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 14
  },
  photosSection: { marginTop: 12 },
  photosRow: { gap: 10, paddingVertical: 4 },
  photoThumb: {
    width: 90,
    height: 90,
    borderRadius: 8,
    backgroundColor: "#F3F4F6"
  }
});
