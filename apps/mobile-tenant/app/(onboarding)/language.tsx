import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
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

export default function OnboardingLanguageScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { language, previewLanguage, setLanguage, markLanguageSelected } = usePreferences();
  const [busy, setBusy] = useState(false);

  async function handleContinue(): Promise<void> {
    if (busy) {
      return;
    }
    setBusy(true);
    try {
      await setLanguage(language);
      await markLanguageSelected();
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <Text style={styles.title}>{t("onboarding.languageTitle")}</Text>
        <Text style={styles.subtitle}>{t("onboarding.languageSubtitle")}</Text>

        <View style={styles.list}>
          {OPTIONS.map((option, index) => {
            const selected = language === option.code;
            return (
              <View key={option.code}>
                <Pressable
                  style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
                  onPress={() => {
                    void previewLanguage(option.code);
                  }}
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
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.continueButton, busy ? styles.buttonDisabled : null]}
          onPress={() => {
            void handleContinue();
          }}
          disabled={busy}
        >
          <Text style={styles.continueText}>{t("onboarding.continue")}</Text>
        </Pressable>
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
      paddingTop: 48
    },
    title: {
      fontSize: fontSize.emphasis,
      fontWeight: fontWeight.bold,
      color: colors.text,
      marginBottom: 8
    },
    subtitle: {
      fontSize: fontSize.body,
      color: colors.textSecondary,
      marginBottom: 32,
      lineHeight: 22
    },
    list: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      minHeight: 56,
      paddingVertical: 4
    },
    rowPressed: {
      opacity: 0.7
    },
    rowLabel: {
      flex: 1,
      fontSize: fontSize.body,
      color: colors.text,
      fontWeight: fontWeight.medium
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border
    },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: 16
    },
    continueButton: {
      backgroundColor: colors.brand,
      borderRadius: 12,
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center"
    },
    buttonDisabled: {
      opacity: 0.6
    },
    continueText: {
      color: colors.onBrand,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold
    }
  });
}
