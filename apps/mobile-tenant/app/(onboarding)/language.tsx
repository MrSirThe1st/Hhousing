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
  /** Native name — stable across locales so the control width never jumps. */
  label: string;
};

const OPTIONS: LanguageOption[] = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" }
];

export default function OnboardingLanguageScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { language, previewLanguage, setLanguage, markLanguageSelected } = usePreferences();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  const selected = OPTIONS.find((option) => option.code === language) ?? OPTIONS[0];

  async function handleContinue(): Promise<void> {
    if (busy) {
      return;
    }
    setBusy(true);
    setOpen(false);
    try {
      await setLanguage(language);
      await markLanguageSelected();
    } finally {
      setBusy(false);
    }
  }

  async function handleSelect(code: AppLanguage): Promise<void> {
    setOpen(false);
    await previewLanguage(code);
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <Pressable style={styles.content} onPress={() => { setOpen(false); }}>
        <View style={styles.hero}>
          <View style={styles.iconWrap}>
            <Ionicons name="globe-outline" size={36} color={colors.brand} />
          </View>
          <View style={styles.copyBlock}>
            <Text style={styles.title} numberOfLines={2}>
              {t("onboarding.languageTitle")}
            </Text>
            <Text style={styles.subtitle} numberOfLines={3}>
              {t("onboarding.languageSubtitle")}
            </Text>
          </View>
        </View>

        <View style={styles.fieldBlock}>
          <Text style={styles.fieldLabel}>{t("settings.language")}</Text>
          <View style={styles.dropdownAnchor}>
            <Pressable
              style={({ pressed }) => [
                styles.trigger,
                open && styles.triggerOpen,
                pressed && styles.triggerPressed
              ]}
              onPress={() => {
                setOpen((value) => !value);
              }}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
            >
              <Text style={styles.triggerLabel} numberOfLines={1}>
                {selected.label}
              </Text>
              <Ionicons
                name={open ? "chevron-up" : "chevron-down"}
                size={18}
                color={colors.textMuted}
              />
            </Pressable>

            {open ? (
              <View style={styles.menu} pointerEvents="box-none">
                {OPTIONS.map((option) => {
                  const isSelected = option.code === language;
                  return (
                    <Pressable
                      key={option.code}
                      style={({ pressed }) => [
                        styles.menuItem,
                        isSelected && styles.menuItemSelected,
                        pressed && styles.menuItemPressed
                      ]}
                      onPress={() => {
                        void handleSelect(option.code);
                      }}
                    >
                      <Text
                        style={[
                          styles.menuItemLabel,
                          isSelected && styles.menuItemLabelSelected
                        ]}
                        numberOfLines={1}
                      >
                        {option.label}
                      </Text>
                      {isSelected ? (
                        <Ionicons name="checkmark" size={18} color={colors.brand} />
                      ) : (
                        <View style={styles.menuCheckSpacer} />
                      )}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        </View>
      </Pressable>

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
      paddingTop: 40
    },
    hero: {
      alignItems: "center",
      marginBottom: 36
    },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      backgroundColor: colors.brandSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 20
    },
    copyBlock: {
      width: "100%",
      alignItems: "center",
      // Reserve space for the longest FR/EN copy so the dropdown never jumps.
      minHeight: 96
    },
    title: {
      fontSize: fontSize.emphasis,
      fontWeight: fontWeight.bold,
      color: colors.text,
      textAlign: "center",
      lineHeight: 24,
      minHeight: 48,
      marginBottom: 8
    },
    subtitle: {
      fontSize: fontSize.body,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 20,
      minHeight: 40,
      paddingHorizontal: 8
    },
    fieldBlock: {
      zIndex: 2
    },
    fieldLabel: {
      fontSize: fontSize.secondary,
      fontWeight: fontWeight.medium,
      color: colors.textMuted,
      marginBottom: 8
    },
    dropdownAnchor: {
      position: "relative",
      zIndex: 3
    },
    trigger: {
      minHeight: 52,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      backgroundColor: colors.inputBg,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12
    },
    triggerOpen: {
      borderColor: colors.brand,
      backgroundColor: colors.surface
    },
    triggerPressed: {
      opacity: 0.85
    },
    triggerLabel: {
      flex: 1,
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium,
      color: colors.text
    },
    menu: {
      position: "absolute",
      top: 60,
      left: 0,
      right: 0,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      overflow: "hidden",
      // Keep the open menu from pushing the Continue button.
      shadowColor: "#000",
      shadowOpacity: 0.12,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8
    },
    menuItem: {
      minHeight: 48,
      paddingHorizontal: 16,
      flexDirection: "row",
      alignItems: "center",
      gap: 12
    },
    menuItemSelected: {
      backgroundColor: colors.brandSoft
    },
    menuItemPressed: {
      backgroundColor: colors.backgroundAlt
    },
    menuItemLabel: {
      flex: 1,
      fontSize: fontSize.body,
      color: colors.text,
      fontWeight: fontWeight.regular
    },
    menuItemLabelSelected: {
      fontWeight: fontWeight.semibold,
      color: colors.brand
    },
    menuCheckSpacer: {
      width: 18,
      height: 18
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
