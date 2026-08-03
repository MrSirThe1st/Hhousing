import { useMemo } from "react";
import {
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { fontWeight, fontSize, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type LinkRow = {
  key: string;
  label: string;
  icon: IoniconName;
  onPress: () => void;
};

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

  const links: LinkRow[] = [
    {
      key: "privacy",
      label: t("account.privacy"),
      icon: "shield-checkmark-outline",
      onPress: () => { router.push("/(tabs)/account/privacy"); }
    },
    {
      key: "terms",
      label: t("account.terms"),
      icon: "document-text-outline",
      onPress: () => { router.push("/(tabs)/account/terms"); }
    },
    {
      key: "support",
      label: t("account.support"),
      icon: "mail-outline",
      onPress: () => { router.push("/(tabs)/account/support"); }
    }
  ];

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

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Image
          source={require("../../../assets/door_logo.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.appName}>{t("common.appName")}</Text>
        <Text style={styles.tagline}>{t("account.aboutTagline")}</Text>
        <Text style={styles.version}>{t("account.version", { version: appVersionLabel() })}</Text>

        <Text style={styles.description}>{t("account.aboutDescription")}</Text>
        <Text style={styles.madeIn}>{t("account.madeInDrc")}</Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>{t("account.publisher")}</Text>
          <Text style={styles.cardValue}>Haraka Property</Text>
        </View>

        <View style={styles.linkList}>
          {links.map((row, index) => (
            <View key={row.key}>
              <Pressable
                style={({ pressed }) => [styles.linkRow, pressed && styles.linkRowPressed]}
                onPress={row.onPress}
              >
                <Ionicons name={row.icon} size={22} color={colors.brand} />
                <Text style={styles.linkLabel}>{row.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.iconMuted} />
              </Pressable>
              {index < links.length - 1 ? <View style={styles.separator} /> : null}
            </View>
          ))}
        </View>

        <Pressable
          style={styles.websiteBtn}
          onPress={() => { void Linking.openURL("https://www.harakaproperty.com"); }}
        >
          <Ionicons name="globe-outline" size={18} color={colors.brand} />
          <Text style={styles.websiteBtnText}>{t("account.visitWebsite")}</Text>
        </Pressable>
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
      paddingTop: 28,
      paddingBottom: 40,
      gap: 8
    },
    logo: {
      width: 72,
      height: 108,
      marginBottom: 8,
      borderRadius: 12
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
    description: {
      marginTop: 16,
      fontSize: fontSize.secondary,
      lineHeight: 21,
      color: colors.textSecondary,
      textAlign: "center"
    },
    madeIn: {
      marginTop: 6,
      fontSize: fontSize.secondary,
      fontWeight: fontWeight.medium,
      color: colors.text,
      textAlign: "center"
    },
    card: {
      marginTop: 20,
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
    },
    linkList: {
      marginTop: 20,
      alignSelf: "stretch",
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      overflow: "hidden"
    },
    linkRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      minHeight: 52,
      paddingHorizontal: 16,
      backgroundColor: colors.background
    },
    linkRowPressed: {
      backgroundColor: colors.backgroundAlt
    },
    linkLabel: {
      flex: 1,
      fontSize: fontSize.body,
      fontWeight: "500",
      color: colors.textSecondary
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: 50
    },
    websiteBtn: {
      marginTop: 20,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: colors.brandSoft
    },
    websiteBtnText: {
      color: colors.brand,
      fontSize: fontSize.secondary,
      fontWeight: "600"
    }
  });
}
