import { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { usePreferences } from "@/contexts/preferences-context";
import type { AppLanguage } from "@/i18n/types";
import { fontWeight, fontSize, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

type LanguageOption = {
  code: AppLanguage;
  labelKey: "settings.languageFr" | "settings.languageEn";
};

const OPTIONS: LanguageOption[] = [
  { code: "fr", labelKey: "settings.languageFr" },
  { code: "en", labelKey: "settings.languageEn" }
];

export default function LanguageScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { language, setLanguage } = usePreferences();

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => { router.back(); }} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={colors.brand} />
        </Pressable>
        <Text style={styles.topTitle}>{t("settings.language")}</Text>
        <View style={styles.topSpacer} />
      </View>
      <View style={styles.headerRule} />

      <View style={styles.list}>
        {OPTIONS.map((option, index) => {
          const selected = language === option.code;
          return (
            <View key={option.code}>
              <Pressable
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                onPress={() => { void setLanguage(option.code); }}
              >
                <Text style={styles.rowLabel}>{t(option.labelKey)}</Text>
                {selected ? (
                  <Ionicons name="checkmark" size={22} color={colors.brand} />
                ) : null}
              </Pressable>
              {index < OPTIONS.length - 1 ? <View style={styles.separator} /> : null}
            </View>
          );
        })}
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
    list: {
      marginTop: 4
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: 20,
      minHeight: 54,
      backgroundColor: colors.background
    },
    rowPressed: {
      backgroundColor: colors.backgroundAlt
    },
    rowLabel: {
      flex: 1,
      fontSize: fontSize.body,
      color: colors.textSecondary,
      fontWeight: "500"
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: 20
    }
  });
}
