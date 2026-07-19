import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { Tenant } from "@/lib/domain-types";
import type { ApiResult } from "@/lib/api-client";
import type { LeaseWithTenantView } from "@/lib/api-contracts-types";
import { getWithAuth } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { NetworkError } from "@/components/network-error";
import { formatDrcNationalDisplay, nationalFromStoredPhone } from "@/lib/phone-input";

type LeaseOutput = {
  lease: LeaseWithTenantView | null;
};
type ProfileOutput = {
  tenant: Tenant;
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
    return "Locataire";
  }

  return normalized
    .split(" ")
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ""}${part.slice(1).toLowerCase()}`)
    .join(" ");
}

export default function AccountScreen(): React.ReactElement {
  const router = useRouter();
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
      setError("Session expirée. Veuillez vous reconnecter.");
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
  }, [session?.access_token]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!session?.access_token) {
      setError("Session expirée. Veuillez vous reconnecter.");
      setIsLoading(false);
      return;
    }

    void loadProfile();
  }, [isAuthLoading, loadProfile, session?.access_token]);

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

  const initials = useMemo(() => getInitials(name, email), [email, name]);

  if (isLoading || isAuthLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#0063FE" />
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
            tintColor="#0063FE"
          />
        }
      >
        <View style={styles.pageHeader}>
          <Text style={styles.pageTitle}>Profil</Text>
        </View>
        <View style={styles.headerRule} />

        {error ? (
          isOffline ? (
            <NetworkError onRetry={() => { void loadProfile(); }} />
          ) : (
            <View style={styles.notice}>
              <Text style={styles.errorText}>{error}</Text>
              <Pressable style={styles.retry} onPress={() => { void loadProfile(); }}>
                <Text style={styles.retryText}>Réessayer</Text>
              </Pressable>
            </View>
          )
        ) : null}

        <Pressable
          style={styles.profileCard}
          onPress={() => { router.push("/(tabs)/account/edit-profile"); }}
        >
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <View style={styles.profileCopy}>
            <Text style={styles.nameText}>{name}</Text>
            {phoneLabel ? (
              <Text style={styles.phoneText}>{phoneLabel}</Text>
            ) : (
              <Text style={styles.phoneMuted}>Aucun numéro enregistré</Text>
            )}
            {email ? <Text style={styles.emailText}>{email}</Text> : null}
            <Text style={styles.editHint}>Modifier mon profil</Text>
          </View>
        </Pressable>

        <Pressable
          style={styles.rowCard}
          onPress={() => { router.push("/(tabs)/account/lease"); }}
        >
          <View style={styles.rowIconWrap}>
            <Ionicons name="home-outline" size={18} color="#0063FE" />
          </View>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Mon logement</Text>
            <Text style={styles.rowSubtitle}>
              {lease ? "Voir mon contrat et mon loyer" : "Pas encore de logement lié"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </Pressable>

        <Pressable
          style={[styles.logoutBtn, isSigningOut && styles.buttonDisabled]}
          onPress={() => { void handleSignOut(); }}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <ActivityIndicator color="#DC2626" size="small" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={18} color="#DC2626" />
              <Text style={styles.logoutText}>Se déconnecter</Text>
            </>
          )}
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF"
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
  pageHeader: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14
  },
  pageTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827"
  },
  headerRule: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#E5E7EB",
    marginBottom: 18
  },
  notice: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#ffffff",
    padding: 14,
    gap: 10
  },
  errorText: { color: "#B91C1C", fontSize: 14 },
  retry: {
    alignSelf: "flex-start",
    borderRadius: 8,
    backgroundColor: "#0063FE",
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  retryText: { color: "#ffffff", fontWeight: "600", fontSize: 13 },
  profileCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14
  },
  avatarWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#E8EEF7",
    justifyContent: "center",
    alignItems: "center"
  },
  avatarText: {
    color: "#374151",
    fontSize: 20,
    fontWeight: "700"
  },
  profileCopy: {
    flex: 1,
    gap: 2
  },
  nameText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827"
  },
  phoneText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827"
  },
  phoneMuted: {
    fontSize: 13,
    color: "#9CA3AF"
  },
  emailText: {
    fontSize: 12,
    color: "#6B7280"
  },
  editHint: {
    marginTop: 4,
    fontSize: 12,
    fontWeight: "600",
    color: "#0063FE"
  },
  rowCard: {
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  rowIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center"
  },
  rowCopy: {
    flex: 1,
    gap: 2
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#111827"
  },
  rowSubtitle: {
    fontSize: 12,
    color: "#9CA3AF"
  },
  logoutBtn: {
    marginTop: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  logoutText: {
    color: "#DC2626",
    fontSize: 15,
    fontWeight: "700"
  },
  buttonDisabled: { opacity: 0.6 }
});
