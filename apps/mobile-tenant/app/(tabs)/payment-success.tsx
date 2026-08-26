import { useMemo, useState } from "react";
import { Pressable, Share, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  MobileMoneyLogo,
  type MobileMoneyProviderCode
} from "@/components/mobile-money-logos";
import { formatAmount, formatLocaleDateTime } from "@/i18n/format";
import { fontSize, fontWeight, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

function isProviderCode(value: string | undefined): value is MobileMoneyProviderCode {
  return value === "AIRTEL_COD" || value === "ORANGE_COD" || value === "VODACOM_MPESA_COD";
}

export default function PaymentSuccessScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [sharing, setSharing] = useState(false);

  const params = useLocalSearchParams<{
    amount?: string;
    currencyCode?: string;
    provider?: string;
    providerCode?: string;
    phone?: string;
    transactionId?: string;
    paidAt?: string;
  }>();

  const amount = Number(params.amount ?? 0);
  const currencyCode = params.currencyCode ?? "CDF";
  const providerLabel = params.provider ?? "Mobile Money";
  const providerCode = isProviderCode(params.providerCode) ? params.providerCode : null;
  const phone = params.phone ?? "";
  const transactionId = params.transactionId ?? "";
  const paidAtLabel = params.paidAt
    ? formatLocaleDateTime(params.paidAt, {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    : "";

  const amountLabel = formatAmount(amount, currencyCode);

  async function handleDownloadInvoice(): Promise<void> {
    setSharing(true);
    try {
      const message = [
        t("payments.success.receiptTitle"),
        "",
        t("payments.success.receiptAmount", { amount: amountLabel }),
        t("payments.success.receiptMethod", { provider: providerLabel }),
        phone ? t("payments.success.receiptPhone", { phone }) : null,
        paidAtLabel ? t("payments.success.receiptDate", { date: paidAtLabel }) : null,
        transactionId ? t("payments.success.receiptRef", { ref: transactionId }) : null,
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

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark" size={40} color={colors.onBrand} />
          </View>
          <Text style={styles.title}>{t("payments.success.title")}</Text>
          <Text style={styles.subtitle}>{t("payments.success.subtitle")}</Text>
          <Text style={styles.amount}>{amountLabel}</Text>
        </View>

        <View style={styles.card}>
          {providerCode ? (
            <View style={styles.logoSlot}>
              <MobileMoneyLogo code={providerCode} height={72} />
            </View>
          ) : null}
          <Text style={styles.providerLabel}>{providerLabel}</Text>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t("payments.success.phone")}</Text>
            <Text style={styles.rowValue}>{phone || "—"}</Text>
          </View>
          {paidAtLabel ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t("payments.success.date")}</Text>
              <Text style={styles.rowValue}>{paidAtLabel}</Text>
            </View>
          ) : null}
          {transactionId ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t("payments.success.reference")}</Text>
              <Text style={styles.rowValue} numberOfLines={1}>
                {transactionId.slice(0, 8).toUpperCase()}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.primaryBtn, sharing && styles.btnDisabled]}
            disabled={sharing}
            onPress={() => { void handleDownloadInvoice(); }}
          >
            <Ionicons name="download-outline" size={18} color={colors.onBrand} />
            <Text style={styles.primaryBtnText}>{t("payments.success.download")}</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => { router.replace("/(tabs)/payments"); }}
          >
            <Text style={styles.secondaryBtnText}>{t("payments.success.done")}</Text>
          </Pressable>
        </View>
      </View>
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
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 16,
      justifyContent: "space-between"
    },
    hero: {
      alignItems: "center",
      gap: 10,
      paddingTop: 28
    },
    checkCircle: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8
    },
    title: {
      fontSize: fontSize.title,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center"
    },
    subtitle: {
      fontSize: fontSize.secondary,
      color: colors.textMuted,
      textAlign: "center",
      lineHeight: 20,
      maxWidth: 280
    },
    amount: {
      marginTop: 8,
      fontSize: fontSize.display,
      fontWeight: "700",
      color: colors.text
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
      height: 72,
      alignItems: "center",
      justifyContent: "center"
    },
    providerLabel: {
      fontSize: fontSize.body,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center",
      marginTop: -4
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
      alignItems: "center",
      justifyContent: "center"
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
