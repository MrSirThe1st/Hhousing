import { useMemo } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { fontWeight, fontSize, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

function appVersionLabel(): string {
  const version = Constants.expoConfig?.version ?? "1.0.0";
  const build =
    Platform.OS === "ios"
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode?.toString();
  return build ? `${version} (${build})` : version;
}

export default function AboutScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => { router.back(); }} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={colors.brand} />
        </Pressable>
        <Text style={styles.topTitle}>{t("account.about")}</Text>
        <View style={styles.topSpacer} />
      </View>
      <View style={styles.headerRule} />

      <View style={styles.content}>
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>H</Text>
        </View>
        <Text style={styles.appName}>{t("common.appName")}</Text>
        <Text style={styles.tagline}>{t("account.aboutTagline")}</Text>
        <Text style={styles.version}>{t("account.version", { version: appVersionLabel() })}</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t("account.publisher")}</Text>
          <Text style={styles.cardValue}>Haraka Property</Text>
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
    topBar: {
      minHeight: 48,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center"
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center"
    },
    topTitle: {
      flex: 1,
      textAlign: "center",
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
      color: colors.text
    },
    topSpacer: { width: 40 },
    headerRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border
    },
    content: {
      alignItems: "center",
      paddingHorizontal: 24,
      paddingTop: 36,
      gap: 8
    },
    logoMark: {
      width: 64,
      height: 64,
      borderRadius: 16,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 8
    },
    logoText: {
      color: colors.onBrand,
      fontSize: fontSize.emphasis,
      fontWeight: "700"
    },
    appName: {
      fontSize: fontSize.title,
      fontWeight: fontWeight.semibold,
      color: colors.text
    },
    tagline: {
      fontSize: fontSize.secondary,
      color: colors.textMuted,
      textAlign: "center"
    },
    version: {
      marginTop: 4,
      fontSize: fontSize.secondary,
      color: colors.textFaint
    },
    card: {
      marginTop: 28,
      alignSelf: "stretch",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      gap: 4
    },
    cardLabel: {
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: colors.textFaint,
      textTransform: "uppercase",
      letterSpacing: 0.4
    },
    cardValue: {
      fontSize: fontSize.body,
      fontWeight: "600",
      color: colors.text
    }
  });
}
