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
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { CardSkeleton, ListSkeleton } from "@/components/skeleton";
import { NetworkError } from "@/components/network-error";
import type { ApiResult, LeaseWithTenantView } from "@/lib/api-contracts-types";
import { getWithAuth } from "@/lib/api-client";
import { formatAmount, formatLocaleDate } from "@/i18n/format";
import { fontWeight, fontSize, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

type TenantLeaseOutput = {
  lease: LeaseWithTenantView | null;
};

type Styles = ReturnType<typeof createStyles>;

function formatDateNumeric(value: string): string {
  return formatLocaleDate(value, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function formatDateReadable(value: string): string {
  return formatLocaleDate(value, {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

export default function LeaseScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
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
            ? t("common.offline")
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
  }, [t]);

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

  const paymentFrequencyLabel =
    lease?.paymentFrequency === "monthly"
      ? t("account.freqMonthly")
      : lease?.paymentFrequency === "quarterly"
        ? t("account.freqQuarterly")
        : t("account.freqYearly");

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => { router.back(); }} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={colors.brand} />
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
            tintColor={colors.brand}
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
                <Text style={styles.retryButtonText}>{t("common.retry")}</Text>
              </Pressable>
            </View>
          )
        ) : null}

        {!lease ? (
          <View style={styles.emptyCard}>
            <Ionicons name="home-outline" size={36} color={colors.iconMuted} />
            <Text style={styles.emptyTitle}>{t("account.noLeaseTitle")}</Text>
            <Text style={styles.emptyText}>{t("account.noLeaseBody")}</Text>
          </View>
        ) : (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.avatarWrap}>
                <Ionicons name="home-outline" size={22} color={colors.textMuted} />
              </View>
              <View style={styles.summaryCopy}>
                <Text style={styles.tenantName}>{lease.tenantFullName ?? t("common.tenant")}</Text>
                <Text style={styles.tenantSince}>
                  {t("account.tenantSince", { date: formatDateReadable(lease.startDate) })}
                </Text>
                <View style={styles.profileBadges}>
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{t("account.activeContract")}</Text>
                  </View>
                  <View style={styles.idPill}>
                    <Text style={styles.idPillText}>
                      {t("account.leaseNumber", { id: lease.id.slice(0, 8).toUpperCase() })}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t("account.contract")}</Text>
              <DetailRow label={t("account.start")} value={formatDateNumeric(lease.startDate)} styles={styles} />
              <View style={styles.divider} />
              <DetailRow
                label={t("account.end")}
                value={lease.endDate ? formatDateNumeric(lease.endDate) : "-"}
                styles={styles}
              />
              <View style={styles.divider} />
              <DetailRow
                label={t("account.type")}
                value={lease.termType === "fixed" ? t("account.termFixed") : t("account.termMonthToMonth")}
                styles={styles}
              />
            </View>

            <View style={styles.card}>
              <Text style={styles.sectionTitle}>{t("account.rent")}</Text>
              <View style={styles.rentAmountRow}>
                <Text style={styles.rowLabel}>{t("account.monthlyAmount")}</Text>
                <View style={styles.rentRight}>
                  <Text style={styles.rentAmount} numberOfLines={1}>
                    {formatAmount(
                      lease.monthlyRentAmount ?? lease.monthlyRent,
                      lease.currencyCode ?? "USD"
                    )}
                  </Text>
                  <Text style={styles.rentSuffix}>{t("account.perMonth")}</Text>
                </View>
              </View>
              <View style={styles.divider} />
              <DetailRow
                label={t("account.deposit")}
                value={formatAmount(
                  lease.depositAmount ?? lease.securityDeposit ?? 0,
                  lease.currencyCode ?? "USD"
                )}
                styles={styles}
              />
              <View style={styles.divider} />
              <DetailRow
                label={t("account.frequency")}
                value={paymentFrequencyLabel}
                styles={styles}
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({
  label,
  value,
  styles
}: {
  label: string;
  value: string;
  styles: Styles;
}): React.ReactElement {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background
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
      backgroundColor: colors.border
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
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 10
    },
    errorText: { color: colors.danger, fontSize: fontSize.secondary },
    retryButton: {
      alignSelf: "flex-start",
      borderRadius: 8,
      backgroundColor: colors.brand,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    retryButtonText: { color: colors.onBrand, fontWeight: "600", fontSize: fontSize.secondary },
    emptyCard: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 20,
      alignItems: "center",
      gap: 8
    },
    emptyTitle: { fontSize: fontSize.body, fontWeight: fontWeight.semibold, color: colors.textSecondary },
    emptyText: { fontSize: fontSize.secondary, color: colors.textMuted, textAlign: "center", lineHeight: 19 },

    summaryCard: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      flexDirection: "row",
      alignItems: "center",
      gap: 12
    },
    avatarWrap: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.surfaceMuted,
      alignItems: "center",
      justifyContent: "center"
    },
    summaryCopy: {
      flex: 1,
      gap: 2
    },
    tenantName: {
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
      color: colors.text
    },
    tenantSince: {
      fontSize: fontSize.caption,
      color: colors.textFaint
    },
    profileBadges: {
      marginTop: 6,
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 6
    },
    statusPill: {
      backgroundColor: colors.brandSoft,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6
    },
    statusPillText: {
      color: colors.brand,
      fontSize: fontSize.caption,
      fontWeight: "700"
    },
    idPill: {
      backgroundColor: colors.surfaceMuted,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 6
    },
    idPillText: {
      color: colors.textMuted,
      fontSize: fontSize.caption,
      fontWeight: "700"
    },

    card: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 4
    },
    sectionTitle: {
      fontSize: fontSize.secondary,
      fontWeight: fontWeight.semibold,
      color: colors.textFaint,
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
      color: colors.textMuted,
      fontSize: fontSize.secondary
    },
    rowValue: {
      color: colors.text,
      fontSize: fontSize.secondary,
      fontWeight: "700"
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border
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
      fontSize: fontSize.display,
      fontWeight: "700",
      color: colors.brand,
      textAlign: "right"
    },
    rentSuffix: {
      fontSize: fontSize.caption,
      color: colors.textFaint,
      marginTop: 1
    }
  });
}
