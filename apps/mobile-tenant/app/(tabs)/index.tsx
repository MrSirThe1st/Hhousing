import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CardSkeleton } from "@/components/skeleton";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { Lease, Payment, Tenant } from "@/lib/domain-types";
import { getWithAuth } from "@/lib/api-client";
import { NetworkError } from "@/components/network-error";
import { MobileMoneyMethodsRow } from "@/components/mobile-money-logos";

type LeaseOutput = {
  lease: Lease | null;
  rentalAddress: string | null;
  propertyName: string | null;
  unitLabel: string | null;
  rentalPhotoUrl: string | null;
};
type PaymentsOutput = { payments: Payment[] };
type ProfileOutput = { tenant: Tenant };

const MONTH_NAMES_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

const MONTH_SHORT_FR = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Août", "Sep", "Oct", "Nov", "Déc"
];

function getMonthFromDate(dateStr: string): string {
  const parts = dateStr.split("-");
  const monthIndex = parseInt(parts[1] ?? "1", 10) - 1;
  return MONTH_NAMES_FR[monthIndex] ?? "";
}

function formatAmount(amount: number, currency: string): string {
  const formatted = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(amount);
  return `${formatted.replace(/\u00A0|\s/g, ".")} ${currency}`;
}

function formatDueDate(dateStr: string): string {
  const parts = dateStr.split("-");
  const day = parts[2] ?? "01";
  const monthIndex = parseInt(parts[1] ?? "1", 10) - 1;
  const year = parts[0] ?? "";
  const month = MONTH_NAMES_FR[monthIndex] ?? "";
  return `${parseInt(day, 10)} ${month} ${year}`;
}

function formatHistoryDate(dateStr: string): string {
  const parts = dateStr.split("-");
  const day = parts[2] ?? "01";
  const monthIndex = parseInt(parts[1] ?? "1", 10) - 1;
  const year = parts[0] ?? "";
  const month = MONTH_SHORT_FR[monthIndex] ?? "";
  return `${String(parseInt(day, 10)).padStart(2, "0")} ${month} ${year}`;
}

function getFirstName(fullName: string): string {
  return fullName.trim().split(" ")[0] ?? fullName;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? "LO").toUpperCase();
}

function paymentTitle(payment: Payment): string {
  if (payment.paymentKind === "deposit") return "Garantie";
  if (payment.paymentKind === "fee") return "Frais";
  if (payment.paymentKind === "prorated_rent") return "Loyer (prorata)";
  const month = getMonthFromDate(payment.dueDate);
  return month ? `Loyer ${month}` : "Loyer";
}

function statusLabel(status: Payment["status"]): string {
  if (status === "paid") return "PAYÉ";
  if (status === "cancelled") return "ANNULÉ";
  return "À PAYER";
}

function statusColor(status: Payment["status"]): string {
  if (status === "paid") return "#9CA3AF";
  if (status === "cancelled") return "#9CA3AF";
  return "#D97706";
}

interface DashboardData {
  tenantName: string;
  lease: Lease | null;
  rentalAddress: string;
  nextPayment: Payment | null;
  recentPayments: Payment[];
}

