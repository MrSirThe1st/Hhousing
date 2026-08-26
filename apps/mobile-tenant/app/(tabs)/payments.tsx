import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { Payment } from "@/lib/domain-types";
import type { ApiResult } from "@/lib/api-client";
import { ScreenLoader } from "@/components/universal-loading-state";
import { EmptyState } from "@/components/empty-state";
import { ErrorState } from "@/components/error-state";
import { SensitiveAmount, maskSensitiveAmount } from "@/components/sensitive-amount";
import { useAmountPrivacy } from "@/contexts/amount-privacy-context";
import { getWithAuth, postWithAuth } from "@/lib/api-client";
import { userFacingErrorMessage } from "@/lib/user-facing-error";
import {
  MobileMoneyLogo,
  MOBILE_MONEY_PROVIDERS,
  type MobileMoneyProviderCode
} from "@/components/mobile-money-logos";
import {
  formatAmount,
  formatNumericDate,
  monthGroupLabel,
  monthNameFromYmd
} from "@/i18n/format";
import { fontWeight, fontSize, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";
import { env } from "@/lib/env";

type MobilePaymentsOutput = { payments: Payment[] };

type PayBalanceOutput = {
  transactionId: string;
  totalAmount: number;
  currencyCode: string;
  provider: string;
  status: "submitted" | "failed";
  paymentCount: number;
  pawapayStatus: string;
};

type PayBalanceStatusOutput = {
  transactionId: string;
  status: "pending" | "submitted" | "completed" | "failed";
  pawapayStatus: string | null;
  totalAmount: number;
  currencyCode: string;
  provider: string;
  failureCode: string | null;
  failureMessage: string | null;
  paymentCount: number;
  completedAtIso: string | null;
};

type ProfileOutput = { tenant: { phone: string | null } };

type PaymentFilter = "all" | "pending" | "paid";

type MonthGroup = {
  monthKey: string;
  monthLabel: string;
  items: Payment[];
};

function statusBadgeLabel(status: Payment["status"], t: TFunction): string {
  if (status === "paid") return t("payments.status.paid");
  if (status === "cancelled") return t("payments.status.cancelled");
  return t("payments.status.toPay");
}

function getStatusBadgeBg(colors: ThemeColors): Record<Payment["status"], string> {
  return {
    pending: colors.surfaceMuted,
    paid: colors.brandSoft,
    overdue: colors.surfaceMuted,
    cancelled: colors.surfaceMuted
  };
}

function getStatusBadgeText(colors: ThemeColors): Record<Payment["status"], string> {
  return {
    pending: colors.warning,
    paid: colors.brand,
    overdue: colors.warning,
    cancelled: colors.textMuted
  };
}

function parseYmd(value: string): { year: number; month: number; day: number } {
  const [yearRaw, monthRaw, dayRaw] = value.split("-");
  return {
    year: parseInt(yearRaw ?? "0", 10),
    month: parseInt(monthRaw ?? "1", 10),
    day: parseInt(dayRaw ?? "1", 10)
  };
}

function paymentTitle(payment: Payment, t: TFunction): string {
  if (payment.paymentKind === "rent") {
    const { year } = parseYmd(payment.dueDate);
    const month = monthNameFromYmd(payment.dueDate);
    const monthLabel = month ? month.charAt(0).toUpperCase() + month.slice(1) : month;
    return t("payments.kind.rent", {
      month: monthLabel,
      year
    });
  }
  if (payment.paymentKind === "deposit") return t("payments.kind.deposit");
  if (payment.paymentKind === "prorated_rent") return t("payments.kind.proratedRent");
  if (payment.paymentKind === "fee") return t("payments.kind.fee");
  return t("payments.kind.payment");
}

function paymentMeta(payment: Payment, t: TFunction): string {
  if (payment.status === "paid") {
    const paid = formatNumericDate(payment.paidDate ?? payment.dueDate);
    const { year } = parseYmd(payment.dueDate);
    const month = monthNameFromYmd(payment.dueDate);
    const period =
      payment.paymentKind === "rent" && month
        ? t("payments.periodRent", {
            month: month.charAt(0).toUpperCase() + month.slice(1),
            year
          })
        : null;
    if (period) {
      return t("payments.metaPaidWithPeriod", { period, date: paid });
    }
    return t("payments.metaPaid", { date: paid });
  }
  const date = formatNumericDate(payment.dueDate);
  if (payment.status === "overdue") return t("payments.metaPending", { date });
  if (payment.status === "pending") return t("payments.metaPending", { date });
  return t("payments.metaCancelled", { date });
}

function sortPaymentsDesc(left: Payment, right: Payment): number {
  const leftKey = dateForGrouping(left);
  const rightKey = dateForGrouping(right);
  if (leftKey > rightKey) return -1;
  if (leftKey < rightKey) return 1;
  if (left.dueDate > right.dueDate) return -1;
  if (left.dueDate < right.dueDate) return 1;
  return 0;
}

/** Group history by when money moved (paidDate); unpaid stays on dueDate. */
function dateForGrouping(payment: Payment): string {
  if (payment.status === "paid" && payment.paidDate) {
    return payment.paidDate.slice(0, 10);
  }
  return payment.dueDate.slice(0, 10);
}

function getMonthGroups(payments: Payment[]): MonthGroup[] {
  const sorted = [...payments].sort(sortPaymentsDesc);
  const map = new Map<string, Payment[]>();

  for (const payment of sorted) {
    const { year, month } = parseYmd(dateForGrouping(payment));
    const monthKey = `${year}-${String(month).padStart(2, "0")}`;
    if (!map.has(monthKey)) {
      map.set(monthKey, []);
    }
    map.get(monthKey)?.push(payment);
  }

  return [...map.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([monthKey, items]) => {
      const year = Number(monthKey.slice(0, 4));
      const monthValue = Number(monthKey.slice(5, 7));
      return {
        monthKey,
        monthLabel: monthGroupLabel(year, monthValue),
        items
      };
    });
}

export default function PaymentsScreen(): React.ReactElement {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ pay?: string }>();
  const { colors } = useTheme();
  const { amountsRevealed, amountsSensitive, toggleAmountsRevealed } = useAmountPrivacy();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const statusBadgeBg = useMemo(() => getStatusBadgeBg(colors), [colors]);
  const statusBadgeText = useMemo(() => getStatusBadgeText(colors), [colors]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [isPayModalVisible, setIsPayModalVisible] = useState(false);
  const [isConfirmPopupVisible, setIsConfirmPopupVisible] = useState(false);
  const [payStep, setPayStep] = useState<"form" | "processing">("form");
  const [selectedProvider, setSelectedProvider] = useState<MobileMoneyProviderCode>("AIRTEL_COD");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [payError, setPayError] = useState<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingPayAmountRef = useRef<{ amount: number; currencyCode: string }>({
    amount: 0,
    currencyCode: "CDF"
  });

  const load = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    setIsOffline(false);

    const result: ApiResult<MobilePaymentsOutput> = await getWithAuth<MobilePaymentsOutput>(
      "/api/mobile/payments"
    );

    if (!result.success) {
      if (result.code === "NETWORK_ERROR") {
        setIsOffline(true);
      }
      setError(
        result.code === "NETWORK_ERROR"
          ? t("common.offline")
          : result.error
      );
    } else {
      setPayments(result.data.payments);
    }

    setIsLoading(false);
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
      }
    };
  }, []);

  const duePayments = useMemo(
    () =>
      payments
        .filter((payment) => payment.status === "pending" || payment.status === "overdue")
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [payments]
  );

  const totalDue = useMemo(
    () => duePayments.reduce((sum, payment) => sum + payment.amount, 0),
    [duePayments]
  );

  const currencyCode = duePayments[0]?.currencyCode ?? "CDF";

  const stopPolling = useCallback((): void => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  }, []);

  const closePayModal = useCallback((): void => {
    stopPolling();
    setIsPayModalVisible(false);
    setIsConfirmPopupVisible(false);
    setPayStep("form");
    setPayError(null);
  }, [stopPolling]);

  const goToFailure = useCallback((message: string): void => {
    stopPolling();
    setIsPayModalVisible(false);
    setIsConfirmPopupVisible(false);
    setPayStep("form");
    setPayError(null);
    const providerLabel =
      MOBILE_MONEY_PROVIDERS.find((item) => item.code === selectedProvider)?.label
      ?? selectedProvider;
    router.push({
      pathname: "/(tabs)/payment-failed",
      params: {
        amount: String(pendingPayAmountRef.current.amount),
        currencyCode: pendingPayAmountRef.current.currencyCode,
        provider: providerLabel,
        providerCode: selectedProvider,
        phone: phoneNumber.trim(),
        error: message
      }
    });
  }, [phoneNumber, router, selectedProvider, stopPolling]);

  const pollTransactionStatus = useCallback((transactionId: string): void => {
    stopPolling();
    setPayStep("processing");

    const checkOnce = async (): Promise<void> => {
      const result: ApiResult<PayBalanceStatusOutput> = await getWithAuth<PayBalanceStatusOutput>(
        `/api/mobile/payments/pay-balance/${transactionId}/status`
      );

      if (!result.success) {
        return;
      }

      if (result.data.status === "completed") {
        stopPolling();
        setIsPayModalVisible(false);
        setPayStep("form");
        const providerLabel =
          MOBILE_MONEY_PROVIDERS.find((item) => item.code === result.data.provider)?.label
          ?? result.data.provider;
        const paidAmount = result.data.totalAmount || pendingPayAmountRef.current.amount;
        const paidCurrency = result.data.currencyCode || pendingPayAmountRef.current.currencyCode;
        router.push({
          pathname: "/(tabs)/payment-success",
          params: {
            amount: String(paidAmount),
            currencyCode: paidCurrency,
            provider: providerLabel,
            providerCode: result.data.provider,
            phone: phoneNumber.trim(),
            transactionId: result.data.transactionId,
            paidAt: result.data.completedAtIso ?? new Date().toISOString()
          }
        });
        await load();
        return;
      }

      if (result.data.status === "failed") {
        goToFailure(result.data.failureMessage ?? t("payments.failed"));
      }
    };

    void checkOnce();
    pollTimerRef.current = setInterval(() => {
      void checkOnce();
    }, 3000);
  }, [goToFailure, load, phoneNumber, router, stopPolling, t]);

  const openPayModal = useCallback(async (): Promise<void> => {
    setPayError(null);
    setPayStep("form");
    setIsConfirmPopupVisible(false);
    pendingPayAmountRef.current = { amount: totalDue, currencyCode };
    setIsPayModalVisible(true);

    const profileResult: ApiResult<ProfileOutput> = await getWithAuth<ProfileOutput>("/api/mobile/profile");
    if (profileResult.success && profileResult.data.tenant.phone) {
      setPhoneNumber(profileResult.data.tenant.phone);
    }
  }, [currencyCode, totalDue]);

  useEffect(() => {
    // Live pay auto-open from Accueil / unpaid row (?pay=1).
    if (!env.mobilePaymentsEnabled) return;
    if (params.pay !== "1") return;
    if (isLoading || totalDue <= 0) return;

    void openPayModal();
    router.setParams({ pay: undefined });
  }, [isLoading, openPayModal, params.pay, router, totalDue]);

  const handleContinueToConfirm = useCallback((): void => {
    if (!phoneNumber.trim()) {
      setPayError(t("payments.phoneRequired"));
      return;
    }
    setPayError(null);
    setIsConfirmPopupVisible(true);
  }, [phoneNumber, t]);

  const handlePayBalance = useCallback(async (): Promise<void> => {
    if (!phoneNumber.trim()) {
      setPayError(t("payments.phoneRequired"));
      setIsConfirmPopupVisible(false);
      setPayStep("form");
      return;
    }

    setPayError(null);
    setIsConfirmPopupVisible(false);
    setPayStep("processing");

    const result: ApiResult<PayBalanceOutput> = await postWithAuth<PayBalanceOutput>(
      "/api/mobile/payments/pay-balance",
      {
        provider: selectedProvider,
        phoneNumber: phoneNumber.trim()
      }
    );

    if (!result.success) {
      goToFailure(userFacingErrorMessage({ code: result.code, error: result.error, t }));
      return;
    }

    pollTransactionStatus(result.data.transactionId);
  }, [goToFailure, phoneNumber, pollTransactionStatus, selectedProvider, t]);

  const filteredPayments = useMemo(() => {
    const normalized = search.trim().toLowerCase();

    return payments.filter((payment) => {
      if (filter === "pending" && payment.status !== "pending" && payment.status !== "overdue") {
        return false;
      }
      if (filter === "paid" && payment.status !== "paid") {
        return false;
      }

      if (!normalized) {
        return true;
      }

      const haystack = [
        payment.dueDate,
        paymentTitle(payment, t),
        paymentMeta(payment, t),
        statusBadgeLabel(payment.status, t)
      ].join(" ").toLowerCase();

      return haystack.includes(normalized);
    });
  }, [filter, i18n.language, payments, search, t]);

  const groups = useMemo(
    () => getMonthGroups(filteredPayments),
    [filteredPayments, i18n.language]
  );

  const cycleFilter = useCallback((): void => {
    if (filter === "all") {
      setFilter("pending");
      return;
    }
    if (filter === "pending") {
      setFilter("paid");
      return;
    }
    setFilter("all");
  }, [filter]);

  const filterHint =
    filter === "pending"
      ? t("payments.filterPending")
      : filter === "paid"
        ? t("payments.filterPaid")
        : t("payments.filterAll");

  if (isLoading) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <ScreenLoader />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <View style={styles.content}>
          <ErrorState
            offline={isOffline}
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
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={() => { void load(); }}
            tintColor={colors.brand}
          />
        }
      >
        {totalDue > 0 ? (
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>{t("payments.totalDue")}</Text>
            <SensitiveAmount
              value={formatAmount(totalDue, currencyCode)}
              revealed={amountsRevealed}
              onToggle={amountsSensitive ? toggleAmountsRevealed : undefined}
              showToggle={amountsSensitive}
              style={styles.balanceAmount}
              eyeColor={colors.textMuted}
            />
            {/* Live in-app pay CTA — gated until PawaPay production is ready.
                Re-enable with EXPO_PUBLIC_MOBILE_PAYMENTS_ENABLED=true */}
            {env.mobilePaymentsEnabled ? (
              <Pressable style={styles.payCta} onPress={() => { void openPayModal(); }}>
                <Ionicons name="phone-portrait-outline" size={18} color={colors.onBrand} />
                <Text style={styles.payCtaText}>{t("payments.payNow")}</Text>
              </Pressable>
            ) : (
              <View style={styles.payComingSoonBox}>
                <Ionicons name="time-outline" size={16} color={colors.textMuted} />
                <Text style={styles.payComingSoonText}>{t("payments.payComingSoon")}</Text>
              </View>
            )}
            {/*
            <Pressable style={styles.payCta} onPress={() => { void openPayModal(); }}>
              <Ionicons name="phone-portrait-outline" size={18} color={colors.onBrand} />
              <Text style={styles.payCtaText}>{t("payments.payNow")}</Text>
            </Pressable>
            */}
          </View>
        ) : null}

        <View style={styles.searchRow}>
          <View style={styles.searchInputWrap}>
            <Ionicons name="search-outline" size={18} color={colors.iconMuted} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder={t("payments.searchPlaceholder")}
              placeholderTextColor={colors.textFaint}
              style={styles.searchInput}
            />
          </View>
          <Pressable
            style={[styles.filterBtn, filter !== "all" && styles.filterBtnActive]}
            onPress={cycleFilter}
          >
            <Ionicons
              name="options-outline"
              size={18}
              color={filter === "all" ? colors.textMuted : colors.brand}
            />
          </Pressable>
        </View>

        {filter !== "all" ? (
          <Text style={styles.filterHint}>{t("payments.filterHint", { filter: filterHint })}</Text>
        ) : null}

        {payments.length === 0 ? (
          <EmptyState
            illustration="house"
            title={t("payments.emptyTitle")}
            body={t("payments.emptyText")}
          />
        ) : groups.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title={t("payments.noResultsTitle")}
            body={t("payments.noResultsText")}
            compact
          />
        ) : (
          groups.map((group) => (
            <View key={group.monthKey} style={styles.monthBlock}>
              <Text style={styles.monthTitle}>{group.monthLabel}</Text>

              {group.items.map((payment) => {
                const paid = payment.status === "paid";

                return (
                  <Pressable
                    key={payment.id}
                    style={styles.paymentCard}
                    onPress={() => {
                      const unpaid =
                        payment.status === "pending" || payment.status === "overdue";
                      if (unpaid) {
                        if (env.mobilePaymentsEnabled && totalDue > 0) {
                          void openPayModal();
                        }
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
                        styles.paymentIcon,
                        paid ? styles.paymentIconPaid : styles.paymentIconPending
                      ]}
                    >
                      <Ionicons
                        name={paid ? "checkmark-circle" : "time-outline"}
                        size={18}
                        color={paid ? colors.brand : colors.warning}
                      />
                    </View>

                    <View style={styles.paymentInfo}>
                      <Text style={styles.paymentTitle} numberOfLines={1}>
                        {paymentTitle(payment, t)}
                      </Text>
                      <Text style={styles.paymentMeta} numberOfLines={1}>
                        {paymentMeta(payment, t)}
                      </Text>
                    </View>

                    <View style={styles.paymentRight}>
                      <Text style={styles.paymentAmount}>
                        {amountsRevealed
                          ? formatAmount(payment.amount, payment.currencyCode ?? "CDF")
                          : maskSensitiveAmount(
                            formatAmount(payment.amount, payment.currencyCode ?? "CDF")
                          )}
                      </Text>
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: statusBadgeBg[payment.status] }
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            { color: statusBadgeText[payment.status] }
                          ]}
                        >
                          {statusBadgeLabel(payment.status, t)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      {/* Live Mobile Money pay modal — gated until PawaPay production is ready. */}
      {env.mobilePaymentsEnabled ? (
      <>
      <Modal
        visible={isPayModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => {
          if (payStep !== "processing") {
            closePayModal();
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {payStep === "processing"
                ? t("payments.processingTitle")
                : t("payments.modalTitle")}
            </Text>
            <Text style={styles.modalSubtitle}>
              {formatAmount(totalDue, currencyCode)}
            </Text>

            <View style={styles.selectedProviderHero}>
              <View style={styles.selectedProviderLogoSlot}>
                <MobileMoneyLogo code={selectedProvider} height={56} />
              </View>
              <Text style={styles.selectedProviderName}>
                {MOBILE_MONEY_PROVIDERS.find((item) => item.code === selectedProvider)?.label}
              </Text>
            </View>

            {payStep === "form" ? (
              <>
                <Text style={styles.fieldLabel}>{t("payments.operator")}</Text>
                <View style={styles.providerRow}>
                  {MOBILE_MONEY_PROVIDERS.map((option) => {
                    const active = selectedProvider === option.code;
                    return (
                      <Pressable
                        key={option.code}
                        style={[styles.providerChip, active && styles.providerChipActive]}
                        onPress={() => { setSelectedProvider(option.code); }}
                      >
                        <View style={styles.providerChipLogoSlot}>
                          <MobileMoneyLogo code={option.code} height={30} />
                        </View>
                      </Pressable>
                    );
                  })}
                </View>

                <Text style={styles.fieldLabel}>{t("payments.phoneLabel")}</Text>
                <TextInput
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  placeholder="243973456789"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="phone-pad"
                  style={styles.phoneInput}
                />

                {payError ? <Text style={styles.payErrorText}>{payError}</Text> : null}

                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelBtn} onPress={closePayModal}>
                    <Text style={styles.cancelBtnText}>{t("common.cancel")}</Text>
                  </Pressable>
                  <Pressable style={styles.confirmBtn} onPress={handleContinueToConfirm}>
                    <Text style={styles.confirmBtnText}>{t("payments.continueAction")}</Text>
                  </Pressable>
                </View>
              </>
            ) : null}

            {payStep === "processing" ? (
              <>
                <Text style={styles.processingText}>{t("payments.processingHint")}</Text>
                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelBtn} onPress={closePayModal}>
                    <Text style={styles.cancelBtnText}>{t("common.cancel")}</Text>
                  </Pressable>
                  <View style={[styles.confirmBtn, styles.confirmBtnDisabled]}>
                    <Text style={styles.confirmBtnText}>{t("common.inProgress")}</Text>
                  </View>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      <Modal
        visible={isConfirmPopupVisible}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setIsConfirmPopupVisible(false);
        }}
      >
        <View style={styles.confirmPopupBackdrop}>
          <View style={styles.confirmPopupCard}>
            <Text style={styles.confirmPopupTitle}>{t("payments.confirmTitle")}</Text>
            <Text style={styles.confirmPopupAmount}>
              {formatAmount(totalDue, currencyCode)}
            </Text>

            <View style={styles.selectedProviderHero}>
              <View style={styles.selectedProviderLogoSlot}>
                <MobileMoneyLogo code={selectedProvider} height={48} />
              </View>
              <Text style={styles.selectedProviderName}>
                {MOBILE_MONEY_PROVIDERS.find((item) => item.code === selectedProvider)?.label}
              </Text>
            </View>

            <View style={styles.confirmSummary}>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{t("payments.success.method")}</Text>
                <Text style={styles.confirmValue}>
                  {MOBILE_MONEY_PROVIDERS.find((item) => item.code === selectedProvider)?.label}
                </Text>
              </View>
              <View style={styles.confirmRow}>
                <Text style={styles.confirmLabel}>{t("payments.success.phone")}</Text>
                <Text style={styles.confirmValue}>{phoneNumber.trim()}</Text>
              </View>
            </View>

            <Text style={styles.confirmHint}>{t("payments.confirmHint")}</Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => {
                  setIsConfirmPopupVisible(false);
                }}
              >
                <Text style={styles.cancelBtnText}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable
                style={styles.confirmBtn}
                onPress={() => { void handlePayBalance(); }}
              >
                <Text style={styles.confirmBtnText}>{t("payments.confirmAction")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      </>
      ) : null}
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 16
    },
    scroll: { flex: 1 },
    scrollContent: {
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 36,
      gap: 12
    },
    balanceCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceMuted,
      padding: 16,
      gap: 10
    },
    balanceLabel: {
      fontSize: fontSize.caption,
      fontWeight: "700",
      color: colors.textMuted,
      letterSpacing: 0.4
    },
    balanceAmount: {
      fontSize: fontSize.display,
      fontWeight: "700",
      color: colors.text
    },
    payCta: {
      marginTop: 4,
      borderRadius: 10,
      backgroundColor: colors.brand,
      paddingVertical: 12,
      paddingHorizontal: 14,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    },
    payCtaText: {
      color: colors.onBrand,
      fontSize: fontSize.body,
      fontWeight: "700"
    },
    payComingSoonBox: {
      marginTop: 4,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingVertical: 12,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10
    },
    payComingSoonText: {
      flex: 1,
      fontSize: fontSize.secondary,
      lineHeight: 20,
      color: colors.textMuted
    },
    searchRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8
    },
    searchInputWrap: {
      flex: 1,
      height: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingHorizontal: 12
    },
    searchInput: {
      flex: 1,
      fontSize: fontSize.body,
      color: colors.text,
      paddingVertical: 0
    },
    filterBtn: {
      width: 44,
      height: 44,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.surface
    },
    filterBtnActive: {
      borderColor: colors.brandMuted,
      backgroundColor: colors.brandSoft
    },
    filterHint: {
      fontSize: fontSize.caption,
      color: colors.textMuted,
      fontWeight: "600",
      marginTop: -4
    },
    monthBlock: {
      gap: 8
    },
    monthTitle: {
      fontSize: fontSize.caption,
      letterSpacing: 0.8,
      fontWeight: "700",
      color: colors.textFaint,
      marginTop: 6
    },
    paymentCard: {
      backgroundColor: colors.surface,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      paddingHorizontal: 12,
      paddingVertical: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 12
    },
    paymentIcon: {
      width: 36,
      height: 36,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center"
    },
    paymentIconPaid: {
      backgroundColor: colors.brandSoft
    },
    paymentIconPending: {
      backgroundColor: colors.surfaceMuted
    },
    paymentInfo: {
      flex: 1,
      gap: 2
    },
    paymentTitle: {
      fontSize: fontSize.secondary,
      fontWeight: "700",
      color: colors.text
    },
    paymentMeta: {
      fontSize: fontSize.caption,
      color: colors.textFaint
    },
    paymentRight: {
      alignItems: "flex-end",
      gap: 4
    },
    paymentAmount: {
      fontSize: fontSize.secondary,
      fontWeight: "700",
      color: colors.text
    },
    badge: {
      borderRadius: 6,
      paddingHorizontal: 8,
      paddingVertical: 3
    },
    badgeText: {
      fontSize: fontSize.caption,
      fontWeight: "700",
      letterSpacing: 0.2
    },
    notice: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 8,
      marginTop: 8
    },
    emptyTitle: {
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
      color: colors.text
    },
    emptyText: {
      fontSize: fontSize.secondary,
      color: colors.textMuted,
      lineHeight: 20
    },
    errorText: {
      color: colors.danger,
      fontSize: fontSize.secondary
    },
    retry: {
      alignSelf: "flex-start",
      borderRadius: 8,
      backgroundColor: colors.brand,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    retryText: {
      color: colors.onBrand,
      fontWeight: "700",
      fontSize: fontSize.secondary
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "flex-end"
    },
    confirmPopupBackdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      paddingHorizontal: 24
    },
    confirmPopupCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 20,
      gap: 14,
      borderWidth: 1,
      borderColor: colors.border
    },
    confirmPopupTitle: {
      fontSize: fontSize.title,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center"
    },
    confirmPopupAmount: {
      fontSize: fontSize.display,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      marginTop: -4
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      paddingHorizontal: 20,
      paddingTop: 10,
      paddingBottom: 28,
      gap: 14
    },
    modalHandle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 999,
      backgroundColor: colors.border,
      marginBottom: 4
    },
    modalTitle: {
      fontSize: fontSize.title,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center"
    },
    modalSubtitle: {
      fontSize: fontSize.display,
      color: colors.text,
      fontWeight: "700",
      textAlign: "center",
      marginTop: -4
    },
    selectedProviderHero: {
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 16,
      borderRadius: 16,
      backgroundColor: colors.surfaceMuted,
      borderWidth: 1,
      borderColor: colors.border
    },
    selectedProviderLogoSlot: {
      height: 56,
      width: "100%",
      alignItems: "center",
      justifyContent: "center"
    },
    selectedProviderName: {
      fontSize: fontSize.body,
      fontWeight: "700",
      color: colors.text
    },
    fieldLabel: {
      fontSize: fontSize.secondary,
      fontWeight: fontWeight.semibold,
      color: colors.textSecondary
    },
    providerRow: {
      flexDirection: "row",
      gap: 10
    },
    providerChip: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 14,
      paddingHorizontal: 8,
      paddingVertical: 10,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 64
    },
    providerChipLogoSlot: {
      height: 30,
      width: "100%",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden"
    },
    providerChipActive: {
      borderColor: colors.brand,
      backgroundColor: colors.brandSoft
    },
    providerChipText: {
      color: colors.textSecondary,
      fontSize: fontSize.caption,
      fontWeight: "600"
    },
    providerChipTextActive: {
      color: colors.brand
    },
    phoneInput: {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontSize: fontSize.body,
      color: colors.text,
      backgroundColor: colors.inputBg
    },
    confirmSummary: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      paddingHorizontal: 14,
      paddingVertical: 12,
      gap: 10
    },
    confirmRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 12
    },
    confirmLabel: {
      fontSize: fontSize.secondary,
      color: colors.textMuted,
      fontWeight: "600"
    },
    confirmValue: {
      flexShrink: 1,
      fontSize: fontSize.secondary,
      color: colors.text,
      fontWeight: "700",
      textAlign: "right"
    },
    confirmHint: {
      fontSize: fontSize.secondary,
      lineHeight: 20,
      color: colors.textMuted,
      textAlign: "center"
    },
    processingText: {
      fontSize: fontSize.secondary,
      lineHeight: 22,
      color: colors.textSecondary,
      textAlign: "center",
      paddingHorizontal: 8
    },
    statusNotice: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.brandMuted,
      backgroundColor: colors.brandSoft,
      padding: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8
    },
    statusNoticeText: {
      flex: 1,
      color: colors.brand,
      fontSize: fontSize.secondary,
      fontWeight: "600"
    },
    payErrorText: {
      color: colors.danger,
      fontSize: fontSize.secondary,
      fontWeight: "600"
    },
    modalActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 4
    },
    cancelBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center"
    },
    cancelBtnText: {
      color: colors.textSecondary,
      fontWeight: "700"
    },
    confirmBtn: {
      flex: 1,
      backgroundColor: colors.brand,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: "center"
    },
    confirmBtnDisabled: {
      opacity: 0.7
    },
    confirmBtnText: {
      color: colors.onBrand,
      fontWeight: "700"
    }
  });
}
