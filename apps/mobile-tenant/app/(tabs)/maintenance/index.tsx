import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import type { MaintenancePriority, MaintenanceRequest } from "@hhousing/domain";
import type { ApiResult } from "@hhousing/api-contracts";
import { ListSkeleton } from "@/components/skeleton";
import { getWithAuth, postWithAuth } from "@/lib/api-client";
import { supabase } from "@/lib/supabase";
import { NetworkError } from "@/components/network-error";

type MobileMaintenanceOutput = { requests: MaintenanceRequest[] };
type MobileCreateOutput = { request: MaintenanceRequest };
type ScreenView = "list" | "form";
type RequestFilter = "all" | "active" | "resolved";

const STATUS_LABEL: Record<MaintenanceRequest["status"], string> = {
  open: "Soumis",
  in_progress: "En cours",
  resolved: "Résolu",
  cancelled: "Annulé"
};

const STATUS_BG: Record<MaintenanceRequest["status"], string> = {
  open: "#FEF3C7",
  in_progress: "#DBEAFE",
  resolved: "#DCFCE7",
  cancelled: "#F3F4F6"
};

const STATUS_TEXT: Record<MaintenanceRequest["status"], string> = {
  open: "#D97706",
  in_progress: "#2563EB",
  resolved: "#16A34A",
  cancelled: "#6B7280"
};

const PRIORITY_LABEL: Record<MaintenancePriority, string> = {
  low: "Basse",
  medium: "Moyenne",
  high: "Haute",
  urgent: "Urgente"
};

const PRIORITY_TO_CATEGORY: Record<MaintenancePriority, string> = {
  low: "Entretien",
  medium: "Plomberie",
  high: "Électricité",
  urgent: "Urgence"
};

const PRIORITIES: MaintenancePriority[] = ["low", "medium", "high", "urgent"];

const MONTHS_SHORT = [
  "Janv.", "Févr.", "Mars", "Avr.", "Mai", "Juin",
  "Juil.", "Août", "Sept.", "Oct.", "Nov.", "Déc."
];

