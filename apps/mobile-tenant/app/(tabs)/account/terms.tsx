import { useMemo } from "react";
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { fontWeight, fontSize, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

const TERMS_URL = "https://harakaproperty.com/conditions-utilisation";

export default function TermsScreen(): React.ReactElement {
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
        <Text style={styles.topTitle}>{t("account.terms")}</Text>
        <View style={styles.topSpacer} />
      </View>
      <View style={styles.headerRule} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.body}>{t("account.termsBody1")}</Text>
        <Text style={styles.body}>{t("account.termsBody2")}</Text>

        <Pressable
          style={styles.linkBtn}
          onPress={() => { void Linking.openURL(TERMS_URL); }}
        >
          <Ionicons name="open-outline" size={18} color={colors.brand} />
          <Text style={styles.linkBtnText}>{t("account.viewFullTerms")}</Text>
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
      gap: 14
    },
    body: {
      fontSize: fontSize.secondary,
      lineHeight: 21,
      color: colors.textMuted
    },
    linkBtn: {
      marginTop: 8,
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
