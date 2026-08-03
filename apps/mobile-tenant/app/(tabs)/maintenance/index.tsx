import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { MaintenancePriority, MaintenanceRequest } from "@hhousing/domain";
import type { ApiResult } from "@hhousing/api-contracts";
import { AppLoader, ScreenLoader } from "@/components/universal-loading-state";
import { getWithAuth, postWithAuth } from "@/lib/api-client";
import { supabase } from "@/lib/supabase";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { userFacingErrorMessage } from "@/lib/user-facing-error";
import { formatLocaleDate } from "@/i18n/format";
import { fontWeight, fontSize, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

type MobileMaintenanceOutput = { requests: MaintenanceRequest[] };
type MobileCreateOutput = { request: MaintenanceRequest };
type ScreenView = "list" | "form";
type RequestFilter = "all" | "active" | "resolved";

function statusLabel(status: MaintenanceRequest["status"], t: TFunction): string {
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

function priorityLabel(priority: MaintenancePriority, t: TFunction): string {
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

function priorityCategory(priority: MaintenancePriority, t: TFunction): string {
  switch (priority) {
    case "low":
      return t("maintenance.category.low");
    case "medium":
      return t("maintenance.category.medium");
    case "high":
      return t("maintenance.category.high");
    case "urgent":
      return t("maintenance.category.urgent");
  }
}

const PRIORITIES: MaintenancePriority[] = ["low", "medium", "high", "urgent"];

function getStatusBg(colors: ThemeColors): Record<MaintenanceRequest["status"], string> {
  return {
    open: colors.surfaceMuted,
    in_progress: colors.brandSoft,
    resolved: colors.surfaceMuted,
    cancelled: colors.surfaceMuted
  };
}

function getStatusText(colors: ThemeColors): Record<MaintenanceRequest["status"], string> {
  return {
    open: colors.warning,
    in_progress: colors.brand,
    resolved: colors.success,
    cancelled: colors.textMuted
  };
}

function formatShortDate(iso: string): string {
  return formatLocaleDate(iso, { day: "2-digit", month: "short", year: "numeric" });
}

function getMaintenanceIcon(priority: MaintenancePriority): React.ComponentProps<typeof Ionicons>["name"] {
  if (priority === "urgent") return "warning-outline";
  if (priority === "high") return "flash-outline";
  if (priority === "medium") return "water-outline";
  return "construct-outline";
}

export default function MaintenanceScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const statusBg = useMemo(() => getStatusBg(colors), [colors]);
  const statusText = useMemo(() => getStatusText(colors), [colors]);
  const router = useRouter();
  const [view, setView] = useState<ScreenView>("list");
  const [filter, setFilter] = useState<RequestFilter>("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPriority, setFormPriority] = useState<MaintenancePriority>("medium");
  const [formPhotos, setFormPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const pickPhoto = useCallback(async (): Promise<void> => {
    if (formPhotos.length >= 4) {
      setSubmitError(t("maintenance.maxPhotos"));
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setSubmitError(t("maintenance.galleryDenied"));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsMultipleSelection: false
      });

      const firstAsset = result.assets?.[0];
      if (!result.canceled && firstAsset?.uri) {
        setFormPhotos((prev) => [...prev, firstAsset.uri]);
      }
    } catch (caughtError) {
      console.error("Failed to pick maintenance photo", caughtError);
      setSubmitError(t("maintenance.galleryUnavailable"));
    }
  }, [formPhotos.length, t]);

  const removePhoto = useCallback((uri: string): void => {
    setFormPhotos((prev) => prev.filter((photo) => photo !== uri));
  }, []);

  const uploadPhotos = useCallback(async (): Promise<string[]> => {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session) return [];

    const urls: string[] = [];

    for (const uri of formPhotos) {
      const ext = uri.split(".").pop() ?? "jpg";
      const path = `${session.user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const response = await fetch(uri);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from("maintenance-photos")
        .upload(path, blob, { contentType: `image/${ext}`, upsert: false });

      if (!uploadError) {
        const { data } = supabase.storage.from("maintenance-photos").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
    }

    return urls;
  }, [formPhotos]);

  const loadRequests = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setIsOffline(false);

    const result: ApiResult<MobileMaintenanceOutput> =
      await getWithAuth<MobileMaintenanceOutput>("/api/mobile/maintenance");

    if (!result.success) {
      if (result.code === "NETWORK_ERROR") setIsOffline(true);
      setError(result.error);
    } else {
      const sorted = [...result.data.requests].sort(
        (left, right) => new Date(right.createdAtIso).getTime() - new Date(left.createdAtIso).getTime()
      );
      setRequests(sorted);
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const filteredRequests = useMemo(() => {
    if (filter === "all") return requests;

    if (filter === "active") {
      return requests.filter((request) => request.status === "open" || request.status === "in_progress");
    }

    return requests.filter((request) => request.status === "resolved");
  }, [filter, requests]);

  // Ensure date/status labels refresh when language changes.
  const requestRows = useMemo(
    () =>
      filteredRequests.map((request) => ({
        request,
        category: priorityCategory(request.priority, t),
        dateLabel: formatShortDate(request.createdAtIso),
        status: statusLabel(request.status, t).toUpperCase()
      })),
    [filteredRequests, i18n.language, t]
  );

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!formTitle.trim() || !formDescription.trim()) {
      setSubmitError(t("maintenance.titleRequired"));
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const photoUrls = await uploadPhotos();
    const result: ApiResult<MobileCreateOutput> = await postWithAuth<MobileCreateOutput>(
      "/api/mobile/maintenance",
      {
        title: formTitle.trim(),
        description: formDescription.trim(),
        priority: formPriority,
        photoUrls
      }
    );

    setIsSubmitting(false);

    if (!result.success) {
      setSubmitError(
        userFacingErrorMessage({ code: result.code, error: result.error, t })
      );
      return;
    }

    setRequests((prev) => [result.data.request, ...prev]);
    setFormTitle("");
    setFormDescription("");
    setFormPriority("medium");
    setFormPhotos([]);
    setView("list");
  }, [formDescription, formPriority, formTitle, t, uploadPhotos]);

  if (view === "form") {
    return (
      <SafeAreaView style={styles.root}>
        <ScrollView
          style={styles.formScroll}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.formTitle}>{t("maintenance.newRequest")}</Text>
          <Text style={styles.formSubtitle}>{t("maintenance.formSubtitle")}</Text>

          <Text style={styles.label}>{t("maintenance.titleLabel")}</Text>
          <TextInput
            style={styles.input}
            value={formTitle}
            onChangeText={setFormTitle}
            placeholder="Ex: Fuite sous l'évier"
            placeholderTextColor={colors.textFaint}
            maxLength={120}
          />

          <Text style={styles.label}>{t("maintenance.descriptionLabel")}</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={formDescription}
            onChangeText={setFormDescription}
            placeholder="Décrivez le problème en détail..."
            placeholderTextColor={colors.textFaint}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={1000}
          />

          <Text style={styles.label}>{t("maintenance.priorityLabel")}</Text>
          <View style={styles.priorityRow}>
            {PRIORITIES.map((priority) => (
              <Pressable
                key={priority}
                style={[styles.priorityBtn, formPriority === priority && styles.priorityBtnActive]}
                onPress={() => { setFormPriority(priority); }}
              >
                <Text
                  style={[
                    styles.priorityBtnText,
                    formPriority === priority && styles.priorityBtnTextActive
                  ]}
                >
                  {priorityLabel(priority, t)}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>{t("maintenance.photosLabel")}</Text>
          {formPhotos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoRow}>
              {formPhotos.map((uri) => (
                <View key={uri} style={styles.photoThumb}>
                  <Image source={{ uri }} style={styles.thumbImage} />
                  <Pressable style={styles.removePhoto} onPress={() => { removePhoto(uri); }}>
                    <Text style={styles.removePhotoText}>✕</Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          ) : null}

          {formPhotos.length < 4 ? (
            <Pressable style={styles.addPhotoBtn} onPress={() => { void pickPhoto(); }}>
              <Text style={styles.addPhotoBtnText}>{t("maintenance.addPhoto")}</Text>
            </Pressable>
          ) : null}

          {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

          <Pressable
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={() => { void handleSubmit(); }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <AppLoader tone="onBrand" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>{t("maintenance.submit")}</Text>
            )}
          </Pressable>

          <Pressable style={styles.cancelBtn} onPress={() => { setView("list"); }}>
            <Text style={styles.cancelBtnText}>{t("common.cancel")}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <ScreenLoader />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.screenPadding}>
          <ErrorState
            offline={isOffline}
            error={error}
            onRetry={() => { void loadRequests(); }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { void loadRequests(); }} tintColor={colors.brand} />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("maintenance.title")}</Text>
          <Text style={styles.headerSubtitle}>{t("maintenance.subtitle")}</Text>
        </View>

        <Pressable style={styles.newBtn} onPress={() => { setView("form"); }}>
          <Ionicons name="add" size={20} color={colors.onBrand} />
          <Text style={styles.newBtnText}>{t("maintenance.newRequest")}</Text>
        </Pressable>

        <View style={styles.filterRow}>
          <FilterChip
            label={t("maintenance.filterAll")}
            active={filter === "all"}
            onPress={() => { setFilter("all"); }}
            styles={styles}
          />
          <FilterChip
            label={t("maintenance.filterActive")}
            active={filter === "active"}
            onPress={() => { setFilter("active"); }}
            styles={styles}
          />
          <FilterChip
            label={t("maintenance.filterResolved")}
            active={filter === "resolved"}
            onPress={() => { setFilter("resolved"); }}
            styles={styles}
          />
        </View>

        {requestRows.length === 0 ? (
          <EmptyState
            illustration={filter === "all" ? "house" : undefined}
            icon={filter === "all" ? undefined : "construct-outline"}
            title={
              filter === "all"
                ? t("maintenance.emptyTitle")
                : t("maintenance.emptyFilterTitle")
            }
            body={
              filter === "all"
                ? t("maintenance.emptyText")
                : t("maintenance.emptyFilterText")
            }
            actionLabel={filter === "all" ? t("maintenance.newRequest") : undefined}
            onAction={filter === "all" ? () => { setView("form"); } : undefined}
          />
        ) : (
          requestRows.map(({ request, category, dateLabel, status }) => (
            <Pressable
              key={request.id}
              style={styles.requestCard}
              onPress={() => { router.push(`/(tabs)/maintenance/${request.id}`); }}
            >
              <View style={styles.requestLeftIconWrap}>
                <Ionicons name={getMaintenanceIcon(request.priority)} size={18} color={colors.brand} />
              </View>

              <View style={styles.requestBody}>
                <Text style={styles.requestTitle} numberOfLines={2}>{request.title}</Text>
                <Text style={styles.requestMeta}>
                  {category} • {dateLabel}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: statusBg[request.status] }]}>
                  <Text style={[styles.statusBadgeText, { color: statusText[request.status] }]}>
                    {status}
                  </Text>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={18} color={colors.borderStrong} />
            </Pressable>
          ))
        )}

        <View style={styles.helpCard}>
          <View style={styles.helpTextWrap}>
            <Text style={styles.helpTitle}>{t("maintenance.urgencyTitle")}</Text>
            <Text style={styles.helpDescription}>
              {t("maintenance.urgencyBody")}
            </Text>
          </View>
          <View style={styles.helpIconWrap}>
            <Ionicons name="headset-outline" size={22} color={colors.brand} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

type MaintenanceStyles = ReturnType<typeof createStyles>;

function FilterChip({
  label,
  active,
  onPress,
  styles
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  styles: MaintenanceStyles;
}): React.ReactElement {
  return (
    <Pressable style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.backgroundAlt
    },
    screenPadding: {
      flex: 1,
      paddingHorizontal: 16,
      paddingTop: 16
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 28,
      gap: 12
    },
    header: {
      gap: 2,
      marginBottom: 2
    },
    headerTitle: {
      fontSize: fontSize.display,
      fontWeight: fontWeight.semibold,
      color: colors.text
    },
    headerSubtitle: {
      fontSize: fontSize.title,
      color: colors.textMuted
    },
    newBtn: {
      backgroundColor: colors.brand,
      borderRadius: 10,
      minHeight: 48,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      marginTop: 2,
      marginBottom: 2
    },
    newBtnText: {
      color: colors.onBrand,
      fontSize: fontSize.emphasis,
      fontWeight: "700"
    },
    filterRow: {
      flexDirection: "row",
      gap: 8,
      marginBottom: 4
    },
    filterChip: {
      borderRadius: 999,
      backgroundColor: colors.avatarBg,
      paddingHorizontal: 14,
      paddingVertical: 8
    },
    filterChipActive: {
      backgroundColor: colors.borderStrong
    },
    filterChipText: {
      color: colors.textMuted,
      fontSize: fontSize.secondary,
      fontWeight: fontWeight.semibold,
      textTransform: "uppercase"
    },
    filterChipTextActive: {
      color: colors.textSecondary
    },
    requestCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      borderRadius: 12,
      paddingVertical: 14,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 10
    },
    requestLeftIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.brandSoft,
      alignItems: "center",
      justifyContent: "center"
    },
    requestBody: {
      flex: 1,
      gap: 3
    },
    requestTitle: {
      fontSize: fontSize.title,
      fontWeight: "700",
      color: colors.text
    },
    requestMeta: {
      fontSize: fontSize.secondary,
      color: colors.textMuted
    },
    statusBadge: {
      alignSelf: "flex-start",
      marginTop: 5,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 3
    },
    statusBadgeText: {
      fontSize: fontSize.caption,
      fontWeight: "700"
    },
    helpCard: {
      marginTop: 12,
      borderRadius: 12,
      backgroundColor: colors.readonlyBg,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12
    },
    helpTextWrap: {
      flex: 1,
      gap: 6
    },
    helpTitle: {
      fontSize: fontSize.title,
      fontWeight: "700",
      color: colors.textSecondary
    },
    helpDescription: {
      fontSize: fontSize.secondary,
      lineHeight: 18,
      color: colors.textMuted
    },
    helpIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 12,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center"
    },
    notice: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 8
    },
    emptyTitle: {
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
      color: colors.text
    },
    emptyText: {
      fontSize: fontSize.secondary,
      color: colors.textMuted
    },
    errorText: { color: colors.danger, fontSize: fontSize.secondary },
    retry: {
      alignSelf: "flex-start",
      borderRadius: 8,
      backgroundColor: colors.brand,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    retryText: { color: colors.onBrand, fontWeight: "700", fontSize: fontSize.secondary },

    formScroll: { flex: 1 },
    formContent: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 32
    },
    formTitle: {
      fontSize: fontSize.display,
      fontWeight: "700",
      color: colors.text
    },
    formSubtitle: {
      fontSize: fontSize.secondary,
      color: colors.textMuted,
      marginTop: 2,
      marginBottom: 8
    },
    label: {
      fontSize: fontSize.secondary,
      fontWeight: "600",
      color: colors.textSecondary,
      marginBottom: 6,
      marginTop: 14
    },
    input: {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 10,
      fontSize: fontSize.secondary,
      color: colors.text,
      backgroundColor: colors.inputBg
    },
    multiline: { minHeight: 100 },
    priorityRow: { flexDirection: "row", gap: 8 },
    priorityBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 8,
      paddingVertical: 8,
      alignItems: "center",
      backgroundColor: colors.surface
    },
    priorityBtnActive: {
      borderColor: colors.brand,
      backgroundColor: colors.brandSoft
    },
    priorityBtnText: {
      fontSize: fontSize.caption,
      fontWeight: "600",
      color: colors.textMuted
    },
    priorityBtnTextActive: {
      color: colors.brand
    },
    photoRow: { gap: 10, paddingVertical: 4 },
    photoThumb: { position: "relative", width: 80, height: 80 },
    thumbImage: { width: 80, height: 80, borderRadius: 8, backgroundColor: colors.surfaceMuted },
    removePhoto: {
      position: "absolute",
      top: -6,
      right: -6,
      backgroundColor: colors.danger,
      borderRadius: 10,
      width: 20,
      height: 20,
      alignItems: "center",
      justifyContent: "center"
    },
    removePhotoText: { color: colors.onBrand, fontSize: fontSize.caption, fontWeight: "700" },
    addPhotoBtn: {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderStyle: "dashed",
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: "center",
      marginTop: 4
    },
    addPhotoBtnText: { color: colors.textMuted, fontSize: fontSize.secondary },
    submitError: { color: colors.danger, fontSize: fontSize.secondary, marginTop: 10 },
    submitBtn: {
      borderRadius: 10,
      backgroundColor: colors.brand,
      paddingVertical: 13,
      alignItems: "center",
      marginTop: 20
    },
    submitBtnDisabled: { backgroundColor: colors.brandMuted },
    submitBtnText: { color: colors.onBrand, fontWeight: "700", fontSize: fontSize.body },
    cancelBtn: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      paddingVertical: 12,
      alignItems: "center",
      marginTop: 10
    },
    cancelBtnText: { color: colors.textSecondary, fontWeight: "600", fontSize: fontSize.body }
  });
}
