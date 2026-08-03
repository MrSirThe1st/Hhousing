import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useTranslation } from "react-i18next";
import type { Tenant } from "@/lib/domain-types";
import type { LeaseWithTenantView } from "@/lib/api-contracts-types";
import { getWithAuth } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { NetworkError } from "@/components/network-error";
import { formatDrcNationalDisplay, nationalFromStoredPhone } from "@/lib/phone-input";
import i18n from "@/i18n";
import { fontWeight, fontSize, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

type LeaseOutput = {
  lease: LeaseWithTenantView | null;
};
type ProfileOutput = {
  tenant: Tenant;
};

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type MenuItem = {
  key: string;
  label: string;
  icon: IoniconName;
  onPress: () => void;
  danger?: boolean;
};

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

async function openRateUs(): Promise<void> {
  const iosUrl = "https://apps.apple.com/app/id0000000000";
  const androidUrl = "https://play.google.com/store/apps/details?id=com.hhousing.tenant";
  const url = Platform.OS === "ios" ? iosUrl : androidUrl;

  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen && !url.includes("id0000000000")) {
      await Linking.openURL(url);
      return;
    }
  } catch {
    // Fall through to upcoming message.
  }

  Alert.alert(i18n.t("account.rateComingSoonTitle"), i18n.t("account.rateComingSoonBody"));
}

export default function AccountScreen(): React.ReactElement {
  const router = useRouter();
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { session, isLoading: isAuthLoading, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [lease, setLease] = useState<LeaseWithTenantView | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

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

  const handleSignOut = async (): Promise<void> => {
    setIsSigningOut(true);
    await signOut();
  };

  const fallbackEmail = lease?.tenantEmail ?? session?.user.email ?? "";
  const email = tenant?.email ?? fallbackEmail;
  const name = tenant?.fullName?.trim() || lease?.tenantFullName?.trim() || getNameFromEmail(email);
  const phoneRaw = tenant?.phone ?? tenant?.phoneNumber ?? null;
  const phoneLabel = phoneRaw
    ? `+243 ${formatDrcNationalDisplay(nationalFromStoredPhone(phoneRaw))}`
    : null;
  const subtitle = phoneLabel ?? (email || t("common.tenant"));

  const initials = useMemo(() => getInitials(name, email), [email, name]);

  const menuItems: MenuItem[] = [
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
    },
    {
      key: "terms",
      label: t("account.terms"),
      icon: "document-text-outline",
      onPress: () => { router.push("/(tabs)/account/terms"); }
    },
    {
      key: "settings",
      label: t("account.settings"),
      icon: "settings-outline",
      onPress: () => { router.push("/(tabs)/account/settings"); }
    },
    {
      key: "about",
      label: t("account.about"),
      icon: "information-circle-outline",
      onPress: () => { router.push("/(tabs)/account/about"); }
    },
    {
      key: "rate",
      label: t("account.rateApp"),
      icon: "star-outline",
      onPress: () => { void openRateUs(); }
    }
  ];

  if (isLoading || isAuthLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.brand} />
        </View>
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
        <Pressable
          style={styles.profileBanner}
          onPress={() => { router.push("/(tabs)/account/edit-profile"); }}
        >
          <Text style={styles.versionText}>{appVersionLabel()}</Text>
          <View style={styles.bannerRow}>
            <View style={styles.bannerMain}>
              <View style={styles.bannerAvatar}>
                <Text style={styles.bannerAvatarText}>{initials}</Text>
              </View>
              <View style={styles.bannerCopy}>
                <Text style={styles.bannerName} numberOfLines={1}>{name}</Text>
                <Text style={styles.bannerSubtitle} numberOfLines={1}>{subtitle}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={22} color={colors.onBrand} />
          </View>
        </Pressable>

        {error ? (
          isOffline ? (
            <View style={styles.errorWrap}>
              <NetworkError onRetry={() => { void loadProfile(); }} />
            </View>
          ) : (
            <View style={styles.notice}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retry} onPress={() => { void loadProfile(); }}>
                <Text style={styles.retryText}>{t("common.retry")}</Text>
              </Pressable>
            </View>
          )
        ) : null}

        <View style={styles.menuList}>
          {menuItems.map((item, index) => (
            <View key={item.key}>
              <Pressable
                style={({ pressed }) => [styles.menuRow, pressed && styles.menuRowPressed]}
                onPress={item.onPress}
              >
                <Ionicons name={item.icon} size={22} color={colors.brand} />
                <Text style={styles.menuLabel}>{item.label}</Text>
              </Pressable>
              {index < menuItems.length - 1 ? <View style={styles.separator} /> : null}
            </View>
          ))}
        </View>

        <View style={styles.logoutSeparator} />
        <Pressable
          style={[styles.menuRow, isSigningOut && styles.buttonDisabled]}
          onPress={() => { void handleSignOut(); }}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <ActivityIndicator color={colors.danger} size="small" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={22} color={colors.danger} />
              <Text style={styles.logoutLabel}>{t("account.signOut")}</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.background
    },
    container: { flex: 1 },
    content: {
      paddingBottom: 40
    },
    loadingWrap: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center"
    },
    profileBanner: {
      backgroundColor: colors.brand,
      paddingTop: 18,
      paddingBottom: 22,
      paddingHorizontal: 16,
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
      gap: 8
    },
    bannerMain: {
      flex: 1,
      alignItems: "center"
    },
    bannerAvatar: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: "rgba(255,255,255,0.2)",
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.55)",
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 10
    },
    bannerAvatarText: {
      color: colors.onBrand,
      fontSize: fontSize.title,
      fontWeight: fontWeight.semibold
    },
    bannerCopy: {
      alignItems: "center",
      gap: 2,
      paddingHorizontal: 12
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
      paddingHorizontal: 16,
      paddingTop: 12
    },
    notice: {
      marginHorizontal: 16,
      marginTop: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      padding: 14,
      gap: 10
    },
    errorText: { color: colors.danger, fontSize: fontSize.secondary },
    retry: {
      alignSelf: "flex-start",
      borderRadius: 8,
      backgroundColor: colors.brand,
      paddingHorizontal: 12,
      paddingVertical: 8
    },
    retryText: { color: colors.onBrand, fontWeight: "600", fontSize: fontSize.secondary },
    menuList: {
      marginTop: 4
    },
    menuRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      paddingHorizontal: 20,
      minHeight: 48,
      backgroundColor: colors.background
    },
    menuRowPressed: {
      backgroundColor: colors.backgroundAlt
    },
    menuLabel: {
      flex: 1,
      fontSize: fontSize.body,
      color: colors.textSecondary,
      fontWeight: fontWeight.medium
    },
    separator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginLeft: 56
    },
    logoutSeparator: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginTop: 8
    },
    logoutLabel: {
      fontSize: fontSize.body,
      color: colors.danger,
      fontWeight: fontWeight.medium
    },
    buttonDisabled: { opacity: 0.6 }
  });
}
