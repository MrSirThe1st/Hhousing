import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useRouter } from "expo-router";
import type { MaintenanceRequest, MaintenancePriority } from "@hhousing/domain";
import type { ApiResult } from "@hhousing/api-contracts";
import { getWithAuth, postWithAuth } from "@/lib/api-client";
import { ScreenShell } from "@/components/screen-shell";

type MobileMaintenanceOutput = { requests: MaintenanceRequest[] };
type MobileCreateOutput = { request: MaintenanceRequest };
type ScreenView = "list" | "form";

const STATUS_LABEL: Record<MaintenanceRequest["status"], string> = {
  open: "Ouvert",
  in_progress: "En cours",
  resolved: "Résolu",
  cancelled: "Annulé"
};

const STATUS_COLOR: Record<MaintenanceRequest["status"], string> = {
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

const PRIORITIES: MaintenancePriority[] = ["low", "medium", "high", "urgent"];

export default function MaintenanceScreen(): React.ReactElement {
  const router = useRouter();
  const [view, setView] = useState<ScreenView>("list");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);

  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formPriority, setFormPriority] = useState<MaintenancePriority>("medium");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const loadRequests = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    const result: ApiResult<MobileMaintenanceOutput> =
      await getWithAuth<MobileMaintenanceOutput>("/api/mobile/maintenance");
    if (!result.success) {
      setError(result.error);
    } else {
      setRequests(result.data.requests);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!formTitle.trim() || !formDescription.trim()) {
      setSubmitError("Le titre et la description sont requis.");
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);
    const result: ApiResult<MobileCreateOutput> = await postWithAuth<MobileCreateOutput>(
      "/api/mobile/maintenance",
      { title: formTitle.trim(), description: formDescription.trim(), priority: formPriority }
    );
    setIsSubmitting(false);
    if (!result.success) {
      setSubmitError(result.error);
    } else {
      setRequests((prev) => [result.data.request, ...prev]);
      setFormTitle("");
      setFormDescription("");
      setFormPriority("medium");
      setView("list");
    }
  }, [formTitle, formDescription, formPriority]);

  if (view === "form") {
    return (
      <ScreenShell title="Nouvelle demande" subtitle="Décrivez le problème à signaler.">
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
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
            {PRIORITIES.map((p) => (
              <Pressable
                key={p}
                style={[styles.priorityBtn, formPriority === p && styles.priorityBtnActive]}
                onPress={() => { setFormPriority(p); }}
              >
                <Text
                  style={[styles.priorityBtnText, formPriority === p && styles.priorityBtnTextActive]}
                >
                  {PRIORITY_LABEL[p]}
                </Text>
              </Pressable>
            ))}
          </View>

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
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Maintenance" subtitle="Soumettre et suivre vos demandes.">
      {isLoading ? <Text style={styles.info}>Chargement...</Text> : null}

      {!isLoading && error ? (
        <View style={styles.notice}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => { void loadRequests(); }}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !error ? (
        <>
          <Pressable style={styles.newBtn} onPress={() => { setView("form"); }}>
            <Text style={styles.newBtnText}>+ Nouvelle demande</Text>
          </Pressable>

          {requests.length === 0 ? (
            <View style={styles.notice}>
              <Text style={styles.emptyTitle}>Aucune demande</Text>
              <Text style={styles.emptyText}>
                Vous n'avez soumis aucune demande de maintenance.
              </Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
              {requests.map((r) => (
                <MaintenanceCard key={r.id} request={r} router={router} />
              ))}
            </ScrollView>
          )}
        </>
      ) : null}
    </ScreenShell>
  );
}

function MaintenanceCard({
  request,
  router
}: {
  request: MaintenanceRequest;
  router: ReturnType<typeof useRouter>;
}): React.ReactElement {
  return (
    <Pressable onPress={() => { router.push(`/maintenance/${request.id}`); }}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle} numberOfLines={2}>{request.title}</Text>
          <View style={[styles.badge, { backgroundColor: STATUS_COLOR[request.status] + "20" }]}>
            <Text style={[styles.badgeText, { color: STATUS_COLOR[request.status] }]}>
              {STATUS_LABEL[request.status]}
            </Text>
          </View>
        </View>
        <Text style={styles.cardDescription} numberOfLines={2}>{request.description}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.meta}>
            Priorité : {PRIORITY_LABEL[request.priority as MaintenancePriority]}
          </Text>
          <Text style={styles.meta}>
            {new Date(request.createdAtIso).toLocaleDateString("fr-FR")}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  info: { color: "#6B7280", fontSize: 14 },
  notice: {
    borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB",
    backgroundColor: "#ffffff", padding: 14, gap: 10
  },
  errorText: { color: "#B91C1C", fontSize: 14 },
  retry: {
    alignSelf: "flex-start", borderRadius: 8, backgroundColor: "#0063FE",
    paddingHorizontal: 12, paddingVertical: 8
  },
  retryText: { color: "#ffffff", fontWeight: "600", fontSize: 13 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#010A19" },
  emptyText: { fontSize: 14, color: "#4B5563" },
  newBtn: {
    borderRadius: 10, backgroundColor: "#0063FE",
    paddingVertical: 12, alignItems: "center", marginBottom: 14
  },
  newBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  list: { flex: 1 },
  card: {
    borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB",
    backgroundColor: "#ffffff", padding: 14, gap: 6, marginBottom: 10
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: "#010A19" },
  cardDescription: { fontSize: 13, color: "#4B5563" },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 0 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  meta: { fontSize: 12, color: "#6B7280" },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 6, marginTop: 14 },
  input: {
    borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: "#010A19",
    backgroundColor: "#ffffff"
  },
  multiline: { minHeight: 100 },
  priorityRow: { flexDirection: "row", gap: 8 },
  priorityBtn: {
    flex: 1, borderWidth: 1, borderColor: "#D1D5DB", borderRadius: 8,
    paddingVertical: 8, alignItems: "center", backgroundColor: "#ffffff"
  },
  priorityBtnActive: { borderColor: "#0063FE", backgroundColor: "#EFF6FF" },
  priorityBtnText: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  priorityBtnTextActive: { color: "#0063FE" },
  submitError: { color: "#B91C1C", fontSize: 13, marginTop: 10 },
  submitBtn: {
    borderRadius: 10, backgroundColor: "#0063FE",
    paddingVertical: 13, alignItems: "center", marginTop: 20
  },
  submitBtnDisabled: { backgroundColor: "#93C5FD" },
  submitBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 15 },
  cancelBtn: {
    borderRadius: 10, borderWidth: 1, borderColor: "#D1D5DB",
    paddingVertical: 12, alignItems: "center", marginTop: 10, marginBottom: 30
  },
  cancelBtnText: { color: "#374151", fontWeight: "600", fontSize: 15 }
});
