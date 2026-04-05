import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { ApiResult, LeaseWithTenantView } from "@hhousing/api-contracts";
import { getWithAuth } from "@/lib/api-client";
import { ScreenShell } from "@/components/screen-shell";

type TenantLeaseOutput = {
  lease: LeaseWithTenantView | null;
};

export default function LeaseScreen(): React.ReactElement {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lease, setLease] = useState<LeaseWithTenantView | null>(null);

  const loadLease = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const result: ApiResult<TenantLeaseOutput> = await getWithAuth<TenantLeaseOutput>(
        "/api/mobile/lease"
      );

      if (!result.success) {
        setError(result.error);
        setLease(null);
        setIsLoading(false);
        return;
      }

      setLease(result.data.lease);
      setIsLoading(false);
    } catch {
      setError("Impossible de charger les informations du bail.");
      setLease(null);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLease();
  }, [loadLease]);

  const formattedAmount =
    lease !== null
      ? new Intl.NumberFormat("fr-FR", {
          style: "currency",
          currency: lease.currencyCode,
          maximumFractionDigits: 0
        }).format(lease.monthlyRentAmount)
      : null;

  return (
    <ScreenShell title="Mon bail" subtitle="Résumé de votre contrat et période active.">
      {isLoading ? <Text>Chargement du bail...</Text> : null}

      {!isLoading && error ? (
        <View style={styles.noticeCard}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable style={styles.retryButton} onPress={() => { void loadLease(); }}>
            <Text style={styles.retryButtonText}>Réessayer</Text>
          </Pressable>
        </View>
      ) : null}

      {!isLoading && !error && lease === null ? (
        <View style={styles.noticeCard}>
          <Text style={styles.emptyTitle}>Aucun bail actif</Text>
          <Text style={styles.emptyText}>
            Votre compte n&apos;est pas encore lié à un bail actif. Contactez votre gestionnaire.
          </Text>
        </View>
      ) : null}

      {!isLoading && !error && lease !== null ? (
        <View style={styles.leaseCard}>
          <LeaseRow label="Locataire" value={lease.tenantFullName} />
          <LeaseRow label="Unité" value={lease.unitId} />
          <LeaseRow label="Loyer mensuel" value={formattedAmount ?? "-"} />
          <LeaseRow label="Début" value={lease.startDate} />
          <LeaseRow label="Fin" value={lease.endDate ?? "En cours"} />
          <LeaseRow label="Statut" value={lease.status} />
        </View>
      ) : null}
    </ScreenShell>
  );
}

function LeaseRow({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  noticeCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#ffffff",
    padding: 14,
    gap: 10
  },
  errorText: { color: "#B91C1C", fontSize: 14 },
  retryButton: {
    alignSelf: "flex-start",
    borderRadius: 8,
    backgroundColor: "#0063FE",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  retryButtonText: { color: "#ffffff", fontWeight: "600", fontSize: 13 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#010A19" },
  emptyText: { fontSize: 14, color: "#4B5563" },
  leaseCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#ffffff",
    padding: 14,
    gap: 12
  },
  row: { gap: 4 },
  rowLabel: { fontSize: 12, color: "#6B7280", textTransform: "uppercase" },
  rowValue: { fontSize: 15, color: "#010A19", fontWeight: "600" }
});
