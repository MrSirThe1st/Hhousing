import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Lease, Payment } from "@hhousing/domain";
import type { ApiResult } from "@hhousing/api-contracts";
import { getWithAuth } from "@/lib/api-client";
import { ScreenShell } from "@/components/screen-shell";

type LeaseOutput = { lease: Lease | null };
type PaymentsOutput = { payments: Payment[] };

const PAYMENT_STATUS_LABEL: Record<Payment["status"], string> = {
  pending: "En attente",
  paid: "Payé",
  overdue: "En retard",
  cancelled: "Annulé"
};

const PAYMENT_STATUS_COLOR: Record<Payment["status"], string> = {
  pending: "#D97706",
  paid: "#16A34A",
  overdue: "#DC2626",
  cancelled: "#6B7280"
};

interface DashboardData {
  lease: Lease | null;
  nextPayment: Payment | null;
}

export default function HomeScreen(): React.ReactElement {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<DashboardData>({ lease: null, nextPayment: null });

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const [leaseRes, paymentsRes] = await Promise.all([
        getWithAuth<LeaseOutput>("/api/mobile/lease"),
        getWithAuth<PaymentsOutput>("/api/mobile/payments")
      ]);

      if (!leaseRes.success) {
        setError(leaseRes.error);
        setData({ lease: null, nextPayment: null });
        return;
      }

      if (!paymentsRes.success) {
        setError(paymentsRes.error);
        setData({ lease: null, nextPayment: null });
        return;
      }

      const nextPayment = paymentsRes.data.payments[0] ?? null;
      setData({
        lease: leaseRes.data.lease,
        nextPayment
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return (
      <ScreenShell title="Accueil" subtitle="Bienvenue dans votre espace locataire.">
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0063FE" />
        </View>
      </ScreenShell>
    );
  }

  if (error) {
    return (
      <ScreenShell title="Accueil" subtitle="Bienvenue dans votre espace locataire.">
        <View style={styles.notice}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => { void load(); }}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Accueil" subtitle="Bienvenue dans votre espace locataire.">
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        {/* Quick Actions */}
        <View style={styles.quickActionsRow}>
          <QuickActionButton
            label="Bail"
            icon="📄"
            onPress={() => { router.push("/(tabs)/account/lease"); }}
          />
          <QuickActionButton
            label="Paiements"
            icon="💳"
            onPress={() => { router.push("/(tabs)/payments"); }}
          />
          <QuickActionButton
            label="Maintenance"
            icon="🔧"
            onPress={() => { router.push("/(tabs)/maintenance"); }}
          />
          <QuickActionButton
            label="Profil"
            icon="👤"
            onPress={() => { router.push("/(tabs)/account"); }}
          />
        </View>

        {/* Lease Summary Card */}
        {data.lease ? (
          <View style={[styles.card, styles.leaseCard]}>
            <Text style={styles.leaseTitle}>Votre contrat de location</Text>
            <View style={styles.leaseMeta}>
              <Text style={styles.leaseLabel}>Loyer mensuel</Text>
              <Text style={styles.leaseAmount}>
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: data.lease.currencyCode,
                  maximumFractionDigits: 0
                }).format(data.lease.monthlyRentAmount)}
              </Text>
            </View>
            <Text style={styles.leaseDate}>
              Depuis le {new Date(data.lease.startDate).toLocaleDateString("fr-FR")}
              {data.lease.endDate ? ` jusqu'au ${new Date(data.lease.endDate).toLocaleDateString("fr-FR")}` : ""}
            </Text>
          </View>
        ) : null}

        {/* Next Payment Card */}
        {data.nextPayment ? (
          <Pressable
            style={styles.nextPaymentCard}
            onPress={() => { router.push("/(tabs)/payments"); }}
          >
            <Text style={styles.nextPaymentLabel}>Prochain paiement</Text>
            <View style={styles.nextPaymentHeader}>
              <Text style={styles.nextPaymentAmount}>
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: data.nextPayment.currencyCode,
                  maximumFractionDigits: 0
                }).format(data.nextPayment.amount)}
              </Text>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: PAYMENT_STATUS_COLOR[data.nextPayment.status] + "20" }
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: PAYMENT_STATUS_COLOR[data.nextPayment.status] }
                  ]}
                >
                  {PAYMENT_STATUS_LABEL[data.nextPayment.status]}
                </Text>
              </View>
            </View>
            <Text style={styles.nextPaymentDue}>
              À payer avant le {data.nextPayment.dueDate}
            </Text>
          </Pressable>
        ) : (
          <View style={[styles.card, styles.emptyPaymentCard]}>
            <Text style={styles.emptyPaymentText}>
              Aucun paiement en attente pour le moment.
            </Text>
          </View>
        )}
      </ScrollView>
    </ScreenShell>
  );
}

function QuickActionButton({
  label,
  icon,
  onPress
}: {
  label: string;
  icon: string;
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable style={styles.quickActionButton} onPress={onPress}>
      <Text style={styles.quickActionIcon}>{icon}</Text>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
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
  quickActionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 20
  },
  quickActionButton: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: "#F3F4F6",
    paddingVertical: 12,
    alignItems: "center",
    gap: 6
  },
  quickActionIcon: { fontSize: 24 },
  quickActionLabel: { fontSize: 11, fontWeight: "600", color: "#374151", textAlign: "center" },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#ffffff",
    padding: 14,
    marginBottom: 12
  },
  leaseCard: {
    gap: 8
  },
  leaseTitle: { fontSize: 15, fontWeight: "700", color: "#010A19" },
  leaseMeta: {
    gap: 4
  },
  leaseLabel: { fontSize: 12, color: "#6B7280" },
  leaseAmount: { fontSize: 20, fontWeight: "700", color: "#0063FE" },
  leaseDate: { fontSize: 12, color: "#6B7280", marginTop: 4 },
  nextPaymentCard: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#D97706",
    backgroundColor: "#FFFBEB",
    padding: 14,
    gap: 8,
    marginBottom: 12
  },
  nextPaymentLabel: { fontSize: 12, fontWeight: "600", color: "#92400E" },
  nextPaymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start"
  },
  nextPaymentAmount: { fontSize: 22, fontWeight: "700", color: "#D97706" },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  nextPaymentDue: { fontSize: 13, color: "#92400E" },
  emptyPaymentCard: {
    backgroundColor: "#F9FAFB",
    borderColor: "#D1D5DB",
    alignItems: "center",
    paddingVertical: 20
  },
  emptyPaymentText: { fontSize: 13, color: "#6B7280" }
});
