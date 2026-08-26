import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import type { Payment } from "@/lib/domain-types";
import { ScreenLoader } from "@/components/universal-loading-state";
import { ErrorState } from "@/components/error-state";
import {
  MobileMoneyLogo,
  MOBILE_MONEY_PROVIDERS,
  type MobileMoneyProviderCode
} from "@/components/mobile-money-logos";
import { getWithAuth } from "@/lib/api-client";
import {
  formatAmount,
  formatLocaleDateTime,
  formatNumericDate,
  monthNameFromYmd
} from "@/i18n/format";
import { fontSize, fontWeight, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  currencyCode: string;
  period: string | null;
};

type MobileMoneySummary = {
  provider: string;
  phoneNumber: string;
  transactionId: string;
  completedAtIso: string | null;
};

type PaymentDetailOutput = {
  payment: Payment;
  invoice: InvoiceSummary | null;
  mobileMoney: MobileMoneySummary | null;
};

function isProviderCode(value: string | undefined | null): value is MobileMoneyProviderCode {
  return value === "AIRTEL_COD" || value === "ORANGE_COD" || value === "VODACOM_MPESA_COD";
}

function providerLabel(code: string | null | undefined): string {
  if (!isProviderCode(code)) {
    return "Mobile Money";
  }
  return MOBILE_MONEY_PROVIDERS.find((item) => item.code === code)?.label ?? "Mobile Money";
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
    return t("payments.kind.rent", { month: monthLabel, year });
  }
  if (payment.paymentKind === "deposit") return t("payments.kind.deposit");
  if (payment.paymentKind === "prorated_rent") return t("payments.kind.proratedRent");
  if (payment.paymentKind === "fee") return t("payments.kind.fee");
  return t("payments.kind.payment");
}

function statusBadgeLabel(status: Payment["status"], t: TFunction): string {
  if (status === "paid") return t("payments.status.paid");
  if (status === "cancelled") return t("payments.status.cancelled");
  return t("payments.status.toPay");
}

