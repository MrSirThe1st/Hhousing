import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  MobileMoneyLogo,
  type MobileMoneyProviderCode
} from "@/components/mobile-money-logos";
import { formatAmount } from "@/i18n/format";
import { fontSize, fontWeight, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

function isProviderCode(value: string | undefined): value is MobileMoneyProviderCode {
  return value === "AIRTEL_COD" || value === "ORANGE_COD" || value === "VODACOM_MPESA_COD";
}

export default function PaymentFailedScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const params = useLocalSearchParams<{
    amount?: string;
    currencyCode?: string;
    provider?: string;
    providerCode?: string;
    phone?: string;
    error?: string;
  }>();

  const amount = Number(params.amount ?? 0);
  const currencyCode = params.currencyCode ?? "CDF";
  const providerLabel = params.provider ?? "Mobile Money";
  const providerCode = isProviderCode(params.providerCode) ? params.providerCode : null;
  const phone = params.phone ?? "";
  const errorMessage = (params.error ?? "").trim() || t("payments.failed");
  const amountLabel = formatAmount(amount, currencyCode);

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <View style={styles.hero}>
          <View style={styles.errorCircle}>
            <Ionicons name="close" size={40} color={colors.onBrand} />
          </View>
          <Text style={styles.title}>{t("payments.failure.title")}</Text>
          <Text style={styles.subtitle}>{t("payments.failure.subtitle")}</Text>
          <Text style={styles.amount}>{amountLabel}</Text>
        </View>

        <View style={styles.card}>
          {providerCode ? (
            <View style={styles.logoSlot}>
              <MobileMoneyLogo code={providerCode} height={64} />
            </View>
          ) : null}
          <View style={styles.errorBox}>
            <Text style={styles.errorLabel}>{t("payments.failure.errorLabel")}</Text>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{t("payments.success.method")}</Text>
            <Text style={styles.rowValue}>{providerLabel}</Text>
          </View>
          {phone ? (
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{t("payments.success.phone")}</Text>
              <Text style={styles.rowValue}>{phone}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={styles.primaryBtn}
            onPress={() => { router.replace("/(tabs)/payments?pay=1"); }}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.onBrand} />
            <Text style={styles.primaryBtnText}>{t("payments.failure.retry")}</Text>
          </Pressable>
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => { router.replace("/(tabs)/payments"); }}
          >
            <Text style={styles.secondaryBtnText}>{t("payments.failure.close")}</Text>
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
    errorCircle: {
      width: 76,
      height: 76,
      borderRadius: 38,
      backgroundColor: colors.danger,
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
      maxWidth: 300
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
      height: 64,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 4
    },
    errorBox: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.surfaceMuted,
      padding: 12,
      gap: 4
    },
    errorLabel: {
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: colors.danger,
      textTransform: "uppercase",
      letterSpacing: 0.4
    },
    errorText: {
      fontSize: fontSize.secondary,
      lineHeight: 20,
      color: colors.text,
      fontWeight: "600"
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
    }
  });
}
