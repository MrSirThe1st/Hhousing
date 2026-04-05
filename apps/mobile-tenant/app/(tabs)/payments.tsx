import { useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Payment } from "@hhousing/domain";
import type { ApiResult } from "@hhousing/api-contracts";
import { getWithAuth } from "@/lib/api-client";
import { ScreenShell } from "@/components/screen-shell";

type MobilePaymentsOutput = { payments: Payment[] };

const STATUS_LABEL: Record<Payment["status"], string> = {
  pending: "En attente",
  paid: "Payé",
  overdue: "En retard",
  cancelled: "Annulé"
};

const STATUS_COLOR: Record<Payment["status"], string> = {
  pending: "#D97706",
  paid: "#16A34A",
  overdue: "#DC2626",
  cancelled: "#6B7280"
};

export default function PaymentsScreen(): React.ReactElement {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    const result: ApiResult<MobilePaymentsOutput> = await getWithAuth<MobilePaymentsOutput>(
      "/api/mobile/payments"
    );
    if (!result.success) {
      setError(result.error);
    } else {
      setPayments(result.data.payments);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ScreenShell title="Paiements" subtitle="Historique de vos loyers.">
      {isLoading ? <Text style={styles.info}>Chargement...</Text> : null}

      {!isLoading && error ? (
        <View style={styles.notice}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retry} onPress={() => { void load(); }}>
            <Text style={styles.retryText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !error && payments.length === 0 ? (
        <View style={styles.notice}>
          <Text style={styles.emptyTitle}>Aucun paiement</Text>
          <Text style={styles.emptyText}>Aucune charge de loyer n'a encore été générée.</Text>
        </View>
      ) : null}

      {!isLoading && !error && payments.length > 0 ? (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.list}>
          {payments.map((p) => (
            <PaymentRow key={p.id} payment={p} />
          ))}
        </ScrollView>
      ) : null}
    </ScreenShell>
  );
}

function PaymentRow({ payment }: { payment: Payment }): React.ReactElement {
  const router = useRouter();
  const formatted = new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: payment.currencyCode,
    maximumFractionDigits: 0
  }).format(payment.amount);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.amount}>{formatted}</Text>
        <View style={[styles.badge, { backgroundColor: STATUS_COLOR[payment.status] + "20" }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLOR[payment.status] }]}>
            {STATUS_LABEL[payment.status]}
          </Text>
        </View>
      </View>
      <Text style={styles.meta}>
        Échéance : {payment.dueDate}
        {payment.chargePeriod ? `  •  Période : ${payment.chargePeriod}` : ""}
      </Text>
      {payment.paidDate ? (
        <Text style={styles.paidDate}>Payé le {payment.paidDate}</Text>
      ) : null}
      {payment.status === "paid" ? (
        <Pressable
          style={styles.receiptLink}
          onPress={() => { router.push("/(tabs)/account/documents"); }}
        >
          <Text style={styles.receiptLinkText}>Voir les reçus →</Text>
        </Pressable>
      ) : null}
    </View>
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
  list: { flex: 1 },
  card: {
    borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB",
    backgroundColor: "#ffffff", padding: 14, gap: 6, marginBottom: 10
  },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  amount: { fontSize: 18, fontWeight: "700", color: "#010A19" },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: "600" },
  meta: { fontSize: 13, color: "#6B7280" },
  paidDate: { fontSize: 12, color: "#16A34A" },
  receiptLink: { alignSelf: "flex-start", marginTop: 6 },
  receiptLinkText: { fontSize: 12, color: "#2563EB", fontWeight: "600" }
});
