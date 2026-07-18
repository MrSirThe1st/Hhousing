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
import { openWhatsAppMessage } from "@/lib/whatsapp";

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

  async function handleContactManager(): Promise<void> {
    const name = lease?.tenantFullName ?? "locataire";
    await openWhatsAppMessage(
      `Bonjour, je suis ${name}. Je vous contacte au sujet de mon logement.`
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loadingWrap}>
          <CardSkeleton />
          <CardSkeleton />
          <ListSkeleton rows={3} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topBar}>
        <Pressable style={styles.topBarLeft} onPress={() => { router.back(); }}>
          <Ionicons name="arrow-back" size={22} color="#0063FE" />
          <Text style={styles.topBarTitle}>Mon logement</Text>
        </Pressable>
      </View>

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
            <Ionicons name="home-outline" size={40} color="#D1D5DB" />
            <Text style={styles.emptyTitle}>Pas encore de logement</Text>
            <Text style={styles.emptyText}>
              Votre compte n&apos;est pas encore lié. Contactez votre bailleur pour activer votre location.
            </Text>
            <Pressable style={styles.whatsappBtn} onPress={() => { void handleContactManager(); }}>
              <Ionicons name="logo-whatsapp" size={18} color="#ffffff" />
              <Text style={styles.whatsappBtnText}>Contacter mon bailleur</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <View style={styles.profileCard}>
              <View style={styles.avatarWrap}>
                <Ionicons name="home-outline" size={34} color="#6B7280" />
                <View style={styles.verifiedBadge}>
                  <Ionicons name="checkmark-circle-outline" size={14} color="#ffffff" />
                </View>
              </View>

              <Text style={styles.tenantName}>{lease.tenantFullName ?? "Locataire"}</Text>
              <Text style={styles.tenantSince}>Locataire depuis {formatDateReadable(lease.startDate)}</Text>

              <View style={styles.profileBadges}>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>CONTRAT ACTIF</Text>
                </View>
                <View style={styles.idPill}>
                  <Text style={styles.idPillText}>{badgeLeaseId(lease.id)}</Text>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrap}>
                  <Ionicons name="document-text-outline" size={18} color="#0063FE" />
                </View>
                <Text style={styles.sectionTitle}>CONTRAT</Text>
              </View>

              <DetailRow label="Début" value={formatDateNumeric(lease.startDate)} />
              <Divider />
              <DetailRow label="Fin" value={lease.endDate ? formatDateNumeric(lease.endDate) : "-"} />
              <Divider />
              <DetailRow label="Type" value={lease.termType === "fixed" ? "Durée fixe" : "Mois à mois"} />
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionIconWrap}>
                  <Ionicons name="cash-outline" size={18} color="#0063FE" />
                </View>
                <Text style={styles.sectionTitle}>LOYER</Text>
              </View>

              <View style={styles.rentAmountRow}>
                <Text style={styles.rowLabel}>Montant mensuel</Text>
                <View style={styles.rentRight}>
                  <Text
                    style={styles.rentAmount}
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    minimumFontScale={0.72}
                  >
                    {formatAmount(lease.monthlyRentAmount ?? lease.monthlyRent, lease.currencyCode ?? "USD")}
                  </Text>
                  <Text style={styles.rentSuffix}>/ MOIS</Text>
                </View>
              </View>
              <Divider />
              <DetailRow
                label="Garantie"
                value={formatAmount(lease.depositAmount ?? lease.securityDeposit ?? 0, lease.currencyCode ?? "USD")}
              />
              <Divider />
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

            <Pressable style={styles.contactCard} onPress={() => { void handleContactManager(); }}>
              <View style={styles.contactIconWrap}>
                <Ionicons name="logo-whatsapp" size={20} color="#128C7E" />
              </View>
              <View style={styles.contactTextWrap}>
                <Text style={styles.contactTitle}>Parler au bailleur</Text>
                <Text style={styles.contactBody}>Ouvrir WhatsApp</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </Pressable>
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

function Divider(): React.ReactElement {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F5F6FA"
  },
  loadingWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10
  },
  topBar: {
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: "#D4DAE7",
    backgroundColor: "#F5F6FA",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  topBarTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0063FE"
  },
  scroll: { flex: 1 },
  content: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 24,
    gap: 12
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
  retryButton: {
    alignSelf: "flex-start",
    borderRadius: 8,
    backgroundColor: "#0063FE",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  retryButtonText: { color: "#ffffff", fontWeight: "600", fontSize: 13 },
  emptyCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#D4DAE7",
    backgroundColor: "#ffffff",
    padding: 24,
    alignItems: "center",
    gap: 8
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#374151" },
  emptyText: { fontSize: 14, color: "#6B7280", textAlign: "center", lineHeight: 20 },
  whatsappBtn: {
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: "#128C7E",
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  whatsappBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14
  },

  profileCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C5CCD9",
    backgroundColor: "#ffffff",
    padding: 16,
    alignItems: "center",
    gap: 4
  },
  avatarWrap: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    marginBottom: 4
  },
  verifiedBadge: {
    position: "absolute",
    right: 0,
    bottom: 2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#0063FE",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ffffff"
  },
  tenantName: {
    fontSize: 23,
    fontWeight: "700",
    color: "#010A19"
  },
  tenantSince: {
    fontSize: 14,
    color: "#6B7280"
  },
  profileBadges: {
    marginTop: 6,
    flexDirection: "row",
    gap: 8
  },
  statusPill: {
    backgroundColor: "#DBEAFE",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999
  },
  statusPillText: {
    color: "#2563EB",
    fontSize: 10,
    fontWeight: "700"
  },
  idPill: {
    backgroundColor: "#E5E7EB",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999
  },
  idPillText: {
    color: "#6B7280",
    fontSize: 10,
    fontWeight: "700"
  },

  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C5CCD9",
    backgroundColor: "#ffffff",
    padding: 16
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14
  },
  sectionIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E8F1FF",
    alignItems: "center",
    justifyContent: "center"
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#010A19"
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10
  },
  rowLabel: {
    color: "#6B7280",
    fontSize: 16
  },
  rowValue: {
    color: "#010A19",
    fontSize: 16,
    fontWeight: "700"
  },
  divider: {
    height: 1,
    backgroundColor: "#E5E7EB"
  },

  rentAmountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10
  },
  rentRight: {
    alignItems: "flex-end",
    flexShrink: 1,
    maxWidth: "62%"
  },
  rentAmount: {
    fontSize: 28,
    fontWeight: "700",
    color: "#0063FE",
    textAlign: "right"
  },
  rentSuffix: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: -2
  },

  contactCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C5CCD9",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  contactIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E7F6F3",
    alignItems: "center",
    justifyContent: "center"
  },
  contactTextWrap: {
    flex: 1,
    gap: 2
  },
  contactTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#010A19"
  },
  contactBody: {
    fontSize: 13,
    color: "#6B7280"
  }
});