export default function PaymentDetailScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [loading, setLoading] = useState(true);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [detail, setDetail] = useState<PaymentDetailOutput | null>(null);
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    if (!id) {
      setErrorCode("NOT_FOUND");
      setErrorMessage(t("errors.notFoundBody"));
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorCode(null);
    setErrorMessage(null);

    // Prefer detail query on the existing list route (works once API is updated).
    const detailByQuery = await getWithAuth<PaymentDetailOutput | { payments: Payment[] }>(
      `/api/mobile/payments?id=${encodeURIComponent(id)}`
    );

    if (detailByQuery.success) {
      if ("payment" in detailByQuery.data && detailByQuery.data.payment) {
        setDetail(detailByQuery.data as PaymentDetailOutput);
        setLoading(false);
        return;
      }

      if ("payments" in detailByQuery.data) {
        const payment = detailByQuery.data.payments.find((item) => item.id === id);
        if (payment) {
          setDetail({ payment, invoice: null, mobileMoney: null });
          setLoading(false);
          return;
        }
        setDetail(null);
        setErrorCode("NOT_FOUND");
        setErrorMessage(t("errors.notFoundBody"));
        setLoading(false);
        return;
      }
    }

    // Legacy path + final list fallback when detail routes are not deployed yet.
    const detailById = await getWithAuth<PaymentDetailOutput>(
      `/api/mobile/payments/${encodeURIComponent(id)}`
    );
    if (detailById.success) {
      setDetail(detailById.data);
      setLoading(false);
      return;
    }

    const listResult = await getWithAuth<{ payments: Payment[] }>("/api/mobile/payments");
    if (!listResult.success) {
      setDetail(null);
      setErrorCode(listResult.code);
      setErrorMessage(listResult.error);
      setLoading(false);
      return;
    }

    const payment = listResult.data.payments.find((item) => item.id === id);
    if (!payment) {
      setDetail(null);
      setErrorCode("NOT_FOUND");
      setErrorMessage(t("errors.notFoundBody"));
      setLoading(false);
      return;
    }

    setDetail({ payment, invoice: null, mobileMoney: null });
    setLoading(false);
  }, [id, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const payment = detail?.payment ?? null;
  const invoice = detail?.invoice ?? null;
  const mobileMoney = detail?.mobileMoney ?? null;
  const paid = payment?.status === "paid";
  const amountLabel = payment
    ? formatAmount(payment.amount, payment.currencyCode ?? "CDF")
    : "";
  const title = payment ? paymentTitle(payment, t) : "";
  const paidAtLabel = payment?.paidDate
    ? formatLocaleDateTime(payment.paidDate, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "";
  const dueLabel = payment ? formatNumericDate(payment.dueDate) : "";
  const methodCode = isProviderCode(mobileMoney?.provider) ? mobileMoney.provider : null;
  const methodLabel = providerLabel(mobileMoney?.provider);
  const canShareInvoice = Boolean(payment && paid);

  async function handleShareInvoice(): Promise<void> {
    if (!payment || !canShareInvoice) {
      return;
    }

    setSharing(true);
    try {
      const message = [
        t("payments.success.receiptTitle"),
        "",
        t("payments.detail.receiptTitleLine", { title }),
        t("payments.success.receiptAmount", { amount: amountLabel }),
        invoice
          ? t("payments.detail.receiptInvoice", { number: invoice.invoiceNumber })
          : null,
        mobileMoney
          ? t("payments.success.receiptMethod", { provider: methodLabel })
          : null,
        mobileMoney?.phoneNumber
          ? t("payments.success.receiptPhone", { phone: mobileMoney.phoneNumber })
          : null,
        paidAtLabel
          ? t("payments.success.receiptDate", { date: paidAtLabel })
          : null,
        mobileMoney?.transactionId
          ? t("payments.success.receiptRef", { ref: mobileMoney.transactionId })
          : null,
        "",
        t("payments.success.receiptFooter")
      ]
        .filter(Boolean)
        .join("\n");

      await Share.share({
        title: t("payments.success.receiptTitle"),
        message
      });
    } finally {
      setSharing(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <ScreenLoader />
      </SafeAreaView>
    );
  }

  if (errorCode || !payment) {
    return (
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable
            style={styles.backBtn}
            onPress={() => {
              router.back();
            }}
            accessibilityRole="button"
            accessibilityLabel={t("payments.detail.back")}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{t("payments.detail.title")}</Text>
          <View style={styles.headerSpacer} />
        </View>
        <ErrorState
          code={errorCode}
          error={errorMessage}
          onRetry={() => {
            void load();
          }}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          style={styles.backBtn}
          onPress={() => {
            router.back();
          }}
          accessibilityRole="button"
          accessibilityLabel={t("payments.detail.back")}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{t("payments.detail.title")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>{title}</Text>
          <Text style={styles.heroAmount}>{amountLabel}</Text>
          <View
            style={[
              styles.badge,
              {
                backgroundColor: paid ? colors.brandSoft : colors.surfaceMuted
              }
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                { color: paid ? colors.brand : colors.warning }
              ]}
            >
              {statusBadgeLabel(payment.status, t)}
            </Text>
          </View>
        </View>

        <View style={styles.card}>
          {methodCode ? (
            <View style={styles.logoSlot}>
              <MobileMoneyLogo code={methodCode} height={56} />
            </View>
          ) : null}

          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t("payments.detail.dueDate")}</Text>
            <Text style={styles.rowValue}>{dueLabel}</Text>
          </View>

          {paidAtLabel ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t("payments.detail.paidDate")}</Text>
              <Text style={styles.rowValue}>{paidAtLabel}</Text>
            </View>
          ) : null}

          {invoice ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t("payments.detail.invoiceNumber")}</Text>
              <Text style={styles.rowValue}>{invoice.invoiceNumber}</Text>
            </View>
          ) : null}

          {mobileMoney ? (
            <>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t("payments.success.method")}</Text>
                <Text style={styles.rowValue}>{methodLabel}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t("payments.success.phone")}</Text>
                <Text style={styles.rowValue}>{mobileMoney.phoneNumber}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.rowLabel}>{t("payments.success.reference")}</Text>
                <Text style={styles.rowValue} numberOfLines={1}>
                  {mobileMoney.transactionId.slice(0, 8).toUpperCase()}
                </Text>
              </View>
            </>
          ) : null}
        </View>
      </ScrollView>

      {canShareInvoice ? (
        <View style={styles.actions}>
          <Pressable
            style={[styles.primaryBtn, sharing && styles.btnDisabled]}
            disabled={sharing}
            onPress={() => {
              void handleShareInvoice();
            }}
          >
            <Ionicons name="download-outline" size={18} color={colors.onBrand} />
            <Text style={styles.primaryBtnText}>{t("payments.detail.download")}</Text>
          </Pressable>
          <Pressable
            style={[styles.secondaryBtn, sharing && styles.btnDisabled]}
            disabled={sharing}
            onPress={() => {
              void handleShareInvoice();
            }}
          >
            <Ionicons name="share-outline" size={18} color={colors.text} />
            <Text style={styles.secondaryBtnText}>{t("payments.detail.share")}</Text>
          </Pressable>
        </View>
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
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 12,
      paddingVertical: 8,
      gap: 4
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center"
    },
    headerTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: fontSize.body,
      fontWeight: "700",
      color: colors.text
    },
    headerSpacer: {
      width: 40
    },
    content: {
      paddingHorizontal: 24,
      paddingBottom: 24,
      gap: 20
    },
    hero: {
      alignItems: "center",
      gap: 10,
      paddingTop: 12
    },
    heroTitle: {
      fontSize: fontSize.title,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center"
    },
    heroAmount: {
      fontSize: fontSize.display,
      fontWeight: "700",
      color: colors.text
    },
    badge: {
      marginTop: 4,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 999
    },
    badgeText: {
      fontSize: 11,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.4
    },
    card: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 16,
      gap: 12
    },
    logoSlot: {
      height: 56,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4
    },
    row: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      gap: 12
    },
    rowLabel: {
      fontSize: fontSize.secondary,
      color: colors.textMuted,
      fontWeight: fontWeight.semibold
    },
    rowValue: {
      flexShrink: 1,
      fontSize: fontSize.secondary,
      color: colors.text,
      fontWeight: "700",
      textAlign: "right"
    },
    actions: {
      paddingHorizontal: 24,
      paddingBottom: 12,
      gap: 10
    },
    primaryBtn: {
      height: 52,
      borderRadius: 12,
      backgroundColor: colors.brand,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    },
    primaryBtnText: {
      color: colors.onBrand,
      fontSize: fontSize.body,
      fontWeight: "700"
    },
    secondaryBtn: {
      height: 52,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8
    },
    secondaryBtnText: {
      color: colors.text,
      fontSize: fontSize.body,
      fontWeight: "700"
    },
    btnDisabled: {
      opacity: 0.7
    }
  });
}
