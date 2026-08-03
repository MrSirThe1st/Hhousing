import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { Tenant } from "@/lib/domain-types";
import type { ApiResult } from "@/lib/api-client";
import type { LeaseWithTenantView } from "@/lib/api-contracts-types";
import { getWithAuth, patchWithAuth } from "@/lib/api-client";
import { AppLoader, ScreenLoader } from "@/components/universal-loading-state";
import { useAuth } from "@/contexts/auth-context";
import { ErrorState } from "@/components/error-state";
import {
  extractDrcNationalNumber,
  formatDrcNationalDisplay,
  nationalFromStoredPhone,
  toDrcE164,
  validateDrcPhoneInput
} from "@/lib/phone-input";
import { fontWeight, fontSize, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

type ProfileOutput = { tenant: Tenant };
type LeaseOutput = { lease: LeaseWithTenantView | null };

export default function EditProfileScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { session, isLoading: isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    if (!session?.access_token) {
      setError(t("common.sessionExpired"));
      setIsOffline(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const [profileResult, leaseResult] = await Promise.all([
      getWithAuth<ProfileOutput>("/api/mobile/profile"),
      getWithAuth<LeaseOutput>("/api/mobile/lease")
    ]);

    if (profileResult.success) {
      setIsOffline(false);
      setTenant(profileResult.data.tenant);
      setFullName(profileResult.data.tenant.fullName ?? "");
      setPhone(nationalFromStoredPhone(profileResult.data.tenant.phone));
      setWhatsappOptIn(Boolean(profileResult.data.tenant.whatsappOptIn));
      setError(null);
    } else {
      const profileUnavailable = profileResult.code === "NOT_FOUND" || (profileResult.code === "INTERNAL_ERROR" && profileResult.error.includes("404"));

      if (profileUnavailable && leaseResult.success && leaseResult.data.lease) {
        const lease = leaseResult.data.lease;
        const derivedTenant: Tenant = {
          id: lease.tenantId,
          organizationId: lease.organizationId,
          fullName: lease.tenantFullName ?? "",
          email: lease.tenantEmail ?? session.user.email ?? "",
          phone: ""
        };

        setTenant(derivedTenant);
        setFullName(derivedTenant.fullName ?? "");
        setPhone("");
        setError(null);
        setIsOffline(false);
      } else {
        if (profileResult.code === "NETWORK_ERROR" || (!leaseResult.success && leaseResult.code === "NETWORK_ERROR")) {
          setIsOffline(true);
        }
        setError(profileResult.error);
      }
    }

    setIsLoading(false);
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

    void load();
  }, [isAuthLoading, load, session?.access_token, t]);

  const handleSave = useCallback(async (): Promise<void> => {
    if (!fullName.trim()) {
      Alert.alert(t("common.error"), t("account.fullNameRequired"));
      return;
    }

    const phoneError = validateDrcPhoneInput(phone);
    if (phoneError) {
      Alert.alert(t("common.error"), phoneError);
      return;
    }

    setIsSaving(true);
    const result: ApiResult<ProfileOutput> = await patchWithAuth<ProfileOutput>("/api/mobile/profile", {
      fullName: fullName.trim(),
      phone: toDrcE164(phone),
      whatsappOptIn
    });
    setIsSaving(false);

    if (!result.success) {
      const profileUnavailable = result.code === "NOT_FOUND" || (result.code === "INTERNAL_ERROR" && result.error.includes("404"));
      if (profileUnavailable) {
        Alert.alert(t("account.profileUnavailableTitle"), t("account.profileUnavailableBody"));
      } else {
        Alert.alert(t("common.error"), result.error);
      }
    } else {
      setTenant(result.data.tenant);
      router.back();
    }
  }, [fullName, phone, whatsappOptIn, router, t]);

  if (isLoading || isAuthLoading) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <ScreenLoader />
      </SafeAreaView>
    );
  }

  if (error || !tenant) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loadingWrap}>
          <ErrorState
            offline={isOffline}
            error={error ?? t("account.profileNotFound")}
            onRetry={() => { void load(); }}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => { router.back(); }} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={colors.brand} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.flex} contentContainerStyle={styles.content}>
        <View style={styles.field}>
          <Text style={styles.label}>{t("account.fullName")}</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={16} color={colors.textMuted} />
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
              autoCapitalize="words"
              autoCorrect={false}
              placeholder={t("account.fullNamePlaceholder")}
              placeholderTextColor={colors.textFaint}
              maxFontSizeMultiplier={1.15}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t("account.phone")}</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="call-outline" size={16} color={colors.textMuted} />
            <Text style={styles.prefix}>+243</Text>
            <TextInput
              value={formatDrcNationalDisplay(phone)}
              onChangeText={(nextValue) => setPhone(extractDrcNationalNumber(nextValue))}
              style={styles.input}
              keyboardType="phone-pad"
              autoCorrect={false}
              placeholder="990 000 000"
              placeholderTextColor={colors.textFaint}
              maxLength={11}
              maxFontSizeMultiplier={1.15}
            />
          </View>
          <Text style={styles.hint}>{t("account.phoneHint")}</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>{t("account.emailReadonly")}</Text>
          <View style={[styles.inputWrap, styles.readonlyField]}>
            <Ionicons name="mail-outline" size={16} color={colors.iconMuted} />
            <Text style={styles.readonlyValue} numberOfLines={1} ellipsizeMode="tail">
              {tenant.email ?? "—"}
            </Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footerActions}>
        <Pressable
          style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
          onPress={() => { void handleSave(); }}
          disabled={isSaving}
        >
          {isSaving
            ? <AppLoader tone="onBrand" size="small" />
            : <Text style={styles.saveBtnText}>{t("account.saveChanges")}</Text>}
        </Pressable>

        <Pressable style={styles.cancelBtn} onPress={() => { router.back(); }}>
          <Text style={styles.cancelBtnText}>{t("common.cancel")}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.backgroundAlt
    },
    flex: { flex: 1 },
    loadingWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16
    },
    topBar: {
      minHeight: 48,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
      paddingHorizontal: 12,
      justifyContent: "center"
    },
    backBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center"
    },
    content: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 20,
      gap: 12
    },
    notice: {
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 10
    },
    errorText: { color: colors.danger, fontSize: fontSize.secondary },
    retryBtn: {
      alignSelf: "flex-start",
      borderRadius: 8,
      backgroundColor: colors.brand,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    retryBtnText: { color: colors.onBrand, fontWeight: "600", fontSize: fontSize.secondary },
    field: { gap: 6 },
    label: {
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
      color: colors.textMuted,
      textTransform: "uppercase"
    },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      backgroundColor: colors.inputBg,
      minHeight: 44,
      paddingHorizontal: 10
    },
    prefix: {
      color: colors.text,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold
    },
    input: {
      flex: 1,
      fontSize: fontSize.body,
      color: colors.text,
      paddingVertical: 0,
      fontWeight: fontWeight.regular
    },
    hint: {
      color: colors.textFaint,
      fontSize: fontSize.caption
    },
    readonlyField: {
      backgroundColor: colors.readonlyBg
    },
    readonlyValue: {
      flex: 1,
      fontSize: fontSize.body,
      color: colors.textFaint,
      fontWeight: fontWeight.regular
    },
    footerActions: {
      borderTopWidth: 1,
      borderTopColor: colors.borderStrong,
      paddingHorizontal: 12,
      paddingVertical: 10,
      gap: 8,
      backgroundColor: colors.backgroundAlt
    },
    saveBtn: {
      borderRadius: 10,
      backgroundColor: colors.brand,
      paddingVertical: 12,
      alignItems: "center"
    },
    saveBtnDisabled: { backgroundColor: colors.brandMuted },
    saveBtnText: {
      color: colors.onBrand,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold
    },
    cancelBtn: {
      alignItems: "center",
      justifyContent: "center",
      minHeight: 34
    },
    cancelBtnText: {
      color: colors.textMuted,
      fontSize: fontSize.secondary,
      fontWeight: fontWeight.medium
    }
  });
}