function formatShortDate(iso: string): string {
  const date = new Date(iso);
  const day = String(date.getDate()).padStart(2, "0");
  const month = MONTHS_SHORT[date.getMonth()] ?? "";
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function getMaintenanceIcon(priority: MaintenancePriority): React.ComponentProps<typeof Ionicons>["name"] {
  if (priority === "urgent") return "warning-outline";
  if (priority === "high") return "flash-outline";
  if (priority === "medium") return "water-outline";
  return "construct-outline";
}

export default function MaintenanceScreen(): React.ReactElement {
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
      setSubmitError("Maximum 4 photos autorisées.");
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setSubmitError("Accès à la galerie refusé.");
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
      setSubmitError("Impossible d'ouvrir la galerie pour le moment.");
    }
  }, [formPhotos.length]);

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

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!formTitle.trim() || !formDescription.trim()) {
      setSubmitError("Le titre et la description sont requis.");
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
      setSubmitError(result.error);
      return;
    }

    setRequests((prev) => [result.data.request, ...prev]);
    setFormTitle("");
    setFormDescription("");
    setFormPriority("medium");
    setFormPhotos([]);
    setView("list");
  }, [formDescription, formPriority, formTitle, uploadPhotos]);

  if (view === "form") {
    return (
      <SafeAreaView style={styles.root}>
        <ScrollView
          style={styles.formScroll}
          contentContainerStyle={styles.formContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.formTitle}>Nouvelle demande</Text>
          <Text style={styles.formSubtitle}>Décrivez le problème à signaler.</Text>

          <Text style={styles.label}>Titre *</Text>
          <TextInput
            style={styles.input}
            value={formTitle}
            onChangeText={setFormTitle}
            placeholder="Ex: Fuite sous l'évier"
            placeholderTextColor="#9CA3AF"
            maxLength={120}
          />

          <Text style={styles.label}>Description *</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={formDescription}
            onChangeText={setFormDescription}
            placeholder="Décrivez le problème en détail..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={1000}
          />

          <Text style={styles.label}>Priorité</Text>
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
                  {PRIORITY_LABEL[priority]}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Photos (optionnel, max 4)</Text>
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
              <Text style={styles.addPhotoBtnText}>+ Ajouter une photo</Text>
            </Pressable>
          ) : null}

          {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

          <Pressable
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={() => { void handleSubmit(); }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={styles.submitBtnText}>Envoyer la demande</Text>
            )}
          </Pressable>

          <Pressable style={styles.cancelBtn} onPress={() => { setView("list"); }}>
            <Text style={styles.cancelBtnText}>Annuler</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.screenPadding}>
          <ListSkeleton rows={4} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.screenPadding}>
          {isOffline ? (
            <NetworkError onRetry={() => { void loadRequests(); }} />
          ) : (
            <View style={styles.notice}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retry} onPress={() => { void loadRequests(); }}>
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            </View>
          )}
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
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => { void loadRequests(); }} tintColor="#0063FE" />}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Maintenance</Text>
          <Text style={styles.headerSubtitle}>Gérez vos demandes de service et réparations.</Text>
        </View>

        <Pressable style={styles.newBtn} onPress={() => { setView("form"); }}>
          <Ionicons name="add" size={20} color="#ffffff" />
          <Text style={styles.newBtnText}>Nouvelle demande</Text>
        </Pressable>

        <View style={styles.filterRow}>
          <FilterChip
            label="Toutes"
            active={filter === "all"}
            onPress={() => { setFilter("all"); }}
          />
          <FilterChip
            label="En cours"
            active={filter === "active"}
            onPress={() => { setFilter("active"); }}
          />
          <FilterChip
            label="Résolues"
            active={filter === "resolved"}
            onPress={() => { setFilter("resolved"); }}
          />
        </View>

        {filteredRequests.length === 0 ? (
          <View style={styles.notice}>
            <Text style={styles.emptyTitle}>Aucune demande</Text>
            <Text style={styles.emptyText}>Aucune demande ne correspond au filtre sélectionné.</Text>
          </View>
        ) : (
          filteredRequests.map((request) => (
            <Pressable
              key={request.id}
              style={styles.requestCard}
              onPress={() => { router.push(`/(tabs)/maintenance/${request.id}`); }}
            >
              <View style={styles.requestLeftIconWrap}>
                <Ionicons name={getMaintenanceIcon(request.priority)} size={18} color="#0063FE" />
              </View>

              <View style={styles.requestBody}>
                <Text style={styles.requestTitle} numberOfLines={2}>{request.title}</Text>
                <Text style={styles.requestMeta}>
                  {PRIORITY_TO_CATEGORY[request.priority]} • {formatShortDate(request.createdAtIso)}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_BG[request.status] }]}> 
                  <Text style={[styles.statusBadgeText, { color: STATUS_TEXT[request.status] }]}>
                    {STATUS_LABEL[request.status].toUpperCase()}
                  </Text>
                </View>
              </View>

              <Ionicons name="chevron-forward" size={18} color="#C5CCD9" />
            </Pressable>
          ))
        )}

        <View style={styles.helpCard}>
          <View style={styles.helpTextWrap}>
            <Text style={styles.helpTitle}>Urgence ?</Text>
            <Text style={styles.helpDescription}>
              Contactez notre ligne d'assistance disponible 24/7 pour les problèmes critiques.
            </Text>
          </View>
          <View style={styles.helpIconWrap}>
            <Ionicons name="headset-outline" size={22} color="#0063FE" />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterChip({
  label,
  active,
  onPress
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable style={[styles.filterChip, active && styles.filterChipActive]} onPress={onPress}>
      <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F5F6FA"
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
    fontSize: 38,
    fontWeight: "700",
    color: "#010A19"
  },
  headerSubtitle: {
    fontSize: 20,
    color: "#6B7280"
  },
  newBtn: {
    backgroundColor: "#0063FE",
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
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "700"
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4
  },
  filterChip: {
    borderRadius: 999,
    backgroundColor: "#E5EAF5",
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  filterChipActive: {
    backgroundColor: "#CBD7ED"
  },
  filterChipText: {
    color: "#6B7280",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  filterChipTextActive: {
    color: "#4B5563"
  },
  requestCard: {
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#D4DAE7",
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
    backgroundColor: "#E8F1FF",
    alignItems: "center",
    justifyContent: "center"
  },
  requestBody: {
    flex: 1,
    gap: 3
  },
  requestTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#010A19"
  },
  requestMeta: {
    fontSize: 13,
    color: "#6B7280"
  },
  statusBadge: {
    alignSelf: "flex-start",
    marginTop: 5,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700"
  },
  helpCard: {
    marginTop: 12,
    borderRadius: 12,
    backgroundColor: "#ECEEF7",
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
    fontSize: 18,
    fontWeight: "700",
    color: "#4B5563"
  },
  helpDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: "#6B7280"
  },
  helpIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center"
  },
  notice: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D4DAE7",
    backgroundColor: "#ffffff",
    padding: 14,
    gap: 8
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#010A19"
  },
  emptyText: {
    fontSize: 14,
    color: "#6B7280"
  },
  errorText: { color: "#B91C1C", fontSize: 14 },
  retry: {
    alignSelf: "flex-start",
    borderRadius: 8,
    backgroundColor: "#0063FE",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  retryText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },

  formScroll: { flex: 1 },
  formContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32
  },
  formTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "#010A19"
  },
  formSubtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
    marginBottom: 8
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    marginTop: 14
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#010A19",
    backgroundColor: "#ffffff"
  },
  multiline: { minHeight: 100 },
  priorityRow: { flexDirection: "row", gap: 8 },
  priorityBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
    backgroundColor: "#ffffff"
  },
  priorityBtnActive: {
    borderColor: "#0063FE",
    backgroundColor: "#EFF6FF"
  },
  priorityBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280"
  },
  priorityBtnTextActive: {
    color: "#0063FE"
  },
  photoRow: { gap: 10, paddingVertical: 4 },
  photoThumb: { position: "relative", width: 80, height: 80 },
  thumbImage: { width: 80, height: 80, borderRadius: 8, backgroundColor: "#F3F4F6" },
  removePhoto: {
    position: "absolute",
    top: -6,
    right: -6,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  removePhotoText: { color: "#ffffff", fontSize: 10, fontWeight: "700" },
  addPhotoBtn: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 4
  },
  addPhotoBtnText: { color: "#6B7280", fontSize: 14 },
  submitError: { color: "#B91C1C", fontSize: 13, marginTop: 10 },
  submitBtn: {
    borderRadius: 10,
    backgroundColor: "#0063FE",
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 20
  },
  submitBtnDisabled: { backgroundColor: "#93C5FD" },
  submitBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  cancelBtn: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 10
  },
  cancelBtnText: { color: "#374151", fontWeight: "600", fontSize: 15 }
});