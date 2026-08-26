import { useMemo, useState } from "react";
import { Image, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { env } from "@/lib/env";
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
    logo: require("../../assets/mpesa.png"),
    logoWidth: 48,
    logoHeight: 48
  }
];

export function MobileMoneyLogo({
  code,
  size,
  height: fixedHeight
}: {
  code: MobileMoneyProviderCode;
  /** Max edge length; preserves each logo’s natural aspect ratio. */
  size?: number;
  /** Fixed height (preferred for stable hero layout). Width follows aspect ratio. */
  height?: number;
}): React.ReactElement {
  const provider = MOBILE_MONEY_PROVIDERS.find((item) => item.code === code)
    ?? MOBILE_MONEY_PROVIDERS[0]!;

  let width = provider.logoWidth;
  let height = provider.logoHeight;

  if (typeof fixedHeight === "number" && fixedHeight > 0) {
    height = fixedHeight;
    width = Math.round(provider.logoWidth * (fixedHeight / provider.logoHeight));
  } else if (typeof size === "number" && size > 0) {
    const scale = size / Math.max(provider.logoWidth, provider.logoHeight);
    width = Math.round(provider.logoWidth * scale);
    height = Math.round(provider.logoHeight * scale);
  }

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
  const [infoProvider, setInfoProvider] = useState<ProviderMeta | null>(null);

  // When payments are off, show as upcoming methods; when on, "accepted".
  const headingKey = env.mobilePaymentsEnabled
    ? "shared.acceptedMethods"
    : "shared.methodsComingSoon";
  const a11yKey = env.mobilePaymentsEnabled
    ? "shared.acceptedMethodsA11y"
    : "shared.methodsComingSoonA11y";

  return (
    <View style={styles.block}>
      <Pressable
        style={styles.header}
        onPress={() => { setExpanded((prev) => !prev); }}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={t(a11yKey)}
      >
        <Text style={styles.heading}>{t(headingKey)}</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={colors.iconMuted}
        />
      </Pressable>

      {expanded ? (
        <View style={styles.list}>
          {MOBILE_MONEY_PROVIDERS.map((provider, index) => (
            <Pressable
              key={provider.code}
              style={[
                styles.listRow,
                index < MOBILE_MONEY_PROVIDERS.length - 1 ? styles.listRowBorder : null
              ]}
              onPress={() => { setInfoProvider(provider); }}
              accessibilityRole="button"
              accessibilityLabel={t("shared.methodInfoA11y", { provider: provider.label })}
            >
              <View style={styles.listLogo}>
                <MobileMoneyLogo
                  code={provider.code}
                  height={provider.code === "VODACOM_MPESA_COD" ? 28 : 22}
                />
              </View>
              <Text style={styles.listLabel} numberOfLines={1}>
                {provider.label}
              </Text>
              <Ionicons name="information-circle-outline" size={22} color={colors.brand} />
            </Pressable>
          ))}
        </View>
      ) : null}

      <Modal
        visible={infoProvider !== null}
        animationType="fade"
        transparent
        onRequestClose={() => { setInfoProvider(null); }}
      >
        <View style={styles.infoBackdrop}>
          <View style={styles.infoCard}>
            {infoProvider ? (
              <>
                <View style={styles.infoHero}>
                  <MobileMoneyLogo
                    code={infoProvider.code}
                    height={infoProvider.code === "VODACOM_MPESA_COD" ? 48 : 32}
                  />
                  <Text style={styles.infoTitle}>{infoProvider.label}</Text>
                  <Text style={styles.infoSubtitle}>{t("shared.methodInfoSubtitle")}</Text>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionLabel}>{t("shared.methodInfoRatesLabel")}</Text>
                  <Text style={styles.infoSectionBody}>
                    {t("shared.methodInfoRatesBody", { provider: infoProvider.label })}
                  </Text>
                </View>

                <View style={styles.infoSection}>
                  <Text style={styles.infoSectionLabel}>
                    {t("shared.methodInfoAvailabilityLabel")}
                  </Text>
                  <Text style={styles.infoSectionBody}>
                    {t("shared.methodInfoAvailabilityBody")}
                  </Text>
                </View>

                <Pressable
                  style={styles.infoCloseBtn}
                  onPress={() => { setInfoProvider(null); }}
                >
                  <Text style={styles.infoCloseText}>{t("shared.methodInfoClose")}</Text>
                </Pressable>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
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
    list: {
      gap: 0
    },
    listRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      paddingVertical: 12,
      paddingHorizontal: 0,
      minHeight: 48
    },
    listRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border
    },
    listLogo: {
      width: 72,
      height: 28,
      alignItems: "flex-start",
      justifyContent: "center"
    },
    listLabel: {
      flex: 1,
      fontSize: fontSize.body,
      fontWeight: "600",
      color: colors.text
    },
    infoBackdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: "center",
      paddingHorizontal: 24
    },
    infoCard: {
      backgroundColor: colors.surface,
      borderRadius: 20,
      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 18,
      gap: 16,
      borderWidth: 1,
      borderColor: colors.border
    },
    infoHero: {
      alignItems: "center",
      gap: 8
    },
    infoTitle: {
      fontSize: fontSize.title,
      fontWeight: "700",
      color: colors.text,
      textAlign: "center"
    },
    infoSubtitle: {
      fontSize: fontSize.secondary,
      color: colors.textMuted,
      textAlign: "center"
    },
    infoSection: {
      gap: 4
    },
    infoSectionLabel: {
      fontSize: fontSize.secondary,
      fontWeight: fontWeight.semibold,
      color: colors.textSecondary
    },
    infoSectionBody: {
      fontSize: fontSize.secondary,
      color: colors.textMuted,
      lineHeight: 20
    },
    infoCloseBtn: {
      height: 48,
      borderRadius: 12,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 4
    },
    infoCloseText: {
      color: colors.onBrand,
      fontSize: fontSize.body,
      fontWeight: "700"
    }
  });
}
