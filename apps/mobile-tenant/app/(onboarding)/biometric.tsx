import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { usePreferences } from "@/contexts/preferences-context";
import { authenticateWithBiometrics, getBiometricAvailability } from "@/lib/biometrics";
import { fontWeight, fontSize, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

export default function OnboardingBiometricScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { setBiometricEnabled, markBiometricPromptShown } = usePreferences();
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const settledRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function checkAvailability(): Promise<void> {
      const availability = await getBiometricAvailability();
      if (!mounted || settledRef.current) {
        return;
      }

      if (!availability.available) {
        settledRef.current = true;
        await markBiometricPromptShown();
        return;
      }

      setChecking(false);
    }

    void checkAvailability();
    return () => {
      mounted = false;
    };
  }, [markBiometricPromptShown]);

  async function finish(enabled: boolean): Promise<void> {
    if (busy || settledRef.current) {
      return;
    }
    settledRef.current = true;
    setBusy(true);
    try {
      if (enabled) {
        const auth = await authenticateWithBiometrics(t("biometric.enablePrompt"));
        if (!auth.success) {
          settledRef.current = false;
          setBusy(false);
          return;
        }
        await setBiometricEnabled(true);
      }
      await markBiometricPromptShown();
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <Ionicons name="finger-print-outline" size={48} color={colors.brand} />
        </View>
        <Text style={styles.title}>{t("onboarding.biometricTitle")}</Text>
        <Text style={styles.subtitle}>{t("onboarding.biometricSubtitle")}</Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.primaryButton, busy ? styles.buttonDisabled : null]}
          onPress={() => {
            void finish(true);
          }}
          disabled={busy}
        >
          <Text style={styles.primaryText}>{t("onboarding.biometricEnable")}</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryButton, busy ? styles.buttonDisabled : null]}
          onPress={() => {
            void finish(false);
          }}
          disabled={busy}
        >
          <Text style={styles.secondaryText}>{t("onboarding.biometricSkip")}</Text>
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
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center"
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 72,
      alignItems: "center"
    },
    iconWrap: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.brandSoft,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 28
    },
    title: {
      fontSize: fontSize.emphasis,
      fontWeight: fontWeight.bold,
      color: colors.text,
      textAlign: "center",
      marginBottom: 8
    },
    subtitle: {
      fontSize: fontSize.body,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
      paddingHorizontal: 8
    },
    footer: {
      paddingHorizontal: 24,
      paddingBottom: 16,
      gap: 12
    },
    primaryButton: {
      backgroundColor: colors.brand,
      borderRadius: 12,
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center"
    },
    secondaryButton: {
      borderRadius: 12,
      minHeight: 48,
      alignItems: "center",
      justifyContent: "center"
    },
    buttonDisabled: {
      opacity: 0.6
    },
    primaryText: {
      color: colors.onBrand,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold
    },
    secondaryText: {
      color: colors.textSecondary,
      fontSize: fontSize.body,
      fontWeight: fontWeight.medium
    }
  });
}
