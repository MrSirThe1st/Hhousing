import { useCallback, useEffect, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { CardSkeleton, ListSkeleton } from "@/components/skeleton";
import { NetworkError } from "@/components/network-error";
import type { ApiResult, LeaseWithTenantView } from "@/lib/api-contracts-types";
import { getWithAuth } from "@/lib/api-client";

type TenantLeaseOutput = {
  lease: LeaseWithTenantView | null;
};

function formatDateNumeric(value: string): string {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function formatDateReadable(value: string): string {
  return new Date(value).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

function formatAmount(amount: number, currencyCode: string): string {
  const formatted = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount);
  return `${formatted.replace(/\u00A0|\s/g, ".")} ${currencyCode}`;
}

function badgeLeaseId(leaseId: string): string {
  return `N° ${leaseId.slice(0, 8).toUpperCase()}`;
}

export default function LeaseScreen(): React.ReactElement {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [lease, setLease] = useState<LeaseWithTenantView | null>(null);

  const load = useCallback(async (refresh = false): Promise<void> => {
    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);
    setIsOffline(false);

    try {
      const leaseResult: ApiResult<TenantLeaseOutput> = await getWithAuth<TenantLeaseOutput>(
        "/api/mobile/lease"
      );

      if (!leaseResult.success) {
        if (leaseResult.code === "NETWORK_ERROR") setIsOffline(true);
        setLease(null);
        setError(
          leaseResult.code === "NETWORK_ERROR"
            ? "Pas de connexion. Vérifiez votre réseau et réessayez."
            : leaseResult.error
        );
      } else {
        setLease(leaseResult.data.lease);
      }
    } finally {
      if (refresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.loadingWrap}>
          <CardSkeleton />
          <CardSkeleton />
          <ListSkeleton rows={3} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => { router.back(); }} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color="#0063FE" />
        </Pressable>
      </View>
      <View style={styles.headerRule} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { void load(true); }}
            tintColor="#0063FE"
          />
        }
      >
        {error ? (
          isOffline ? (
            <NetworkError onRetry={() => { void load(); }} />
          ) : (
            <View style={styles.notice}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryButton} onPress={() => { void load(); }}>
                <Text style={styles.retryButtonText}>Réessayer</Text>
              </Pressable>
            </View>
          )
        ) : null}

        {!lease ? (
          <View style={styles.emptyCard}>
            <Ionicons name="home-outline" size={36} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Pas encore de logement</Text>
            <Text style={styles.emptyText}>
              Votre compte n&apos;est pas encore lié. Contactez votre bailleur pour activer votre location.
            </Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.avatarWrap}>
                <Ionicons name="home-outline" size={22} color="#6B7280" />
              </View>
              <View style={styles.summaryCopy}>
                <Text style={styles.tenantName}>{lease.tenantFullName ?? "Locataire"}</Text>
                <Text style={styles.tenantSince}>
                  Locataire depuis {formatDateReadable(lease.startDate)}
                </Text>
                <View style={styles.profileBadges}>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>Contrat actif</Text>
                  </View>
                  <View style={styles.idPill}>
                    <Text style={styles.idPillText}>{badgeLeaseId(lease.id)}</Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Contrat</Text>
              <DetailRow label="Début" value={formatDateNumeric(lease.startDate)} />
              <View style={styles.divider} />
              <DetailRow label="Fin" value={lease.endDate ? formatDateNumeric(lease.endDate) : "-"} />
              <View style={styles.divider} />
              <DetailRow
                label="Type"
                value={lease.termType === "fixed" ? "Durée fixe" : "Mois à mois"}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>Loyer</Text>
              <View style={styles.rentAmountRow}>
                <Text style={styles.rowLabel}>Montant mensuel</Text>
                <View style={styles.rentRight}>
                  <Text style={styles.rentAmount} numberOfLines={1}>
                    {formatAmount(
                      lease.monthlyRentAmount ?? lease.monthlyRent,
                      lease.currencyCode ?? "USD"
                    )}
                  </Text>
                  <Text style={styles.rentSuffix}>/ mois</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <DetailRow
                label="Garantie"
                value={formatAmount(
                  lease.depositAmount ?? lease.securityDeposit ?? 0,
                  lease.currencyCode ?? "USD"
                )}
              />
              <View style={styles.divider} />
              <DetailRow
                label="Fréquence"
                value={
                  lease.paymentFrequency === "monthly"
                    ? "Chaque mois"
                    : lease.paymentFrequency === "quarterly"
                      ? "Tous les 3 mois"
                      : "Chaque année"
                }
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF"
  },
  loadingWrap: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 10
  },
  topBar: {
    minHeight: 44,
    paddingHorizontal: 12,
    justifyContent: "center"
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  headerRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E7EB"
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 32,
    gap: 12
  },
  notice: {
    borderRadius: 10,
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
  emptyCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#ffffff",
    padding: 20,
    alignItems: "center",
    gap: 8
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: "#374151" },
  emptyText: { fontSize: 13, color: "#6B7280", textAlign: "center", lineHeight: 19 },

  summaryCard: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#ffffff",
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  avatarWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center"
  },
  summaryCopy: {
    flex: 1,
    gap: 2
  },
  tenantName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827"
  },
  tenantSince: {
    fontSize: 12,
    color: "#9CA3AF"
  },
  profileBadges: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  statusPill: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  statusPillText: {
    color: "#0063FE",
    fontSize: 10,
    fontWeight: "700"
  },
  idPill: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6
  },
  idPillText: {
    color: "#6B7280",
    fontSize: 10,
    fontWeight: "700"
  },

  card: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 4
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9CA3AF",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 4
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11
  },
  rowLabel: {
    color: "#6B7280",
    fontSize: 14
  },
  rowValue: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "700"
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E7EB"
  },

  rentAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 11
  },
  rentRight: {
    alignItems: "flex-end",
    flexShrink: 1,
    maxWidth: "58%"
  },
  rentAmount: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0063FE",
    textAlign: "right"
  },
  rentSuffix: {
    fontSize: 11,
    color: "#9CA3AF",
    marginTop: 1
  }
});
