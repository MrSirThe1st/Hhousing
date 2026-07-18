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
import { openWhatsAppMessage } from "@/lib/whatsapp";
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

  const handleContactSupport = async (): Promise<void> => {
    const displayName = tenant?.fullName?.trim() || lease?.tenantFullName?.trim() || "locataire";
    await openWhatsAppMessage(
      `Bonjour, je suis ${displayName}. J'ai besoin d'aide avec Mon Espace (Haraka Property).`
    );
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
    <SafeAreaView style={styles.root}>
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
          style={styles.profileHead}
          onPress={() => { router.push("/(tabs)/account/edit-profile"); }}
        >
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.nameText}>{name}</Text>
          {phoneLabel ? (
            <Text style={styles.phoneText}>{phoneLabel}</Text>
          ) : (
            <Text style={styles.phoneMuted}>Aucun numéro enregistré</Text>
          )}
          {email ? <Text style={styles.emailText}>{email}</Text> : null}
          <Text style={styles.editHint}>Modifier mon profil</Text>
        </Pressable>

        <Pressable
          style={styles.primaryRow}
          onPress={() => { router.push("/(tabs)/account/lease"); }}
        >
          <View style={styles.primaryIconWrap}>
            <Ionicons name="home-outline" size={20} color="#0063FE" />
          </View>
          <View style={styles.primaryTextWrap}>
            <Text style={styles.primaryTitle}>Mon logement</Text>
            <Text style={styles.primarySubtitle}>
              {lease ? "Voir mon contrat et mon loyer" : "Pas encore de logement lié"}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </Pressable>

        <Pressable style={styles.whatsappRow} onPress={() => { void handleContactSupport(); }}>
          <View style={styles.whatsappIconWrap}>
            <Ionicons name="logo-whatsapp" size={20} color="#128C7E" />
          </View>
          <Text style={styles.whatsappText}>Aide WhatsApp</Text>
          <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
        </Pressable>

        <Pressable
          style={[styles.logoutRow, isSigningOut && styles.buttonDisabled]}
          onPress={() => { void handleSignOut(); }}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <ActivityIndicator color="#DC2626" size="small" />
          ) : (
            <>
              <Ionicons name="log-out-outline" size={20} color="#DC2626" />
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
    backgroundColor: "#F5F6FA"
  },
  container: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 40,
    gap: 12
  },
  loadingWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  notice: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D4DAE7",
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
  profileHead: {
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
    paddingVertical: 8
  },
  avatarWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#0063FE",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "700"
  },
  nameText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#010A19"
  },
  phoneText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#010A19"
  },
  phoneMuted: {
    fontSize: 14,
    color: "#9CA3AF"
  },
  emailText: {
    fontSize: 13,
    color: "#6B7280"
  },
  editHint: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: "600",
    color: "#0063FE"
  },
  primaryRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D4DAE7",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  primaryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E8F1FF",
    alignItems: "center",
    justifyContent: "center"
  },
  primaryTextWrap: {
    flex: 1,
    gap: 2
  },
  primaryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#010A19"
  },
  primarySubtitle: {
    fontSize: 13,
    color: "#6B7280"
  },
  whatsappRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D4DAE7",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  whatsappIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E7F6F3",
    alignItems: "center",
    justifyContent: "center"
  },
  whatsappText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#010A19"
  },
  logoutRow: {
    marginTop: 8,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  logoutText: {
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "700"
  },
  buttonDisabled: { opacity: 0.6 }
});
