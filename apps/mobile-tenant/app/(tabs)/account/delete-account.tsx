import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
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
import { AppLoader, ScreenLoader } from "@/components/universal-loading-state";
import { getWithAuth, postWithAuth } from "@/lib/api-client";
import { notifyAccountDeletionChanged } from "@/lib/account-deletion-gate";
import { clearBiometricCredentials } from "@/lib/biometrics";
import type { Tenant } from "@/lib/domain-types";
import { usePreferences } from "@/contexts/preferences-context";
import { fontSize, fontWeight, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

type AccountDeletionStatus = {
  accountStatus: "active" | "pending_deletion" | "deleted";
  deletionRequestedAtIso: string | null;
  scheduledDeletionAtIso: string | null;
  graceDaysRemaining: number | null;
};

type DeletionOutput = {
  deletion: AccountDeletionStatus;
};

type ProfileOutput = {
  tenant: Tenant;
};

function formatScheduledDate(iso: string | null, language: string): string {
  if (!iso) {
    return "";
  }
  try {
    return new Date(iso).toLocaleDateString(language === "en" ? "en-GB" : "fr-FR", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  } catch {
    return iso;
  }
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase();
}

function namesMatch(typed: string, expected: string): boolean {
  if (!expected) {
    return false;
  }
  return normalizeName(typed) === normalizeName(expected);
}

function isEndpointUnavailable(error: string, code: string): boolean {
  if (code === "NOT_FOUND") {
    return true;
  }
  return /invalid api response \(404/i.test(error);
}

export default function DeleteAccountScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { language, setBiometricEnabled } = usePreferences();

  const [status, setStatus] = useState<AccountDeletionStatus | null>(null);
  const [fullName, setFullName] = useState("");
  const [typedName, setTypedName] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [endpointUnavailable, setEndpointUnavailable] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);

  const loadScreen = useCallback(async () => {
    setLoading(true);
    setError(null);
    setEndpointUnavailable(false);

    const [deletionResult, profileResult] = await Promise.all([
      getWithAuth<DeletionOutput>("/api/mobile/auth/delete-account"),
      getWithAuth<ProfileOutput>("/api/mobile/profile")
    ]);

    if (profileResult.success) {
      const tenant = profileResult.data.tenant;
      setFullName((tenant.fullName ?? "").trim());
    }

    if (!deletionResult.success) {
      if (isEndpointUnavailable(deletionResult.error, deletionResult.code)) {
        setEndpointUnavailable(true);
        setStatus({
          accountStatus: "active",
          deletionRequestedAtIso: null,
          scheduledDeletionAtIso: null,
          graceDaysRemaining: null
        });
      } else if (deletionResult.code === "ACCOUNT_PENDING_DELETION") {
        setStatus({
          accountStatus: "pending_deletion",
          deletionRequestedAtIso: null,
          scheduledDeletionAtIso: null,
          graceDaysRemaining: null
        });
      } else {
        setError(deletionResult.error);
      }
      setLoading(false);
      return;
    }

    setStatus(deletionResult.data.deletion);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadScreen();
  }, [loadScreen]);

  async function confirmDelete(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const result = await postWithAuth<DeletionOutput>("/api/mobile/auth/delete-account", {});
      if (!result.success) {
        if (isEndpointUnavailable(result.error, result.code)) {
          setEndpointUnavailable(true);
          setConfirmVisible(false);
        } else {
          setError(result.error);
        }
        return;
      }
      setConfirmVisible(false);
      setTypedName("");
      setStatus(result.data.deletion);
      await clearBiometricCredentials().catch(() => undefined);
      await setBiometricEnabled(false);
      notifyAccountDeletionChanged();
    } finally {
      setBusy(false);
    }
  }

  async function handleCancelDeletion(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const result = await postWithAuth<DeletionOutput>(
        "/api/mobile/auth/delete-account/cancel",
        {}
      );
      if (!result.success) {
        setError(result.error);
        return;
      }
      setStatus(result.data.deletion);
      notifyAccountDeletionChanged();
    } finally {
      setBusy(false);
    }
  }

  const isPending = status?.accountStatus === "pending_deletion";
  const scheduledLabel = formatScheduledDate(status?.scheduledDeletionAtIso ?? null, language);
  const canDelete = !busy && !endpointUnavailable && namesMatch(typedName, fullName);

  if (loading) {
    return (
      <SafeAreaView style={styles.root} edges={["top"]}>
        <ScreenLoader />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root} edges={["top"]}>
      <View style={styles.topBar}>
        <Pressable
          style={styles.backBtn}
          onPress={() => { router.back(); }}
          hitSlop={10}
          disabled={isPending}
        >
          {!isPending ? (
            <Ionicons name="arrow-back" size={22} color={colors.brand} />
          ) : null}
        </Pressable>
        <Text style={styles.topTitle}>{t("deleteAccount.title")}</Text>
        <Pressable
          style={styles.infoBtn}
          onPress={() => { setInfoVisible(true); }}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t("deleteAccount.infoTitle")}
        >
          <Ionicons name="information-circle-outline" size={24} color={colors.brand} />
        </Pressable>
      </View>
      <View style={styles.headerRule} />

      <View style={styles.flex}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <View style={[styles.iconWrap, isPending ? styles.iconWrapPending : null]}>
              <Ionicons
                name={isPending ? "time-outline" : "exit-outline"}
                size={34}
                color={isPending ? colors.warning : colors.brand}
              />
            </View>

            <Text style={styles.heading}>
              {isPending ? t("deleteAccount.pendingTitle") : t("deleteAccount.heading")}
            </Text>
            <Text style={styles.body}>
              {isPending
                ? t("deleteAccount.pendingBody", {
                    date: scheduledLabel || t("deleteAccount.pendingDateFallback"),
                    days: status?.graceDaysRemaining ?? "—"
                  })
                : t("deleteAccount.body")}
            </Text>

            {endpointUnavailable ? (
              <Text style={styles.error}>{t("deleteAccount.endpointUnavailable")}</Text>
            ) : null}
            {error ? <Text style={styles.error}>{error}</Text> : null}

            {isPending ? (
              <Pressable
                style={[styles.primaryBtn, busy ? styles.btnDisabled : null]}
                onPress={() => { void handleCancelDeletion(); }}
                disabled={busy || endpointUnavailable}
              >
                {busy ? (
                  <AppLoader tone="onBrand" />
                ) : (
                  <Text style={styles.primaryBtnText}>{t("deleteAccount.cancelDeletion")}</Text>
                )}
              </Pressable>
            ) : (
              <View style={styles.confirmBlock}>
                <Text style={styles.confirmLabel}>
                  {t("deleteAccount.typeNameLabel", { name: fullName || "…" })}
                </Text>
                <TextInput
                  value={typedName}
                  onChangeText={setTypedName}
                  autoCapitalize="words"
                  autoCorrect={false}
                  editable={!endpointUnavailable && Boolean(fullName)}
                  placeholder={fullName || t("deleteAccount.typeNamePlaceholder")}
                  placeholderTextColor={colors.textFaint}
                  style={styles.input}
                />
                <Pressable
                  style={[styles.dangerBtn, !canDelete ? styles.btnDisabled : null]}
                  onPress={() => { setConfirmVisible(true); }}
                  disabled={!canDelete}
                >
                  <Text style={styles.dangerBtnText}>{t("deleteAccount.deleteAction")}</Text>
                </Pressable>
              </View>
            )}
          </ScrollView>
        </View>

      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!busy) {
            setConfirmVisible(false);
          }
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("deleteAccount.confirmTitle")}</Text>
            <Text style={styles.modalBody}>{t("deleteAccount.confirmBody")}</Text>
            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalConfirm, busy ? styles.btnDisabled : null]}
                onPress={() => { void confirmDelete(); }}
                disabled={busy}
              >
                {busy ? (
                  <AppLoader size="small" tone="onBrand" />
                ) : (
                  <Text style={styles.modalConfirmText}>{t("deleteAccount.confirmAction")}</Text>
                )}
              </Pressable>
              <Pressable
                style={styles.modalCancel}
                onPress={() => { setConfirmVisible(false); }}
                disabled={busy}
              >
                <Text style={styles.modalCancelText}>{t("common.cancel")}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={infoVisible}
        transparent
        animationType="fade"
        onRequestClose={() => { setInfoVisible(false); }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("deleteAccount.infoTitle")}</Text>
            <View style={styles.infoBullets}>
              <Text style={styles.infoBullet}>• {t("deleteAccount.infoAccess")}</Text>
              <Text style={styles.infoBullet}>• {t("deleteAccount.infoLandlord")}</Text>
              <Text style={styles.infoBullet}>• {t("deleteAccount.infoGrace")}</Text>
              <Text style={styles.infoBullet}>• {t("deleteAccount.infoRecover")}</Text>
            </View>
            <Pressable
              style={styles.infoDismiss}
              onPress={() => { setInfoVisible(false); }}
            >
              <Text style={styles.infoDismissText}>{t("deleteAccount.infoGotIt")}</Text>
            </Pressable>
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
    flex: {
      flex: 1
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
    infoBtn: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center"
    },
    headerRule: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border
    },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center"
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 36,
      paddingBottom: 40,
      gap: 12
    },
    iconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: "center",
      justifyContent: "center",
              backgroundColor: colors.brandSoft,
      marginBottom: 8,
      alignSelf: "center"
    },
    iconWrapPending: {
      backgroundColor: colors.backgroundAlt
    },
    heading: {
      fontSize: fontSize.emphasis,
      fontWeight: fontWeight.bold,
      color: colors.text,
      textAlign: "center"
    },
    body: {
      fontSize: fontSize.secondary,
      lineHeight: 22,
      color: colors.textMuted,
      textAlign: "center",
      marginBottom: 8
    },
    confirmBlock: {
      marginTop: 12,
      gap: 10
    },
    confirmLabel: {
      fontSize: fontSize.secondary,
      color: colors.textSecondary,
      lineHeight: 20
    },
    input: {
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 12,
      backgroundColor: colors.inputBg,
      paddingHorizontal: 14,
      minHeight: 48,
      fontSize: fontSize.body,
      color: colors.text
    },
    error: {
      color: colors.danger,
      fontSize: fontSize.secondary,
      lineHeight: 20,
      textAlign: "center"
    },
    dangerBtn: {
      marginTop: 6,
      minHeight: 48,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.danger
    },
    dangerBtnText: {
      color: colors.onBrand,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold
    },
    primaryBtn: {
      marginTop: 16,
      minHeight: 48,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.brand
    },
    primaryBtnText: {
      color: colors.onBrand,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold
    },
    btnDisabled: {
      opacity: 0.45
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
      borderRadius: 16,
      padding: 20,
      gap: 12
    },
    modalTitle: {
      fontSize: fontSize.title,
      fontWeight: fontWeight.bold,
      color: colors.text
    },
    modalBody: {
      fontSize: fontSize.secondary,
      color: colors.textMuted,
      lineHeight: 20
    },
    infoBullets: {
      gap: 10
    },
    infoBullet: {
      fontSize: fontSize.secondary,
      color: colors.textSecondary,
      lineHeight: 20
    },
    infoDismiss: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.brand,
      marginTop: 8
    },
    infoDismissText: {
      color: colors.onBrand,
      fontSize: fontSize.secondary,
      fontWeight: fontWeight.bold
    },
    modalActions: {
      gap: 4,
      marginTop: 8
    },
    modalCancel: {
      alignItems: "center",
      paddingVertical: 12
    },
    modalCancelText: {
      color: colors.textMuted,
      fontSize: fontSize.secondary,
      fontWeight: fontWeight.semibold
    },
    modalConfirm: {
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderRadius: 10,
      backgroundColor: colors.danger
    },
    modalConfirmText: {
      color: colors.onBrand,
      fontSize: fontSize.secondary,
      fontWeight: fontWeight.bold
    }
  });
}
