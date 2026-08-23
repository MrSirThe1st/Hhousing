import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { AppLoader, ScreenLoader } from "@/components/universal-loading-state";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { Tenant } from "@/lib/domain-types";
import type { LeaseWithTenantView } from "@/lib/api-contracts-types";
import { getWithAuth } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { usePreferences } from "@/contexts/preferences-context";
import { ErrorState } from "@/components/error-state";
import {
  authenticateWithBiometrics,
  clearBiometricCredentials,
  getBiometricAvailability,
  saveBiometricCredentials
} from "@/lib/biometrics";
import { formatDrcNationalDisplay, nationalFromStoredPhone, toDrcE164 } from "@/lib/phone-input";
import i18n from "@/i18n";
import { fontWeight, fontSize, spacing, touchTarget, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

type LeaseOutput = {
  lease: LeaseWithTenantView | null;
};
type ProfileOutput = {
  tenant: Tenant;
};

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type LinkRow = {
  key: string;
  label: string;
  hint?: string;
  icon: IoniconName;
  onPress: () => void;
  danger?: boolean;
};

type ResolvePhoneResult =
  | { ok: true; phone: string }
  | { ok: false; reason: "auth" | "missing" | "other"; message: string };

function getInitials(name: string, email: string): string {
  const source = name.trim() || email.trim();
  const parts = source.split(" ").filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
  }
  return (parts[0]?.slice(0, 2) ?? "U").toUpperCase();
}

