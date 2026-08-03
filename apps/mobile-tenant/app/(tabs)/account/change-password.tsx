import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { usePreferences } from "@/contexts/preferences-context";
import { postWithAuth } from "@/lib/api-client";
import {
  authenticateWithBiometrics,
  biometricFailureMessage,
  clearBiometricCredentials,
  getBiometricAvailability,
  hasBiometricCredentials,
  verifyStoredPassword
} from "@/lib/biometrics";
import { fontSize, fontWeight, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

type ChangePasswordOutput = {
  message: string;
};

export default function ChangePasswordScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { biometricEnabled, setBiometricEnabled } = usePreferences();

  const [unlocked, setUnlocked] = useState(false);
  const [checkingGate, setCheckingGate] = useState(true);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [gatePassword, setGatePassword] = useState("");
  const [gateError, setGateError] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function runGate(): Promise<void> {
      const availability = await getBiometricAvailability();
      if (!mounted) {
        return;
      }

      if (availability.available && biometricEnabled) {
        const result = await authenticateWithBiometrics(t("auth.changePasswordBiometricPrompt"));
        if (!mounted) {
          return;
        }
        if (result.success) {
          setUnlocked(true);
          setCheckingGate(false);
          return;
        }
        const message = biometricFailureMessage(result);
        if (message) {
          setGateError(message);
        }
        setPasswordModalVisible(true);
        setCheckingGate(false);
        return;
      }

      // No biometrics — unlock via current password on the form itself.
      setUnlocked(true);
      setCheckingGate(false);
    }

    void runGate();
    return () => {
      mounted = false;
    };
  }, [biometricEnabled, t]);

  async function confirmGateWithPassword(): Promise<void> {
    if (gatePassword.length < 8) {
      setGateError(t("auth.passwordTooShort"));
      return;
    }

    const credentialsOk = await verifyStoredPassword(gatePassword);
    if (!credentialsOk) {
      if (await hasBiometricCredentials()) {
        setGateError(t("biometric.wrongPassword"));
        return;
      }
    }

    setUnlocked(true);
    setPasswordModalVisible(false);
    setCurrentPassword(gatePassword);
    setGatePassword("");
    setGateError(null);
  }

  async function handleSubmit(): Promise<void> {
    setError(null);

    if (currentPassword.length < 8) {
      setError(t("auth.passwordTooShort"));
      return;
    }
    if (newPassword.length < 8) {
      setError(t("auth.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t("auth.passwordMismatch"));
      return;
    }
    if (currentPassword === newPassword) {
      setError(t("auth.passwordMustDiffer"));
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await postWithAuth<ChangePasswordOutput>("/api/mobile/auth/change-password", {
        currentPassword,
        newPassword
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      await clearBiometricCredentials();
      await setBiometricEnabled(false);

      Alert.alert(t("common.info"), t("auth.changePasswordSuccess"), [
        {
          text: t("common.confirm"),
          onPress: () => {
            router.back();
          }
        }
      ]);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => { router.back(); }} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={colors.brand} />
        </Pressable>
        <Text style={styles.topTitle}>{t("settings.changePassword")}</Text>
        <View style={styles.topSpacer} />
      </View>
      <View style={styles.headerRule} />

      {checkingGate ? (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
      ) : unlocked ? (
        <KeyboardAvoidingView
          style={styles.content}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <Text style={styles.subtitle}>{t("auth.changePasswordSubtitle")}</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t("auth.currentPasswordLabel")}</Text>
            <View style={styles.inputWrap}>
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrent}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                placeholder={t("auth.passwordPlaceholder")}
                placeholderTextColor={colors.textFaint}
              />
              <Pressable onPress={() => setShowCurrent((v) => !v)} hitSlop={8}>
                <Ionicons
                  name={showCurrent ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={colors.iconMuted}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t("auth.newPasswordLabel")}</Text>
            <View style={styles.inputWrap}>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNew}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                placeholder={t("auth.passwordPlaceholder")}
                placeholderTextColor={colors.textFaint}
              />
              <Pressable onPress={() => setShowNew((v) => !v)} hitSlop={8}>
                <Ionicons
                  name={showNew ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={colors.iconMuted}
                />
              </Pressable>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>{t("auth.confirmPasswordLabel")}</Text>
            <View style={styles.inputWrap}>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.input}
                placeholder={t("auth.passwordPlaceholder")}
                placeholderTextColor={colors.textFaint}
              />
              <Pressable onPress={() => setShowConfirm((v) => !v)} hitSlop={8}>
                <Ionicons
                  name={showConfirm ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={colors.iconMuted}
                />
              </Pressable>
            </View>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.button, isSubmitting ? styles.buttonDisabled : null]}
            onPress={() => {
              void handleSubmit();
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={colors.onBrand} />
            ) : (
              <Text style={styles.buttonText}>{t("auth.changePasswordSubmit")}</Text>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      ) : (
        <View style={styles.loading}>
          <Text style={styles.subtitle}>{t("auth.changePasswordGateBody")}</Text>
          <Pressable
            style={styles.button}
            onPress={() => {
              setPasswordModalVisible(true);
            }}
          >
            <Text style={styles.buttonText}>{t("biometric.usePassword")}</Text>
          </Pressable>
        </View>
      )}

      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setPasswordModalVisible(false);
          if (!unlocked) {
            router.back();
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("biometric.passwordUnlockTitle")}</Text>
            <Text style={styles.modalBody}>{t("auth.changePasswordGateBody")}</Text>
            <TextInput
              value={gatePassword}
              onChangeText={setGatePassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.modalInput}
              placeholder={t("auth.passwordPlaceholder")}
              placeholderTextColor={colors.textFaint}
            />
            {gateError ? <Text style={styles.error}>{gateError}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => {
                  setPasswordModalVisible(false);
                  router.back();
                }}
              >
                <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable
                style={styles.modalConfirm}
                onPress={() => {
                  void confirmGateWithPassword();
                }}
              >
                <Text style={styles.buttonText}>{t("common.confirm")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    loading: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24,
      gap: 16
    },
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingTop: 20,
      gap: 16
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: fontSize.body,
      lineHeight: 22
    },
    fieldGroup: {
      gap: 6
    },
    label: {
      fontSize: fontSize.secondary,
      fontWeight: fontWeight.semibold,
      color: colors.textSecondary
    },
    inputWrap: {
      minHeight: 52,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      backgroundColor: colors.inputBg,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8
    },
    input: {
      flex: 1,
      color: colors.text,
      fontSize: fontSize.body,
      paddingVertical: 12
    },
    error: {
      color: colors.danger,
      fontSize: fontSize.secondary
    },
    button: {
      minHeight: 52,
      borderRadius: 12,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center",
      marginTop: 8
    },
    buttonDisabled: {
      opacity: 0.6
    },
    buttonText: {
      color: colors.onBrand,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: "center",
      justifyContent: "center",
      padding: 24
    },
    modalCard: {
      width: "100%",
      borderRadius: 14,
      backgroundColor: colors.surface,
      padding: 20,
      gap: 12
    },
    modalTitle: {
      fontSize: fontSize.emphasis,
      fontWeight: fontWeight.bold,
      color: colors.text
    },
    modalBody: {
      fontSize: fontSize.body,
      color: colors.textSecondary,
      lineHeight: 22
    },
    modalInput: {
      minHeight: 48,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      backgroundColor: colors.inputBg,
      paddingHorizontal: 12,
      color: colors.text,
      fontSize: fontSize.body
    },
    modalActions: {
      flexDirection: "row",
      gap: 10,
      marginTop: 4
    },
    modalCancel: {
      flex: 1,
      minHeight: 48,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border
    },
    modalCancelText: {
      color: colors.textSecondary,
      fontWeight: fontWeight.semibold
    },
    modalConfirm: {
      flex: 1,
      minHeight: 48,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.brand
    }
  });
}
