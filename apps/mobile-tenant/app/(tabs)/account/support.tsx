import { useMemo } from "react";
import { Alert, Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { LEGAL_URLS, SUPPORT_EMAIL } from "@/lib/legal";
import { fontWeight, fontSize, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

async function openSupportEmail(): Promise<void> {
  const subject = encodeURIComponent("Support — Haraka Property");
  const url = `mailto:${SUPPORT_EMAIL}?subject=${subject}`;
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
      return;
    }
  } catch {
    // Fall through.
  }
  Alert.alert(SUPPORT_EMAIL);
}

export default function SupportScreen(): React.ReactElement {
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
        <Text style={styles.topTitle}>{t("account.support")}</Text>
        <View style={styles.topSpacer} />
      </View>
      <View style={styles.headerRule} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.body}>{t("account.supportBody")}</Text>

        <Pressable
          style={({ pressed }) => [styles.contactCard, pressed && styles.contactCardPressed]}
          onPress={() => { void openSupportEmail(); }}
        >
          <View style={styles.contactIcon}>
            <Ionicons name="mail-outline" size={22} color={colors.brand} />
          </View>
          <View style={styles.contactCopy}>
            <Text style={styles.contactLabel}>{t("account.supportEmail")}</Text>
            <Text style={styles.contactValue}>{SUPPORT_EMAIL}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.iconMuted} />
        </Pressable>

        <Pressable
          style={styles.linkBtn}
          onPress={() => { void Linking.openURL(LEGAL_URLS.support); }}
        >
          <Ionicons name="open-outline" size={18} color={colors.brand} />
          <Text style={styles.linkBtnText}>{t("account.viewSupportPage")}</Text>
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
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 32,
      gap: 16
    },
    body: {
      fontSize: fontSize.secondary,
      lineHeight: 21,
      color: colors.textSecondary
    },
    contactCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      backgroundColor: colors.background
    },
    contactCardPressed: {
      backgroundColor: colors.backgroundAlt
    },
    contactIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.brandSoft
    },
    contactCopy: {
      flex: 1,
      gap: 2
    },
    contactLabel: {
      fontSize: fontSize.caption,
      color: colors.textMuted,
      fontWeight: fontWeight.semibold,
      textTransform: "uppercase",
      letterSpacing: 0.3
    },
    contactValue: {
      fontSize: fontSize.body,
      color: colors.text,
      fontWeight: "600"
    },
    linkBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      alignSelf: "flex-start",
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: 10,
      backgroundColor: colors.brandSoft
    },
    linkBtnText: {
      color: colors.brand,
      fontSize: fontSize.secondary,
      fontWeight: "600"
    }
  });
}