export default function HomeScreen(): React.ReactElement {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [data, setData] = useState<DashboardData>({
    tenantName: "",
    lease: null,
    rentalAddress: "",
    nextPayment: null,
    recentPayments: []
  });

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setIsOffline(false);

    try {
      const [leaseRes, paymentsRes, profileRes] = await Promise.all([
        getWithAuth<LeaseOutput>("/api/mobile/lease"),
        getWithAuth<PaymentsOutput>("/api/mobile/payments"),
        getWithAuth<ProfileOutput>("/api/mobile/profile")
      ]);

      if (!leaseRes.success) {
        if (leaseRes.code === "NETWORK_ERROR") setIsOffline(true);
        setError(
          leaseRes.code === "NETWORK_ERROR"
            ? "Pas de connexion. Vérifiez votre réseau et réessayez."
            : leaseRes.error
        );
        return;
      }

      if (!paymentsRes.success) {
        if (paymentsRes.code === "NETWORK_ERROR") setIsOffline(true);
        setError(
          paymentsRes.code === "NETWORK_ERROR"
            ? "Pas de connexion. Vérifiez votre réseau et réessayez."
            : paymentsRes.error
        );
        return;
      }

      const allPayments = [...paymentsRes.data.payments].sort((a, b) =>
        b.dueDate.localeCompare(a.dueDate)
      );
      const nextPayment = allPayments.find(
        (p) => p.status === "pending" || p.status === "overdue"
      ) ?? null;

      const tenantName = profileRes.success ? (profileRes.data.tenant.fullName ?? "") : "";
      const unitSuffix = leaseRes.data.unitLabel ? `, ${leaseRes.data.unitLabel}` : "";
      const rentalAddress = leaseRes.data.rentalAddress
        ? `${leaseRes.data.rentalAddress}${unitSuffix}`
        : leaseRes.data.propertyName
          ? `${leaseRes.data.propertyName}${unitSuffix}`
          : "";

      setData({
        tenantName,
        lease: leaseRes.data.lease,
        rentalAddress,
        nextPayment,
        recentPayments: allPayments.slice(0, 3)
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const firstName = getFirstName(data.tenantName);
  const displayName = firstName || data.tenantName || "Locataire";
  const initials = useMemo(
    () => getInitials(data.tenantName || displayName),
    [data.tenantName, displayName]
  );

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.padded}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.padded}>
          {isOffline ? (
            <NetworkError onRetry={() => { void load(); }} />
          ) : (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retryBtn} onPress={() => { void load(); }}>
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => { void load(); }}
            tintColor="#0063FE"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.headerCopy}>
              <Text style={styles.greeting}>Bonjour {displayName}</Text>
              <Text style={styles.address} numberOfLines={1}>
                {data.rentalAddress || "Votre espace locataire"}
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => { router.push("/(tabs)/account"); }}
            hitSlop={10}
            style={styles.gearBtn}
          >
            <Ionicons name="settings-outline" size={22} color="#6B7280" />
          </Pressable>
        </View>
        <View style={styles.headerRule} />

        {/* Rent card / empty states */}
        {data.nextPayment ? (
          <>
            <View style={styles.rentCard}>
              <Text style={styles.rentLabel}>
                LOYER {getMonthFromDate(data.nextPayment.dueDate).toUpperCase()}
              </Text>

              <Text style={styles.rentAmount}>
                {formatAmount(data.nextPayment.amount, data.nextPayment.currencyCode ?? "CDF")}
              </Text>

              <View style={styles.cardRule} />

              <Text style={styles.dueText}>
                À payer le {formatDueDate(data.nextPayment.dueDate)}
              </Text>
            </View>

            <Pressable
              style={styles.payBtn}
              onPress={() => { router.push("/(tabs)/payments?pay=1"); }}
            >
              <Text style={styles.payBtnText}>Payer maintenant</Text>
            </Pressable>

            <View style={styles.trustRow}>
              <Ionicons name="shield-checkmark-outline" size={13} color="#9CA3AF" />
              <Text style={styles.trustText}>Paiement sécurisé</Text>
            </View>
          </>
        ) : data.lease ? (
          <View style={styles.rentCard}>
            <Text style={styles.rentLabel}>LOYER DU MOIS</Text>
            <Text style={styles.rentAmountMuted}>
              {formatAmount(
                data.lease.monthlyRentAmount ?? data.lease.monthlyRent ?? 0,
                data.lease.currencyCode ?? "CDF"
              )}
            </Text>
            <View style={styles.cardRule} />
            <Text style={styles.dueText}>Aucun loyer à payer ce mois.</Text>
          </View>
        ) : (
          <View style={styles.rentCard}>
            <Text style={styles.rentLabel}>BIENVENUE</Text>
            <Text style={styles.emptyHelp}>
              Votre logement n&apos;est pas encore lié. Contactez votre bailleur pour activer votre compte.
            </Text>
          </View>
        )}

        <View style={styles.methodsBlock}>
          <MobileMoneyMethodsRow />
        </View>

        {/* History */}
        <View style={styles.historyBlock}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Derniers paiements</Text>
            <Pressable onPress={() => { router.push("/(tabs)/payments"); }}>
              <Text style={styles.historyLink}>Tout voir</Text>
            </Pressable>
          </View>

          {data.recentPayments.length === 0 ? (
            <View style={styles.historyCard}>
              <Text style={styles.emptyHelp}>Aucun paiement pour le moment.</Text>
            </View>
          ) : (
            data.recentPayments.map((payment) => {
              const paid = payment.status === "paid";
              return (
                <View key={payment.id} style={styles.historyCard}>
                  <View
                    style={[
                      styles.historyIcon,
                      paid ? styles.historyIconPaid : styles.historyIconPending
                    ]}
                  >
                    <Ionicons
                      name={paid ? "checkmark" : "document-text-outline"}
                      size={16}
                      color={paid ? "#9CA3AF" : "#D97706"}
                    />
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyName}>{paymentTitle(payment)}</Text>
                    <Text style={styles.historyDate}>
                      {formatHistoryDate(payment.paidDate ?? payment.dueDate)}
                    </Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyAmount}>
                      {formatAmount(payment.amount, payment.currencyCode ?? "CDF")}
                    </Text>
                    <Text style={[styles.historyStatus, { color: statusColor(payment.status) }]}>
                      {statusLabel(payment.status)}
                    </Text>
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF"
  },
  padded: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16
  },
  scrollContent: {
    paddingBottom: 40
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8EEF7",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#374151"
  },
  headerCopy: {
    flex: 1,
    gap: 2
  },
  greeting: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827"
  },
  address: {
    fontSize: 13,
    color: "#9CA3AF"
  },
  gearBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center"
  },
  headerRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E7EB",
    marginBottom: 14
  },

  rentCard: {
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    gap: 8
  },
  rentLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "#9CA3AF"
  },
  rentAmount: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0063FE",
    letterSpacing: -0.3
  },
  rentAmountMuted: {
    fontSize: 22,
    fontWeight: "700",
    color: "#9CA3AF"
  },
  cardRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E7EB"
  },
  dueText: {
    fontSize: 13,
    color: "#6B7280"
  },

  payBtn: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: "#0063FE",
    borderRadius: 10,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center"
  },
  payBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700"
  },
  trustRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5
  },
  trustText: {
    fontSize: 12,
    color: "#9CA3AF"
  },

  methodsBlock: {
    marginTop: 22,
    paddingHorizontal: 20
  },

  historyBlock: {
    marginTop: 26,
    paddingHorizontal: 20,
    gap: 10
  },
  historyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827"
  },
  historyLink: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0063FE"
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 12
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  historyIconPaid: {
    backgroundColor: "#F3F4F6"
  },
  historyIconPending: {
    backgroundColor: "#FEF3C7"
  },
  historyInfo: {
    flex: 1,
    gap: 2
  },
  historyName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827"
  },
  historyDate: {
    fontSize: 12,
    color: "#9CA3AF"
  },
  historyRight: {
    alignItems: "flex-end",
    gap: 2
  },
  historyAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#111827"
  },
  historyStatus: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3
  },

  emptyHelp: {
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280"
  },
  errorBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
    padding: 16,
    gap: 10
  },
  errorText: { color: "#B91C1C", fontSize: 14 },
  retryBtn: {
    alignSelf: "flex-start",
    borderRadius: 8,
    backgroundColor: "#0063FE",
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  retryText: { color: "#FFFFFF", fontWeight: "600", fontSize: 13 }
});