function getNameFromEmail(email: string): string {
  const localPart = email.split("@")[0] ?? "";
  const normalized = localPart.replace(/[._-]+/g, " ").trim();
  if (!normalized) {
    return i18n.t("common.tenant");
  }

  return normalized
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

function appVersionLabel(): string {
  const version = Constants.expoConfig?.version ?? "1.0.0";
  const build =
    Platform.OS === "ios"
      ? Constants.expoConfig?.ios?.buildNumber
      : Constants.expoConfig?.android?.versionCode?.toString();
  return build ? `V ${version} (${build})` : `V ${version}`;
}

function LinkItem({
  item,
  colors,
  styles,
  showSeparator
}: {
  item: LinkRow;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  showSeparator: boolean;
}): React.ReactElement {
  const iconColor = item.danger ? colors.danger : colors.brand;
  const labelColor = item.danger ? colors.danger : colors.textSecondary;

  return (
    <View>
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={item.onPress}
        accessibilityRole="button"
        accessibilityLabel={item.label}
      >
        <View style={styles.rowIcon}>
          <Ionicons name={item.icon} size={22} color={iconColor} />
        </View>
        <View style={styles.rowCopy}>
          <Text style={[styles.rowLabel, { color: labelColor }]}>{item.label}</Text>
          {item.hint ? <Text style={styles.rowHint}>{item.hint}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.iconMuted} />
      </Pressable>
      {showSeparator ? <View style={styles.separator} /> : null}
    </View>
  );
}

function ToggleItem({
  icon,
  label,
  hint,
  value,
  onValueChange,
  disabled,
  colors,
  styles,
  showSeparator
}: {
  icon: IoniconName;
  label: string;
  hint?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
  disabled?: boolean;
  colors: ThemeColors;
  styles: ReturnType<typeof createStyles>;
  showSeparator: boolean;
}): React.ReactElement {
  return (
    <View>
      <View style={[styles.row, disabled ? styles.rowDisabled : null]}>
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={22} color={colors.brand} />
        </View>
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
      {showSeparator ? <View style={styles.separator} /> : null}
    </View>
  );
}

export default function AccountScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { session, isLoading: isAuthLoading, signOut } = useAuth();
  const {
    biometricEnabled,
    themeMode,
    themeFollowsSystem,
    language,
    amountsSensitive,
    setBiometricEnabled,
    markBiometricPromptShown,
    setThemeMode,
    setAmountsSensitive
  } = usePreferences();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [lease, setLease] = useState<LeaseWithTenantView | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [enablePassword, setEnablePassword] = useState("");
  const [enablePhoneE164, setEnablePhoneE164] = useState<string | null>(null);
  const [enableError, setEnableError] = useState<string | null>(null);

  const isDarkMode = themeMode === "dark";
  const themeHint = themeFollowsSystem
    ? t("settings.themeSystemHint")
    : (isDarkMode ? t("settings.themeDark") : t("settings.themeLight"));
  const languageHint = language === "en" ? t("settings.languageEn") : t("settings.languageFr");

  const loadProfile = useCallback(async (refresh = false): Promise<void> => {
    if (!session?.access_token) {
      setError(t("common.sessionExpired"));
      setIsOffline(false);
      setIsLoading(false);
      setIsRefreshing(false);
      return;
    }

    if (refresh) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    setError(null);
    setIsOffline(false);

    try {
      const [profileResult, leaseResult] = await Promise.all([
        getWithAuth<ProfileOutput>("/api/mobile/profile"),
        getWithAuth<LeaseOutput>("/api/mobile/lease")
      ]);

      if (!leaseResult.success) {
        if (leaseResult.code === "NETWORK_ERROR") {
          setIsOffline(true);
        }
        setLease(null);
      } else {
        setLease(leaseResult.data.lease);
      }

      if (!profileResult.success) {
        if (profileResult.code === "NETWORK_ERROR") {
          setIsOffline(true);
        }
        if (
          profileResult.code === "NOT_FOUND"
          || (profileResult.code === "INTERNAL_ERROR" && profileResult.error.includes("404"))
        ) {
          setTenant(null);
          setError(null);
        } else if (!leaseResult.success) {
          setTenant(null);
          setError(profileResult.error);
        }
      } else {
        setTenant(profileResult.data.tenant);
        setError(null);
      }
    } finally {
      if (refresh) {
        setIsRefreshing(false);
      } else {
        setIsLoading(false);
      }
    }
  }, [session?.access_token, t]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!session?.access_token) {
      setError(t("common.sessionExpired"));
      setIsLoading(false);
      return;
    }

    void loadProfile();
  }, [isAuthLoading, loadProfile, session?.access_token, t]);

  useEffect(() => {
    if (!passwordModalVisible) {
      setEnablePassword("");
      setEnableError(null);
    }
  }, [passwordModalVisible]);

  const handleSignOut = async (): Promise<void> => {
    setIsSigningOut(true);
    await signOut();
  };

  async function resolvePhoneE164(): Promise<ResolvePhoneResult> {
    const result = await getWithAuth<ProfileOutput>("/api/mobile/profile");
    if (!result.success) {
      if (result.code === "UNAUTHORIZED") {
        return { ok: false, reason: "auth", message: t("common.sessionExpired") };
      }
      return { ok: false, reason: "other", message: result.error };
    }

    const stored = result.data.tenant.phone ?? result.data.tenant.phoneNumber ?? null;
    const national = nationalFromStoredPhone(stored);
    if (national.length !== 9) {
      return { ok: false, reason: "missing", message: t("biometric.phoneMissing") };
    }
    return { ok: true, phone: toDrcE164(national) };
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

      const phoneResult = await resolvePhoneE164();
      if (!phoneResult.ok) {
        Alert.alert(t("common.error"), phoneResult.message);
        return;
      }

      setEnablePhoneE164(phoneResult.phone);
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
      await markBiometricPromptShown();
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

  const fallbackEmail = lease?.tenantEmail ?? session?.user.email ?? "";
  const email = tenant?.email ?? fallbackEmail;
  const name = tenant?.fullName?.trim() || lease?.tenantFullName?.trim() || getNameFromEmail(email);
  const phoneRaw = tenant?.phone ?? tenant?.phoneNumber ?? null;
  const phoneLabel = phoneRaw
    ? `+243 ${formatDrcNationalDisplay(nationalFromStoredPhone(phoneRaw))}`
    : null;
  const subtitle = phoneLabel ?? (email || t("common.tenant"));
  const initials = useMemo(() => getInitials(name, email), [email, name]);

  const accountLinks: LinkRow[] = [
    {
      key: "profile",
      label: t("account.profile"),
      icon: "person-outline",
      onPress: () => { router.push("/(tabs)/account/edit-profile"); }
    },
    {
      key: "lease",
      label: t("account.myHome"),
      icon: "home-outline",
      onPress: () => { router.push("/(tabs)/account/lease"); }
    }
  ];

  const preferenceLinks: LinkRow[] = [
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
    }
  ];

  const aboutLinks: LinkRow[] = [
    {
      key: "about",
      label: t("account.about"),
      icon: "information-circle-outline",
      onPress: () => { router.push("/(tabs)/account/about"); }
    },
    {
      key: "support",
      label: t("account.support"),
      icon: "mail-outline",
      onPress: () => { router.push("/(tabs)/account/support"); }
    },
    {
      key: "privacy",
      label: t("account.privacy"),
      icon: "shield-checkmark-outline",
      onPress: () => { router.push("/(tabs)/account/privacy"); }
    },
    {
      key: "terms",
      label: t("account.terms"),
      icon: "document-text-outline",
      onPress: () => { router.push("/(tabs)/account/terms"); }
    }
  ];

  if (isLoading || isAuthLoading) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <ScreenLoader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => { void loadProfile(true); }}
            tintColor={colors.brand}
          />
        }
      >
        <View style={styles.screenHeader}>
          <Text style={styles.screenTitle}>{t("tabs.settings")}</Text>
        </View>

        <Pressable
          style={styles.profileBanner}
          onPress={() => { router.push("/(tabs)/account/edit-profile"); }}
          accessibilityRole="button"
          accessibilityLabel={t("account.profile")}
        >
          <Text style={styles.versionText}>{appVersionLabel()}</Text>
          <View style={styles.bannerRow}>
            <View style={styles.bannerAvatar}>
              <Text style={styles.bannerAvatarText}>{initials}</Text>
            </View>
            <View style={styles.bannerCopy}>
              <Text style={styles.bannerName} numberOfLines={1}>{name}</Text>
              <Text style={styles.bannerSubtitle} numberOfLines={1}>{subtitle}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.onBrand} />
          </View>
        </Pressable>

        {error ? (
          <View style={styles.errorWrap}>
            <ErrorState
              offline={isOffline}
              error={error}
              onRetry={() => { void loadProfile(); }}
            />
          </View>
        ) : null}

        <Text style={styles.sectionTitle}>{t("account.sectionAccount")}</Text>
        <View style={styles.sectionCard}>
          {accountLinks.map((item, index) => (
            <LinkItem
              key={item.key}
              item={item}
              colors={colors}
              styles={styles}
              showSeparator={index < accountLinks.length - 1}
            />
          ))}
        </View>

        <Text style={styles.sectionTitle}>{t("account.sectionPreferences")}</Text>
        <View style={styles.sectionCard}>
          {preferenceLinks.map((item, index) => (
            <LinkItem
              key={item.key}
              item={item}
              colors={colors}
              styles={styles}
              showSeparator
            />
          ))}
          <ToggleItem
            icon="finger-print-outline"
            label={t("settings.biometric")}
            hint={t("settings.biometricHint")}
            value={biometricEnabled}
            onValueChange={handleBiometricToggle}
            disabled={biometricBusy}
            colors={colors}
            styles={styles}
            showSeparator
          />
          <ToggleItem
            icon="eye-off-outline"
            label={t("settings.amountsSensitive")}
            hint={t("settings.amountsSensitiveHint")}
            value={amountsSensitive}
            onValueChange={(next) => { void setAmountsSensitive(next); }}
            colors={colors}
            styles={styles}
            showSeparator
          />
          <ToggleItem
            icon={isDarkMode ? "moon-outline" : "sunny-outline"}
            label={t("settings.appearance")}
            hint={themeHint}
            value={isDarkMode}
            onValueChange={(next) => { void setThemeMode(next ? "dark" : "light"); }}
            colors={colors}
            styles={styles}
            showSeparator={false}
          />
        </View>

        <Text style={styles.sectionTitle}>{t("account.sectionAbout")}</Text>
        <View style={styles.sectionCard}>
          {aboutLinks.map((item, index) => (
            <LinkItem
              key={item.key}
              item={item}
              colors={colors}
              styles={styles}
              showSeparator={index < aboutLinks.length - 1}
            />
          ))}
        </View>

        <View style={styles.actionsBlock}>
          <Pressable
            style={({ pressed }) => [
              styles.signOutButton,
              pressed && styles.signOutButtonPressed,
              isSigningOut && styles.buttonDisabled
            ]}
            onPress={() => { void handleSignOut(); }}
            disabled={isSigningOut}
            accessibilityRole="button"
            accessibilityLabel={t("account.signOut")}
          >
            {isSigningOut ? (
              <AppLoader size="small" />
            ) : (
              <>
                <Ionicons name="log-out-outline" size={20} color={colors.danger} />
                <Text style={styles.signOutLabel}>{t("account.signOut")}</Text>
              </>
            )}
          </Pressable>

          <Pressable
            style={styles.deleteLink}
            onPress={() => { router.push("/(tabs)/account/delete-account"); }}
            accessibilityRole="button"
            accessibilityLabel={t("settings.deleteAccount")}
          >
            <Text style={styles.deleteLinkText}>{t("settings.deleteAccount")}</Text>
          </Pressable>
        </View>
      </ScrollView>

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
                  <AppLoader size="small" tone="onBrand" />
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
      backgroundColor: colors.backgroundAlt
    },
    container: { flex: 1 },
    content: {
      paddingBottom: 48
    },
    screenHeader: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
      backgroundColor: colors.background
    },
    screenTitle: {
      fontSize: fontSize.title,
      fontWeight: fontWeight.semibold,
      color: colors.text
    },
    profileBanner: {
      backgroundColor: colors.brand,
      paddingTop: spacing.lg,
      paddingBottom: spacing.lg,
      paddingHorizontal: spacing.md,
      position: "relative"
    },
    versionText: {
      position: "absolute",
      top: 10,
      right: 14,
      color: "rgba(255,255,255,0.75)",
      fontSize: fontSize.caption,
      fontWeight: "500",
      zIndex: 1
    },
    bannerRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.sm
    },
    bannerAvatar: {
      width: 56,
      height: 56,
      borderRadius: 28,
      backgroundColor: "rgba(255,255,255,0.2)",
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.55)",
      justifyContent: "center",
      alignItems: "center"
    },
    bannerAvatarText: {
      color: colors.onBrand,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold
    },
    bannerCopy: {
      flex: 1,
      gap: 2,
      paddingRight: spacing.xs
    },
    bannerName: {
      color: colors.onBrand,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold
    },
    bannerSubtitle: {
      color: "rgba(255,255,255,0.85)",
      fontSize: fontSize.secondary
    },
    errorWrap: {
      paddingHorizontal: spacing.md,
      paddingTop: spacing.sm
    },
    sectionTitle: {
      marginTop: spacing.lg,
      marginBottom: spacing.xs,
      marginHorizontal: spacing.lg,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: colors.textFaint,
      letterSpacing: 0.4,
      textTransform: "uppercase"
    },
    sectionCard: {
      marginHorizontal: spacing.md,
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      overflow: "hidden"
    },
    row: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: spacing.md,
      paddingVertical: 14,
      minHeight: touchTarget,
      backgroundColor: colors.surface
    },
    rowPressed: {
      backgroundColor: colors.backgroundAlt
    },
    rowDisabled: {
      opacity: 0.55
    },
    rowIcon: {
      width: 24,
      alignItems: "center",
      justifyContent: "center"
    },
    rowCopy: {
      flex: 1,
      gap: 3,
      paddingRight: 4
    },
    rowLabel: {
      fontSize: fontSize.body,
      lineHeight: 22,
      color: colors.textSecondary,
      fontWeight: fontWeight.medium
    },
    rowHint: {
      fontSize: fontSize.caption,
      lineHeight: 18,
      color: colors.textFaint
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: 54
    },
    actionsBlock: {
      marginTop: spacing.xl,
      marginHorizontal: spacing.md,
      gap: spacing.sm,
      alignItems: "center"
    },
    signOutButton: {
      width: "100%",
      minHeight: touchTarget,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.danger,
      backgroundColor: colors.surface,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.xs
    },
    signOutButtonPressed: {
      backgroundColor: colors.backgroundAlt
    },
    signOutLabel: {
      fontSize: fontSize.body,
      color: colors.danger,
      fontWeight: fontWeight.semibold
    },
    deleteLink: {
      minHeight: touchTarget,
      paddingHorizontal: spacing.md,
      alignItems: "center",
      justifyContent: "center"
    },
    deleteLinkText: {
      fontSize: fontSize.secondary,
      color: colors.textFaint,
      fontWeight: fontWeight.medium,
      textDecorationLine: "underline"
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
