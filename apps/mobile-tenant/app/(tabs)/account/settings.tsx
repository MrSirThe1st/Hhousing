import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { usePreferences } from "@/contexts/preferences-context";
import { getWithAuth } from "@/lib/api-client";
import {
  authenticateWithBiometrics,
  clearBiometricCredentials,
  getBiometricAvailability,
  saveBiometricCredentials
} from "@/lib/biometrics";
import { toDrcE164, nationalFromStoredPhone } from "@/lib/phone-input";
import type { Tenant } from "@/lib/domain-types";
import { fontWeight, fontSize, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type SettingLink = {
  key: string;
  label: string;
  hint?: string;
  icon: IoniconName;
  onPress: () => void;
};

type ToggleRowProps = {
  icon: IoniconName;
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
};

type ProfileOutput = {
  tenant: Tenant;
};

function ToggleRow({
  icon,
  label,
  hint,
  value,
  onValueChange,
  disabled,
  colors,
  styles
}: ToggleRowProps): React.ReactElement {
  return (
    <View style={[styles.row, disabled ? styles.rowDisabled : null]}>
      <Ionicons name={icon} size={22} color={colors.brand} />
      <View style={styles.rowCopy}>
        <Text style={styles.rowLabel}>{label}</Text>
        {hint ? <Text style={styles.rowHint}>{hint}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: colors.switchTrackOff, true: colors.switchTrackOn }}
        thumbColor={value ? colors.brand : colors.switchThumbOff}
      />
    </View>
  );
}

