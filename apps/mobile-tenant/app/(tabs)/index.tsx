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
import { ScreenLoader } from "@/components/universal-loading-state";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { Lease, Payment, Tenant } from "@/lib/domain-types";
import { getWithAuth } from "@/lib/api-client";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { HomeContactsUtiles } from "@/components/home-contacts-utiles";
import { MobileMoneyMethodsRow } from "@/components/mobile-money-logos";
import { SensitiveAmount, maskSensitiveAmount } from "@/components/sensitive-amount";
import { useAmountPrivacy } from "@/contexts/amount-privacy-context";
import { useAuth } from "@/contexts/auth-context";
import {
  formatAmount,
  formatDueDate,
  formatHistoryDate,
  monthNameFromYmd
} from "@/i18n/format";
import { fontWeight, fontSize, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

type LeaseOutput = {
  lease: Lease | null;
  rentalAddress: string | null;
  propertyName: string | null;
  unitLabel: string | null;
  rentalPhotoUrl: string | null;
};
type PaymentsOutput = { payments: Payment[] };
type ProfileOutput = { tenant: Tenant };

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

function paymentTitle(payment: Payment, t: TFunction): string {
  if (payment.paymentKind === "deposit") return t("home.kind.deposit");
  if (payment.paymentKind === "fee") return t("home.kind.fee");
  if (payment.paymentKind === "prorated_rent") return t("home.kind.proratedRent");
  const month = monthNameFromYmd(payment.dueDate);
  return month ? t("home.kind.rentMonth", { month }) : t("home.kind.rent");
}

function statusLabel(status: Payment["status"], t: TFunction): string {
  if (status === "paid") return t("home.status.paid");
  if (status === "cancelled") return t("home.status.cancelled");
  return t("home.status.toPay");
}

function statusColor(status: Payment["status"], colors: ThemeColors): string {
  if (status === "paid") return colors.textFaint;
  if (status === "cancelled") return colors.textFaint;
  return colors.warning;
}

interface DashboardData {
  tenantName: string;
  lease: Lease | null;
  rentalAddress: string;
  nextPayment: Payment | null;
  duePayments: Payment[];
  totalDue: number;
  recentPayments: Payment[];
}

export default function HomeScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { amountsRevealed, amountsSensitive, toggleAmountsRevealed } = useAmountPrivacy();
  const { signOut } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [data, setData] = useState<DashboardData>({
    tenantName: "",
    lease: null,
    rentalAddress: "",
    nextPayment: null,
    duePayments: [],
    totalDue: 0,
    recentPayments: []
  });
  const [contactsRefreshToken, setContactsRefreshToken] = useState(0);

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setErrorCode(null);
    setIsOffline(false);

    try {
      const [leaseRes, paymentsRes, profileRes] = await Promise.all([
        getWithAuth<LeaseOutput>("/api/mobile/lease"),
        getWithAuth<PaymentsOutput>("/api/mobile/payments"),
        getWithAuth<ProfileOutput>("/api/mobile/profile")
      ]);

      if (!leaseRes.success) {
        if (leaseRes.code === "NETWORK_ERROR") setIsOffline(true);
        setErrorCode(leaseRes.code);
        setError(
          leaseRes.code === "NETWORK_ERROR"
            ? t("common.offline")
            : leaseRes.code === "UNAUTHORIZED"
              ? t("common.sessionExpired")
              : leaseRes.error
        );
        return;
      }

      if (!paymentsRes.success) {
        if (paymentsRes.code === "NETWORK_ERROR") setIsOffline(true);
        setErrorCode(paymentsRes.code);
        setError(
          paymentsRes.code === "NETWORK_ERROR"
            ? t("common.offline")
            : paymentsRes.code === "UNAUTHORIZED"
              ? t("common.sessionExpired")
              : paymentsRes.error
        );
        return;
      }

      const allPayments = [...paymentsRes.data.payments].sort((a, b) =>
        b.dueDate.localeCompare(a.dueDate)
      );
      const duePayments = allPayments
        .filter((p) => p.status === "pending" || p.status === "overdue")
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate));
      const nextPayment = duePayments[0] ?? null;
      const totalDue = duePayments.reduce((sum, payment) => sum + payment.amount, 0);

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
        duePayments,
        totalDue,
        // Enough proof on Accueil that Paiements is optional depth, not required survival
        recentPayments: allPayments.slice(0, 5)
      });
      setContactsRefreshToken((token) => token + 1);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (errorCode !== "UNAUTHORIZED") {
      return;
    }
    void signOut();
  }, [errorCode, signOut]);

  const firstName = getFirstName(data.tenantName);
  const displayName = firstName || data.tenantName || t("common.tenant");
  const initials = useMemo(
    () => getInitials(data.tenantName || displayName),
    [data.tenantName, displayName]
  );

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
        <View style={styles.padded}>
          <ErrorState
            offline={isOffline}
            code={errorCode}
            error={error}
            onRetry={() => { void load(); }}
          />
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
            tintColor={colors.brand}
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
              <Text style={styles.greeting}>{t("home.greeting", { name: displayName })}</Text>
              <Text style={styles.address} numberOfLines={1}>
                {data.rentalAddress || t("home.defaultAddress")}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.headerRule} />

        {/* Rent card / empty states */}
        {data.nextPayment ? (
          <>
            <View style={styles.rentCard}>
              <View style={styles.rentCardTop}>
                <Text style={styles.rentLabel}>
                  {data.duePayments.length > 1
                    ? t("home.totalDueLabel")
                    : t("home.rentLabel", {
                        month: monthNameFromYmd(data.nextPayment.dueDate).toUpperCase()
                      })}
                </Text>
                <Text style={[styles.rentStatus, { color: colors.warning }]}>
                  {t("home.status.toPay")}
                </Text>
              </View>

              <SensitiveAmount
                value={formatAmount(
                  data.duePayments.length > 1
                    ? data.totalDue
                    : data.nextPayment.amount,
                  data.nextPayment.currencyCode ?? "CDF"
                )}
                revealed={amountsRevealed}
                onToggle={amountsSensitive ? toggleAmountsRevealed : undefined}
                showToggle={amountsSensitive}
                style={styles.rentAmount}
                eyeColor={colors.brand}
              />

              <View style={styles.cardRule} />

              <Text style={styles.dueText}>
                {data.duePayments.length > 1
                  ? t("home.dueCount", { count: data.duePayments.length })
                  : t("home.dueOn", { date: formatDueDate(data.nextPayment.dueDate) })}
              </Text>
            </View>
          </>
        ) : data.lease ? (
          <View style={styles.rentCard}>
            <View style={styles.rentCardTop}>
              <Text style={styles.rentLabel}>{t("home.rentOfMonth")}</Text>
              <Text style={[styles.rentStatus, { color: colors.success }]}>
                {t("home.status.upToDate")}
              </Text>
            </View>
            <SensitiveAmount
              value={formatAmount(
                data.lease.monthlyRentAmount ?? data.lease.monthlyRent ?? 0,
                data.lease.currencyCode ?? "CDF"
              )}
              revealed={amountsRevealed}
              onToggle={amountsSensitive ? toggleAmountsRevealed : undefined}
              showToggle={amountsSensitive}
              style={styles.rentAmountMuted}
              eyeColor={colors.textFaint}
            />
            <View style={styles.cardRule} />
            <Text style={styles.dueText}>{t("home.noRentDue")}</Text>
          </View>
        ) : (
          <EmptyState
            illustration="house"
            title={t("home.welcome")}
            body={t("home.noLeaseLinked")}
          />
        )}

        <View style={styles.methodsBlock}>
          <MobileMoneyMethodsRow />
        </View>

        {/* Proof / history */}
        <View style={styles.historyBlock}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>{t("home.recentPayments")}</Text>
            <Pressable onPress={() => { router.push("/(tabs)/payments"); }}>
              <Text style={styles.historyLink}>{t("home.seeAll")}</Text>
            </Pressable>
          </View>

          {data.recentPayments.length === 0 ? (
            <EmptyState
              icon="receipt-outline"
              title={t("home.noPaymentsTitle")}
              body={t("home.noPaymentsYet")}
              compact
            />
          ) : (
            data.recentPayments.map((payment) => {
              const paid = payment.status === "paid";
              return (
                <Pressable
                  key={payment.id}
                  style={styles.historyCard}
                  onPress={() => {
                    const unpaid =
                      payment.status === "pending" || payment.status === "overdue";
                    if (unpaid) {
                      router.push("/(tabs)/payments?pay=1");
                      return;
                    }
                    if (payment.status === "paid") {
                      router.push(
                        `/(tabs)/payment-detail?id=${encodeURIComponent(payment.id)}`
                      );
                    }
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={paymentTitle(payment, t)}
                >
                  <View
                    style={[
                      styles.historyIcon,
                      paid ? styles.historyIconPaid : styles.historyIconPending
                    ]}
                  >
                    <Ionicons
                      name={paid ? "checkmark" : "document-text-outline"}
                      size={16}
                      color={paid ? colors.textFaint : colors.warning}
                    />
                  </View>
                  <View style={styles.historyInfo}>
                    <Text style={styles.historyName}>{paymentTitle(payment, t)}</Text>
                    <Text style={styles.historyDate}>
                      {formatHistoryDate(payment.paidDate ?? payment.dueDate)}
                    </Text>
                  </View>
                  <View style={styles.historyRight}>
                    <Text style={styles.historyAmount}>
                      {amountsRevealed
                        ? formatAmount(payment.amount, payment.currencyCode ?? "CDF")
                        : maskSensitiveAmount(
                          formatAmount(payment.amount, payment.currencyCode ?? "CDF")
                        )}
                    </Text>
                    <Text style={[styles.historyStatus, { color: statusColor(payment.status, colors) }]}>
                      {statusLabel(payment.status, t)}
                    </Text>
                  </View>
                </Pressable>
              );
            })
          )}
        </View>

        {/* Help hub — Prestataires */}
        <HomeContactsUtiles refreshToken={contactsRefreshToken} />
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background
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
      backgroundColor: colors.avatarBg,
      alignItems: "center",
      justifyContent: "center"
    },
    avatarText: {
      fontSize: fontSize.body,
      fontWeight: "700",
      color: colors.textSecondary
    },
    headerCopy: {
      flex: 1,
      gap: 2
    },
    greeting: {
      fontSize: fontSize.title,
      fontWeight: fontWeight.semibold,
      color: colors.text
    },
    address: {
      fontSize: fontSize.secondary,
      color: colors.textFaint
    },
    headerRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginBottom: 14
    },

    rentCard: {
      marginHorizontal: 20,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 12,
      gap: 8
    },
    rentCardTop: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8
    },
    rentLabel: {
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.5,
      color: colors.textFaint
    },
    rentStatus: {
      fontSize: fontSize.caption,
      fontWeight: "700",
      letterSpacing: 0.3
    },
    rentAmount: {
      fontSize: fontSize.display,
      fontWeight: "700",
      color: colors.brand,
      letterSpacing: -0.3
    },
    rentAmountMuted: {
      fontSize: fontSize.display,
      fontWeight: "700",
      color: colors.textFaint
    },
    cardRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border
    },
    dueText: {
      fontSize: fontSize.secondary,
      color: colors.textMuted
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
      fontSize: fontSize.body,
      fontWeight: "700",
      color: colors.text
    },
    historyLink: {
      fontSize: fontSize.secondary,
      fontWeight: "600",
      color: colors.brand
    },
    historyCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      backgroundColor: colors.surface,
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
      backgroundColor: colors.surfaceMuted
    },
    historyIconPending: {
      backgroundColor: colors.surfaceMuted
    },
    historyInfo: {
      flex: 1,
      gap: 2
    },
    historyName: {
      fontSize: fontSize.secondary,
      fontWeight: "700",
      color: colors.text
    },
    historyDate: {
      fontSize: fontSize.caption,
      color: colors.textFaint
    },
    historyRight: {
      alignItems: "flex-end",
      gap: 2
    },
    historyAmount: {
      fontSize: fontSize.secondary,
      fontWeight: "700",
      color: colors.text
    },
    historyStatus: {
      fontSize: fontSize.caption,
      fontWeight: "700",
      letterSpacing: 0.3
    },

    emptyHelp: {
      fontSize: fontSize.secondary,
      lineHeight: 20,
      color: colors.textMuted
    },
    errorBox: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 16,
      gap: 10
    },
    errorText: { color: colors.danger, fontSize: fontSize.secondary },
    retryBtn: {
      alignSelf: "flex-start",
      borderRadius: 8,
      backgroundColor: colors.brand,
      paddingHorizontal: 14,
      paddingVertical: 8
    },
    retryText: { color: colors.onBrand, fontWeight: "600", fontSize: fontSize.secondary }
  });
}
