import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import { getWithAuth, postWithAuth } from "@/lib/api-client";
import { notifyAccountDeletionChanged } from "@/lib/account-deletion-gate";
import { clearBiometricCredentials } from "@/lib/biometrics";
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

export default function DeleteAccountScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { language, setBiometricEnabled } = usePreferences();

  const [status, setStatus] = useState<AccountDeletionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getWithAuth<DeletionOutput>("/api/mobile/auth/delete-account");
    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }
    setStatus(result.data.deletion);
    setLoading(false);
  }, []);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function confirmDelete(): Promise<void> {
    setBusy(true);
    setError(null);
    try {
      const result = await postWithAuth<DeletionOutput>("/api/mobile/auth/delete-account", {});
      if (!result.success) {
        setError(result.error);
        return;
      }
      setStatus(result.data.deletion);
      await clearBiometricCredentials().catch(() => undefined);
      await setBiometricEnabled(false);
      notifyAccountDeletionChanged();
    } finally {
      setBusy(false);
    }
  }

  function handleDeletePress(): void {
    Alert.alert(
      t("deleteAccount.confirmTitle"),
      t("deleteAccount.confirmBody"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("deleteAccount.confirmAction"),
          style: "destructive",
          onPress: () => { void confirmDelete(); }
        }
      ]
    );
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
      Alert.alert(t("common.info"), t("deleteAccount.cancelledBody"));
    } finally {
      setBusy(false);
    }
  }

  const isPending = status?.accountStatus === "pending_deletion";
  const scheduledLabel = formatScheduledDate(status?.scheduledDeletionAtIso ?? null, language);

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
        <View style={styles.topSpacer} />
      </View>
      <View style={styles.headerRule} />

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.brand} />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Ionicons
              name={isPending ? "time-outline" : "trash-outline"}
              size={32}
              color={isPending ? colors.warning : colors.danger}
            />
          </View>

          <Text style={styles.heading}>
            {isPending ? t("deleteAccount.pendingTitle") : t("deleteAccount.heading")}
          </Text>
          <Text style={styles.body}>
            {isPending
              ? t("deleteAccount.pendingBody", {
                  date: scheduledLabel,
                  days: status?.graceDaysRemaining ?? 0
                })
              : t("deleteAccount.body")}
          </Text>

          <View style={styles.bullets}>
            <Text style={styles.bullet}>{t("deleteAccount.bulletAccess")}</Text>
            <Text style={styles.bullet}>{t("deleteAccount.bulletLandlord")}</Text>
            <Text style={styles.bullet}>{t("deleteAccount.bulletGrace")}</Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          {isPending ? (
            <Pressable
              style={[styles.primaryBtn, busy ? styles.btnDisabled : null]}
              onPress={() => { void handleCancelDeletion(); }}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.onBrand} />
              ) : (
                <Text style={styles.primaryBtnText}>{t("deleteAccount.cancelDeletion")}</Text>
              )}
            </Pressable>
          ) : (
            <Pressable
              style={[styles.dangerBtn, busy ? styles.btnDisabled : null]}
              onPress={handleDeletePress}
              disabled={busy}
            >
              {busy ? (
                <ActivityIndicator color={colors.onBrand} />
              ) : (
                <Text style={styles.dangerBtnText}>{t("deleteAccount.deleteAction")}</Text>
              )}
            </Pressable>
          )}
        </View>
      )}
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
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center"
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 28,
      gap: 14
    },
    iconWrap: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.backgroundAlt,
      marginBottom: 4
    },
    heading: {
      fontSize: fontSize.title,
      fontWeight: fontWeight.bold,
      color: colors.text
    },
    body: {
      fontSize: fontSize.secondary,
      lineHeight: 22,
      color: colors.textMuted
    },
    bullets: {
      gap: 8,
      marginTop: 4,
      marginBottom: 8
    },
    bullet: {
      fontSize: fontSize.secondary,
      lineHeight: 20,
      color: colors.textSecondary
    },
    error: {
      color: colors.danger,
      fontSize: fontSize.secondary
    },
    dangerBtn: {
      marginTop: 8,
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
      marginTop: 8,
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
      opacity: 0.65
    }
  });
}
