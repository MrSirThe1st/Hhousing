import { useCallback, useEffect, useState } from "react";
import {
  Image,
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

type LeaseOutput = {
  lease: Lease | null;
  rentalAddress: string | null;
  propertyName: string | null;
  unitLabel: string | null;
  rentalPhotoUrl: string | null;
};
type PaymentsOutput = { payments: Payment[] };
type ProfileOutput = { tenant: Tenant };

const PAYMENT_STATUS_LABEL: Record<Payment["status"], string> = {
  pending: "En attente",
  paid: "Payé",
  overdue: "En retard",
  cancelled: "Annulé"
};

const PAYMENT_STATUS_BG: Record<Payment["status"], string> = {
  pending: "#FEF3C7",
  paid: "#DCFCE7",
  overdue: "#FEE2E2",
  cancelled: "#F3F4F6"
};

const PAYMENT_STATUS_TEXT: Record<Payment["status"], string> = {
  pending: "#D97706",
  paid: "#16A34A",
  overdue: "#DC2626",
  cancelled: "#6B7280"
};

const PAYMENT_KIND_LABEL: Record<Payment["paymentKind"], string> = {
  rent: "Loyer Mensuel",
  deposit: "Caution",
  prorated_rent: "Loyer Proratisé",
  fee: "Frais",
  other: "Autre"
};

const MONTH_NAMES_FR = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
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

function getFirstName(fullName: string): string {
  return fullName.trim().split(" ")[0] ?? fullName;
}

interface DashboardData {
  tenantName: string;
  lease: Lease | null;
  rentalAddress: string;
  rentalPhotoUrl: string;
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
    rentalPhotoUrl: "",
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
        setError(leaseRes.error);
        return;
      }

      if (!paymentsRes.success) {
        if (paymentsRes.code === "NETWORK_ERROR") setIsOffline(true);
        setError(paymentsRes.error);
        return;
      }

      const allPayments = paymentsRes.data.payments;
      const nextPayment = allPayments.find(
        (p) => p.status === "pending" || p.status === "overdue"
      ) ?? null;
      const recentPayments = allPayments
        .filter((p) => p.status === "paid")
        .slice(0, 3);

      const tenantName = profileRes.success ? profileRes.data.tenant.fullName : "";
      const unitSuffix = leaseRes.data.unitLabel ? `, Unité ${leaseRes.data.unitLabel}` : "";
      const rentalAddress = leaseRes.data.rentalAddress
        ? `${leaseRes.data.rentalAddress}${unitSuffix}`
        : leaseRes.data.propertyName
          ? `${leaseRes.data.propertyName}${unitSuffix}`
          : "";

      setData({
        tenantName,
        lease: leaseRes.data.lease,
        rentalAddress,
        rentalPhotoUrl: leaseRes.data.rentalPhotoUrl ?? "",
        nextPayment,
        recentPayments
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
      <SafeAreaView style={styles.root}>
        <View style={styles.content}>
          <CardSkeleton />
          <CardSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.content}>
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

  const firstName = getFirstName(data.tenantName);
  const displayTenantName = data.tenantName || firstName || "Locataire";

  return (
    <SafeAreaView style={styles.root}>
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
          <Text style={styles.greeting}>Bonjour</Text>
          <Text style={styles.tenantName}>{displayTenantName}</Text>
          {data.rentalAddress ? (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={15} color="#6B7280" />
              <Text style={styles.addressText}>{data.rentalAddress}</Text>
            </View>
          ) : null}

          {data.rentalPhotoUrl ? (
            <View style={styles.rentalPhotoWrap}>
              <Image
                source={{ uri: data.rentalPhotoUrl }}
                style={styles.rentalPhoto}
                resizeMode="cover"
              />
              <View style={styles.rentalPhotoBadge}>
                <Ionicons name="home-outline" size={12} color="#ffffff" />
                <Text style={styles.rentalPhotoBadgeText}>Votre logement</Text>
              </View>
            </View>
          ) : null}
        </View>

        {/* Next Payment Card */}
        {data.nextPayment ? (
          <View style={styles.rentCard}>
            <View style={styles.rentCardTop}>
              <Text style={styles.rentCardTitle}>
                Loyer de {getMonthFromDate(data.nextPayment.dueDate)}
              </Text>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: PAYMENT_STATUS_BG[data.nextPayment.status] }
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: PAYMENT_STATUS_TEXT[data.nextPayment.status] }
                  ]}
                >
                  {PAYMENT_STATUS_LABEL[data.nextPayment.status]}
                </Text>
              </View>
            </View>

            <Text style={styles.rentAmount}>
              {formatAmount(data.nextPayment.amount, data.nextPayment.currencyCode)}
            </Text>

            <View style={styles.dueDateRow}>
              <Ionicons name="information-circle-outline" size={16} color="#6B7280" />
              <Text style={styles.dueDateText}>
                Échéance le {formatDueDate(data.nextPayment.dueDate)}
              </Text>
            </View>

            <Pressable
              style={styles.payNowBtn}
              onPress={() => { router.push("/(tabs)/payments"); }}
            >
              <Text style={styles.payNowText}>Voir les paiements</Text>
            </Pressable>
          </View>
        ) : data.lease ? (
          <View style={styles.rentCard}>
            <Text style={styles.rentCardTitle}>Votre bail est actif</Text>
            <Text style={styles.rentAmount}>
              {formatAmount(data.lease.monthlyRentAmount, data.lease.currencyCode)}
            </Text>
            <View style={styles.dueDateRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#16A34A" />
              <Text style={[styles.dueDateText, { color: "#16A34A" }]}>
                Aucun paiement en attente
              </Text>
            </View>
          </View>
        ) : null}

        {/* Quick Actions 2×2 grid */}
        <View style={styles.quickGrid}>
          <QuickActionTile
            label="Maintenance"
            icon="construct-outline"
            onPress={() => { router.push("/(tabs)/maintenance"); }}
          />
          <QuickActionTile
            label="Documents"
            icon="document-text-outline"
            onPress={() => { router.push("/(tabs)/account"); }}
          />
          <QuickActionTile
            label="Mon bail"
            icon="reader-outline"
            onPress={() => { router.push("/(tabs)/account/lease"); }}
          />
          <QuickActionTile
            label="Messages"
            icon="chatbubble-ellipses-outline"
            onPress={() => { router.push("/(tabs)/messages"); }}
          />
        </View>

        {/* Recent Payments */}
        {data.recentPayments.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Paiements récents</Text>
              <Pressable onPress={() => { router.push("/(tabs)/payments"); }}>
                <Text style={styles.sectionLink}>Tout voir</Text>
              </Pressable>
            </View>
            {data.recentPayments.map((payment) => (
              <View key={payment.id} style={styles.paymentRow}>
                <View style={styles.paymentIcon}>
                  <Ionicons name="receipt-outline" size={18} color="#0063FE" />
                </View>
                <View style={styles.paymentInfo}>
                  <Text style={styles.paymentDate}>
                    {formatDueDate(payment.paidDate ?? payment.dueDate)}
                  </Text>
                  <Text style={styles.paymentKind}>
                    {PAYMENT_KIND_LABEL[payment.paymentKind]}
                  </Text>
                </View>
                <View style={styles.paymentRight}>
                  <Text style={styles.paymentAmount}>
                    {formatAmount(payment.amount, payment.currencyCode)}
                  </Text>
                  <View
                    style={[
                      styles.statusBadge,
                      { backgroundColor: PAYMENT_STATUS_BG[payment.status] }
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: PAYMENT_STATUS_TEXT[payment.status] }
                      ]}
                    >
                      {PAYMENT_STATUS_LABEL[payment.status].toUpperCase()}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function QuickActionTile({
  label,
  icon,
  onPress
}: {
  label: string;
  icon: IoniconName;
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable style={styles.quickTile} onPress={onPress}>
      <View style={styles.quickTileIconWrap}>
        <Ionicons name={icon} size={22} color="#0063FE" />
      </View>
      <Text style={styles.quickTileLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F5F6FA"
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 16
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 16
  },

  // Header
  header: {
    gap: 4,
    marginBottom: 4
  },
  greeting: {
    fontSize: 18,
    fontWeight: "700",
    color: "#010A19"
  },
  tenantName: {
    fontSize: 30,
    fontWeight: "700",
    color: "#010A19"
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2
  },
  addressText: {
    fontSize: 14,
    color: "#6B7280"
  },
  rentalPhotoWrap: {
    marginTop: 8,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#D4DAE7",
    position: "relative"
  },
  rentalPhoto: {
    width: "100%",
    height: 120,
    backgroundColor: "#E5E7EB"
  },
  rentalPhotoBadge: {
    position: "absolute",
    left: 8,
    bottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(1,10,25,0.72)"
  },
  rentalPhotoBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700"
  },

  // Rent card
  rentCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3
  },
  rentCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  rentCardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#010A19"
  },
  statusBadge: {
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600"
  },
  rentAmount: {
    fontSize: 30,
    fontWeight: "700",
    color: "#0063FE",
    letterSpacing: -0.5
  },
  dueDateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5F6FA",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8
  },
  dueDateText: {
    fontSize: 13,
    color: "#6B7280"
  },
  payNowBtn: {
    backgroundColor: "#0063FE",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4
  },
  payNowText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff"
  },

  // Quick actions 2x2
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12
  },
  quickTile: {
    width: "47%",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 16,
    alignItems: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2
  },
  quickTileIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center"
  },
  quickTileLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#010A19",
    textAlign: "center"
  },

  // Recent payments
  section: {
    gap: 0
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#010A19"
  },
  sectionLink: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0063FE"
  },
  paymentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F2F6"
  },
  paymentIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center"
  },
  paymentInfo: {
    flex: 1,
    gap: 2
  },
  paymentDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#010A19"
  },
  paymentKind: {
    fontSize: 12,
    color: "#6B7280"
  },
  paymentRight: {
    alignItems: "flex-end",
    gap: 4
  },
  paymentAmount: {
    fontSize: 14,
    fontWeight: "600",
    color: "#010A19"
  },

  // Error
  errorBox: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#ffffff",
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
  retryText: { color: "#ffffff", fontWeight: "600", fontSize: 13 }
});
