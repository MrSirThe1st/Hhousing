import { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { fontWeight, fontSize, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

export type MobileMoneyProviderCode = "AIRTEL_COD" | "ORANGE_COD" | "VODACOM_MPESA_COD";

type ProviderMeta = {
  code: MobileMoneyProviderCode;
  label: string;
  logo: number;
  /** Wordmarks are wide; icon marks are closer to square. */
  logoWidth: number;
  logoHeight: number;
};

export const MOBILE_MONEY_PROVIDERS: ProviderMeta[] = [
  {
    code: "AIRTEL_COD",
    label: "Airtel Money",
    logo: require("../../assets/Airtel_Africa-Logo.wine.png"),
    logoWidth: 72,
    logoHeight: 22
  },
  {
    code: "ORANGE_COD",
    label: "Orange Money",
    logo: require("../../assets/Orange_Money-Logo.wine.png"),
    logoWidth: 72,
    logoHeight: 22
  },
  {
    code: "VODACOM_MPESA_COD",
    label: "M-Pesa",
    logo: require("../../assets/m-pesa-logo-png_seeklogo-622552.png"),
    logoWidth: 40,
    logoHeight: 36
  }
];

export function MobileMoneyLogo({
  code,
  size
}: {
  code: MobileMoneyProviderCode;
  /** Optional square size override (pay modal chips). */
  size?: number;
}): React.ReactElement {
  const provider = MOBILE_MONEY_PROVIDERS.find((item) => item.code === code)
    ?? MOBILE_MONEY_PROVIDERS[0]!;

  const width = size ?? provider.logoWidth;
  const height = size ?? provider.logoHeight;

  return (
    <Image
      source={provider.logo}
      style={{ width, height }}
      resizeMode="contain"
      accessibilityLabel={provider.label}
    />
  );
}

export function MobileMoneyMethodsRow(): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.block}>
      <Pressable
        style={styles.header}
        onPress={() => { setExpanded((prev) => !prev); }}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={t("shared.acceptedMethodsA11y")}
      >
        <Text style={styles.heading}>{t("shared.acceptedMethods")}</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.iconMuted}
        />
      </Pressable>
      {expanded ? (
        <View style={styles.row}>
          {MOBILE_MONEY_PROVIDERS.map((provider) => (
            <View key={provider.code} style={styles.chip}>
              <View style={styles.logoWrap}>
                <MobileMoneyLogo code={provider.code} />
              </View>
              <Text style={styles.label} numberOfLines={1}>
                {provider.label}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    block: {
      gap: 10
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
      paddingVertical: 2
    },
    heading: {
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      letterSpacing: 0.6,
      color: colors.textFaint
    },
    row: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: 8
    },
    chip: {
      flexGrow: 1,
      flexBasis: "30%",
      minWidth: 96,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      backgroundColor: colors.surface,
      paddingVertical: 12,
      paddingHorizontal: 10,
      alignItems: "center",
      gap: 8
    },
    logoWrap: {
      minHeight: 36,
      alignItems: "center",
      justifyContent: "center"
    },
    label: {
      fontSize: fontSize.caption,
      fontWeight: "600",
      color: colors.textSecondary,
      textAlign: "center"
    }
  });
}
