import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/auth-context";
import { useBiometricLock } from "@/contexts/biometric-lock-context";
import { fontSize, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

export function BiometricLockScreen(): React.ReactElement | null {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { isLocked, isAuthenticating, lastError, unlock, unlockWithPassword, clearLastError } =
    useBiometricLock();
  const { signOut } = useAuth();
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLocked) {
      setPasswordModalVisible(false);
      setPassword("");
      setPasswordError(null);
    }
  }, [isLocked]);

  if (!isLocked) {
    return null;
  }

  async function handlePasswordUnlock(): Promise<void> {
    const error = await unlockWithPassword(password);
    if (error) {
      setPasswordError(error);
      return;
    }
    setPasswordModalVisible(false);
    setPassword("");
    setPasswordError(null);
  }

  return (
    <View style={styles.root} accessibilityViewIsModal>
      <View style={styles.content}>
        <Image
          source={require("../../assets/icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.title}>{t("common.appName")}</Text>
        <Text style={styles.subtitle}>{t("biometric.lockTitle")}</Text>

        {lastError ? <Text style={styles.error}>{lastError}</Text> : null}

        <Pressable
          style={[styles.button, isAuthenticating ? styles.buttonDisabled : null]}
          onPress={() => {
            clearLastError();
            void unlock();
          }}
          disabled={isAuthenticating}
        >
          {isAuthenticating && !passwordModalVisible ? (
            <ActivityIndicator size="small" color={colors.onBrand} />
          ) : (
            <>
              <Ionicons name="finger-print-outline" size={22} color={colors.onBrand} />
              <Text style={styles.buttonText}>{t("biometric.unlockCta")}</Text>
            </>
          )}
        </Pressable>

        <Pressable
          style={styles.secondary}
          onPress={() => {
            clearLastError();
            setPasswordError(null);
            setPasswordModalVisible(true);
          }}
          disabled={isAuthenticating}
        >
          <Text style={styles.secondaryText}>{t("biometric.usePassword")}</Text>
        </Pressable>

        <Pressable
          style={styles.secondary}
          onPress={() => {
            void signOut();
          }}
          disabled={isAuthenticating}
        >
          <Text style={styles.signOutText}>{t("account.signOut")}</Text>
        </Pressable>
      </View>

      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setPasswordModalVisible(false); }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("biometric.passwordUnlockTitle")}</Text>
            <Text style={styles.modalBody}>{t("biometric.passwordUnlockBody")}</Text>
            <TextInput
              value={password}
              onChangeText={(next) => {
                setPassword(next);
                setPasswordError(null);
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
              placeholder={t("auth.passwordPlaceholder")}
              placeholderTextColor={colors.textFaint}
              style={styles.modalInput}
              onSubmitEditing={() => { void handlePasswordUnlock(); }}
            />
            {passwordError ? <Text style={styles.error}>{passwordError}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => { setPasswordModalVisible(false); }}
                disabled={isAuthenticating}
              >
                <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirm, isAuthenticating ? styles.buttonDisabled : null]}
                onPress={() => { void handlePasswordUnlock(); }}
                disabled={isAuthenticating}
              >
                {isAuthenticating ? (
                  <ActivityIndicator size="small" color={colors.onBrand} />
                ) : (
                  <Text style={styles.modalConfirmText}>{t("biometric.unlockCta")}</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      ...StyleSheet.absoluteFillObject,
      zIndex: 1000,
      backgroundColor: colors.backgroundAlt,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24
    },
    content: {
      width: "100%",
      maxWidth: 360,
      alignItems: "center",
      gap: 12
    },
    logo: {
      width: 72,
      height: 72,
      marginBottom: 4
    },
    title: {
      color: colors.brand,
      fontSize: fontSize.display,
      fontWeight: "700"
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: fontSize.title,
      textAlign: "center",
      marginBottom: 8,
      lineHeight: 24
    },
    error: {
      color: colors.danger,
      fontSize: fontSize.secondary,
      textAlign: "center"
    },
    button: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      width: "100%",
      minHeight: 56,
      borderRadius: 10,
      backgroundColor: colors.brand,
      marginTop: 8
    },
    buttonDisabled: {
      opacity: 0.65
    },
    buttonText: {
      color: colors.onBrand,
      fontSize: fontSize.emphasis,
      fontWeight: "700"
    },
    secondary: {
      paddingVertical: 10,
      paddingHorizontal: 16
    },
    secondaryText: {
      color: colors.brand,
      fontSize: fontSize.secondary,
      fontWeight: "600"
    },
    signOutText: {
      color: colors.textMuted,
      fontSize: fontSize.secondary,
      fontWeight: "500"
    },
    modalBackdrop: {
      flex: 1,
      backgroundColor: colors.overlay,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 24
    },
    modalCard: {
      width: "100%",
      maxWidth: 400,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 20,
      gap: 12
    },
    modalTitle: {
      fontSize: fontSize.title,
      fontWeight: "700",
      color: colors.text
    },
    modalBody: {
      fontSize: fontSize.secondary,
      color: colors.textMuted,
      lineHeight: 20
    },
    modalInput: {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      backgroundColor: colors.inputBg,
      paddingHorizontal: 12,
      minHeight: 48,
      fontSize: fontSize.body,
      color: colors.text
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 10,
      marginTop: 4
    },
    modalCancel: {
      paddingHorizontal: 14,
      paddingVertical: 12
    },
    modalCancelText: {
      color: colors.textMuted,
      fontSize: fontSize.secondary,
      fontWeight: "600"
    },
    modalConfirm: {
      minWidth: 96,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.brand
    },
    modalConfirmText: {
      color: colors.onBrand,
      fontSize: fontSize.secondary,
      fontWeight: "700"
    }
  });
}