export default function SettingsScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const {
    biometricEnabled,
    themeMode,
    language,
    amountsSensitive,
    setBiometricEnabled,
    setThemeMode,
    setAmountsSensitive
  } = usePreferences();
  const isDarkMode = themeMode === "dark";
  const languageHint = language === "en" ? t("settings.languageEn") : t("settings.languageFr");

  const [biometricBusy, setBiometricBusy] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [enablePassword, setEnablePassword] = useState("");
  const [enablePhoneE164, setEnablePhoneE164] = useState<string | null>(null);
  const [enableError, setEnableError] = useState<string | null>(null);

  const links: SettingLink[] = [
    {
      key: "password",
      label: t("settings.changePassword"),
      icon: "lock-closed-outline",
      onPress: () => { router.push("/(tabs)/account/change-password"); }
    },
    {
      key: "notifications",
      label: t("settings.notifications"),
      icon: "notifications-outline",
      onPress: () => { router.push("/(tabs)/account/notifications"); }
    },
    {
      key: "language",
      label: t("settings.language"),
      hint: languageHint,
      icon: "language-outline",
      onPress: () => { router.push("/(tabs)/account/language"); }
    },
    {
      key: "delete-account",
      label: t("settings.deleteAccount"),
      hint: t("settings.deleteAccountHint"),
      icon: "trash-outline",
      onPress: () => { router.push("/(tabs)/account/delete-account"); }
    }
  ];

  useEffect(() => {
    if (!passwordModalVisible) {
      setEnablePassword("");
      setEnableError(null);
    }
  }, [passwordModalVisible]);

  async function resolvePhoneE164(): Promise<string | null> {
    const result = await getWithAuth<ProfileOutput>("/api/mobile/profile");
    if (!result.success) {
      return null;
    }

    const stored = result.data.tenant.phone ?? result.data.tenant.phoneNumber ?? null;
    const national = nationalFromStoredPhone(stored);
    if (national.length !== 9) {
      return null;
    }
    return toDrcE164(national);
  }

  async function handleDisableBiometric(): Promise<void> {
    setBiometricBusy(true);
    try {
      await clearBiometricCredentials();
      await setBiometricEnabled(false);
    } finally {
      setBiometricBusy(false);
    }
  }

  async function handleEnableBiometric(): Promise<void> {
    setBiometricBusy(true);
    try {
      const availability = await getBiometricAvailability();
      if (!availability.hardware) {
        Alert.alert(t("common.info"), t("biometric.unavailable"));
        return;
      }
      if (!availability.enrolled) {
        Alert.alert(t("common.info"), t("biometric.notEnrolled"));
        return;
      }

      const auth = await authenticateWithBiometrics(t("biometric.enablePrompt"));
      if (!auth.success) {
        return;
      }

      const phone = await resolvePhoneE164();
      if (!phone) {
        Alert.alert(t("common.error"), t("biometric.phoneMissing"));
        return;
      }

      setEnablePhoneE164(phone);
      setPasswordModalVisible(true);
    } finally {
      setBiometricBusy(false);
    }
  }

  async function confirmEnableWithPassword(): Promise<void> {
    if (!enablePhoneE164) {
      setEnableError(t("biometric.phoneMissing"));
      return;
    }
    if (enablePassword.length < 8) {
      setEnableError(t("auth.passwordTooShort"));
      return;
    }

    setBiometricBusy(true);
    setEnableError(null);
    try {
      await saveBiometricCredentials({
        phone: enablePhoneE164,
        password: enablePassword
      });
      await setBiometricEnabled(true);
      setPasswordModalVisible(false);
    } catch {
      setEnableError(t("biometric.enableFailed"));
    } finally {
      setBiometricBusy(false);
    }
  }

  function handleBiometricToggle(next: boolean): void {
    if (biometricBusy) {
      return;
    }
    if (next) {
      void handleEnableBiometric();
      return;
    }
    void handleDisableBiometric();
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => { router.back(); }} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={colors.brand} />
        </Pressable>
        <Text style={styles.topTitle}>{t("settings.title")}</Text>
        <View style={styles.topSpacer} />
      </View>
      <View style={styles.headerRule} />

      <View style={styles.list}>
        {links.map((row, index) => (
          <View key={row.key}>
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={row.onPress}
            >
              <Ionicons name={row.icon} size={22} color={colors.brand} />
              <View style={styles.rowCopy}>
                <Text style={styles.rowLabel}>{row.label}</Text>
                {row.hint ? <Text style={styles.rowHint}>{row.hint}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.iconMuted} />
            </Pressable>
            {index < links.length - 1 ? <View style={styles.separator} /> : null}
          </View>
        ))}

        <View style={styles.separator} />
        <ToggleRow
          icon="finger-print-outline"
          label={t("settings.biometric")}
          hint={t("settings.biometricHint")}
          value={biometricEnabled}
          onValueChange={handleBiometricToggle}
          disabled={biometricBusy}
          colors={colors}
          styles={styles}
        />
        <View style={styles.separator} />
        <ToggleRow
          icon="eye-off-outline"
          label={t("settings.amountsSensitive")}
          hint={t("settings.amountsSensitiveHint")}
          value={amountsSensitive}
          onValueChange={(next) => { void setAmountsSensitive(next); }}
          colors={colors}
          styles={styles}
        />
        <View style={styles.separator} />
        <ToggleRow
          icon={isDarkMode ? "moon-outline" : "sunny-outline"}
          label={t("settings.darkMode")}
          hint={isDarkMode ? t("settings.themeDark") : t("settings.themeLight")}
          value={isDarkMode}
          onValueChange={(next) => { void setThemeMode(next ? "dark" : "light"); }}
          colors={colors}
          styles={styles}
        />
      </View>

      <Modal
        visible={passwordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setPasswordModalVisible(false); }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("biometric.confirmPasswordTitle")}</Text>
            <Text style={styles.modalBody}>{t("biometric.confirmPasswordBody")}</Text>
            <TextInput
              value={enablePassword}
              onChangeText={setEnablePassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholder={t("auth.passwordPlaceholder")}
              placeholderTextColor={colors.textFaint}
              style={styles.modalInput}
            />
            {enableError ? <Text style={styles.modalError}>{enableError}</Text> : null}
            <View style={styles.modalActions}>
              <Pressable
                style={styles.modalCancel}
                onPress={() => { setPasswordModalVisible(false); }}
                disabled={biometricBusy}
              >
                <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
              </Pressable>
              <Pressable
                style={[styles.modalConfirm, biometricBusy ? styles.buttonDisabled : null]}
                onPress={() => { void confirmEnableWithPassword(); }}
                disabled={biometricBusy}
              >
                {biometricBusy ? (
                  <ActivityIndicator size="small" color={colors.onBrand} />
                ) : (
                  <Text style={styles.modalConfirmText}>{t("common.confirm")}</Text>
                )}
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
    rowDisabled: {
      opacity: 0.55
    },
    rowCopy: {
      flex: 1,
      gap: 2
    },
    rowLabel: {
      flex: 1,
      fontSize: fontSize.body,
      color: colors.textSecondary,
      fontWeight: "500"
    },
    rowHint: {
      fontSize: fontSize.caption,
      color: colors.textFaint
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: 56
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
    modalError: {
      color: colors.danger,
      fontSize: fontSize.secondary
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
    },
    buttonDisabled: {
      opacity: 0.65
    }
  });
}
