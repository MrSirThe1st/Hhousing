import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { BiometricGlyph } from "@/components/biometric-glyph";
import { BlockingLoadingScreen } from "@/components/universal-loading-state";
import { usePreferences } from "@/contexts/preferences-context";
import {
  authenticateWithBiometrics,
  biometricFailureMessage,
  biometricMethodLabel,
  getBiometricAvailability,
  saveBiometricCredentials,
  type BiometricModality
} from "@/lib/biometrics";
import {
  clearPendingBiometricCredentials,
  takePendingBiometricCredentials
} from "@/lib/pending-biometric-credentials";
import { fontWeight, fontSize, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

export default function OnboardingBiometricScreen(): React.ReactElement {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { setBiometricEnabled, markBiometricPromptShown } = usePreferences();
  const [checking, setChecking] = useState(true);
  /** Disables buttons while Face ID sheet is up — screen must stay mounted. */
  const [prompting, setPrompting] = useState(false);
  /** Full-screen blocker only after success, while we save + navigate away. */
  const [completing, setCompleting] = useState(false);
  const [modality, setModality] = useState<BiometricModality>("biometric");
  const [enrolled, setEnrolled] = useState(false);
  const settledRef = useRef(false);

  useEffect(() => {
    let mounted = true;

    async function checkAvailability(): Promise<void> {
      const availability = await getBiometricAvailability();
      if (!mounted || settledRef.current) {
        return;
      }

      if (!availability.hardware) {
        settledRef.current = true;
        clearPendingBiometricCredentials();
        await markBiometricPromptShown();
        return;
      }

      setModality(availability.modality);
      setEnrolled(availability.enrolled);
      setChecking(false);
    }

    void checkAvailability();
    return () => {
      mounted = false;
    };
  }, [markBiometricPromptShown]);

  async function finish(enabled: boolean): Promise<void> {
    if (prompting || completing || settledRef.current) {
      return;
    }

    if (!enabled) {
      settledRef.current = true;
      setCompleting(true);
      clearPendingBiometricCredentials();
      await markBiometricPromptShown();
      return;
    }

    if (!enrolled) {
      Alert.alert(t("common.info"), t("biometric.notEnrolled"));
      return;
    }

    // Keep this screen mounted so iOS can present Face ID.
    setPrompting(true);
    try {
      const auth = await authenticateWithBiometrics(t("biometric.enablePrompt"));
      if (!auth.success) {
        setPrompting(false);
        if (!auth.cancelled) {
          const message = biometricFailureMessage(auth);
          Alert.alert(t("common.error"), message ?? t("biometric.failedFallback"));
        }
        return;
      }

      settledRef.current = true;
      setCompleting(true);
      const credentials = takePendingBiometricCredentials();
      if (credentials) {
        await saveBiometricCredentials(credentials);
      }
      await setBiometricEnabled(true);
      await markBiometricPromptShown();
    } catch {
      settledRef.current = false;
      setPrompting(false);
      setCompleting(false);
      Alert.alert(t("common.error"), t("biometric.failedFallback"));
    }
  }

  const method = biometricMethodLabel(modality);
  const wide = modality === "biometric";

  if (checking || completing) {
    return <BlockingLoadingScreen />;
  }

  return (
    <SafeAreaView style={styles.root} edges={["top", "bottom"]}>
      <View style={styles.content}>
        <View style={[styles.iconWrap, wide ? styles.iconWrapWide : null]}>
          <BiometricGlyph modality={modality} size={48} color={colors.brand} />
        </View>
        <Text style={styles.title}>{t("onboarding.biometricTitle", { method })}</Text>
        <Text style={styles.subtitle}>{t("onboarding.biometricSubtitle", { method })}</Text>
      </View>

      <View style={styles.footer}>
        <Pressable
          style={[styles.primaryButton, prompting ? styles.buttonDisabled : null]}
          onPress={() => {
            void finish(true);
          }}
          disabled={prompting}
        >
          <Text style={styles.primaryText}>{t("onboarding.biometricEnable", { method })}</Text>
        </Pressable>
        <Pressable
          style={[styles.secondaryButton, prompting ? styles.buttonDisabled : null]}
          onPress={() => {
            void finish(false);
          }}
          disabled={prompting}
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
      marginBottom: 28,
      flexDirection: "row",
      gap: 10
    },
    iconWrapWide: {
      width: 132,
      borderRadius: 44,
      paddingHorizontal: 16
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
