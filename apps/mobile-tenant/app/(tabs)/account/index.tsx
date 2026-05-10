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
import type { Lease, Tenant } from "@/lib/domain-types";
import type { ApiResult } from "@/lib/api-client";
import type { LeaseWithTenantView } from "@/lib/api-contracts-types";
import { getWithAuth } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import { NetworkError } from "@/components/network-error";

type LeaseOutput = {
  lease: LeaseWithTenantView | null;
};
type ProfileOutput = {
  tenant: Tenant;
};

const MONTHS_SHORT = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Juin",
  "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"
];

function formatShortDate(isoDate: string): string {
  const [yearRaw, monthRaw, dayRaw] = isoDate.split("-");
  const month = MONTHS_SHORT[Math.max(0, Number(monthRaw) - 1)] ?? "";
  return `${Number(dayRaw ?? "1")} ${month} ${yearRaw ?? ""}`;
}

function formatAmount(value: number): string {
  const base = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
  return `${base} FC`;
}

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
        // `/api/mobile/profile` may be unavailable in some deployed environments.
        // Fallback to lease tenant identity when possible instead of blocking screen content.
        if (profileResult.code === "NETWORK_ERROR") {
          setIsOffline(true);
        }
        if (profileResult.code === "NOT_FOUND" || (profileResult.code === "INTERNAL_ERROR" && profileResult.error.includes("404"))) {
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

  const initials = useMemo(() => getInitials(name, email), [email, name]);
  const leaseStartLabel = lease ? formatShortDate(lease.startDate) : "-";
  const rentLabel = lease ? formatAmount(lease.monthlyRentAmount) : "-";

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

        <View style={styles.profileHead}>
          <View style={styles.avatarWrap}>
            <Text style={styles.avatarText}>{initials}</Text>
            <View style={styles.avatarEditBadge}>
              <Ionicons name="create-outline" size={12} color="#ffffff" />
            </View>
          </View>

          <Text style={styles.nameText}>{name}</Text>
          <Text style={styles.emailText}>{email}</Text>
        </View>

        <View style={styles.summaryRow}>
          <View style={styles.summaryCard}>
            <Ionicons name="calendar-outline" size={16} color="#0063FE" />
            <Text style={styles.summaryLabel}>Début du bail</Text>
            <Text style={styles.summaryValue}>{leaseStartLabel}</Text>
          </View>

          <View style={styles.summaryCard}>
            <Ionicons name="receipt-outline" size={16} color="#0063FE" />
            <Text style={styles.summaryLabel}>Loyer mensuel</Text>
            <Text style={styles.summaryValue}>{rentLabel}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>Paramètres du compte</Text>

        <View style={styles.menuCard}>
          <MenuItem
            label="Mon bail"
            icon="document-text-outline"
            onPress={() => { router.push("/(tabs)/account/lease"); }}
          />
          <MenuItem
            label="Mes documents"
            icon="folder-open-outline"
            onPress={() => { router.push("/(tabs)/account/documents"); }}
          />
          <MenuItem
            label="Modifier le profil"
            icon="settings-outline"
            onPress={() => { router.push("/(tabs)/account/edit-profile"); }}
          />
        </View>

        <Pressable
          style={[styles.logoutCard, isSigningOut && styles.buttonDisabled]}
          onPress={() => { void handleSignOut(); }}
          disabled={isSigningOut}
        >
          <View style={styles.logoutLeftIconWrap}>
            <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          </View>
          {isSigningOut ? (
            <ActivityIndicator color="#DC2626" size="small" />
          ) : (
            <Text style={styles.logoutCardText}>Se déconnecter</Text>
          )}
          <Ionicons name="chevron-forward" size={18} color="#FCA5A5" />
        </Pressable>

        <View style={styles.supportCard}>
          <Text style={styles.supportTitle}>Besoin d'aide ?</Text>
          <Text style={styles.supportBody}>Notre équipe de support est là pour vous 24/7.</Text>
          <Text style={styles.supportLink}>Contacter le support</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({
  label,
  icon,
  onPress
}: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuLeft}>
        <View style={styles.menuIconWrap}>
          <Ionicons name={icon} size={16} color="#0063FE" />
        </View>
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F5F6FA"
  },
  container: { flex: 1 },
  content: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 24,
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
    gap: 8,
    marginTop: 4,
    marginBottom: 6
  },
  avatarWrap: {
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#0063FE",
    justifyContent: "center",
    alignItems: "center",
    position: "relative"
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 31,
    fontWeight: "700"
  },
  avatarEditBadge: {
    position: "absolute",
    right: -2,
    bottom: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#0057E6",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#ffffff"
  },
  nameText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#010A19"
  },
  emailText: {
    fontSize: 14,
    color: "#6B7280"
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C5CCD9",
    backgroundColor: "#ffffff",
    padding: 12,
    gap: 5
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase"
  },
  summaryValue: {
    fontSize: 29,
    fontWeight: "700",
    color: "#010A19"
  },
  sectionTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "#010A19",
    marginTop: 10
  },
  menuCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C5CCD9",
    backgroundColor: "#ffffff",
    overflow: "hidden"
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB"
  },
  menuLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  menuIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#E8F1FF",
    alignItems: "center",
    justifyContent: "center"
  },
  menuLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#010A19"
  },
  logoutCard: {
    marginTop: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C5CCD9",
    backgroundColor: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 13,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  logoutLeftIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center"
  },
  logoutCardText: {
    flex: 1,
    marginLeft: 10,
    color: "#DC2626",
    fontSize: 16,
    fontWeight: "700"
  },
  supportCard: {
    marginTop: 12,
    borderRadius: 10,
    padding: 16,
    backgroundColor: "#0057E6",
    minHeight: 90
  },
  buttonDisabled: { backgroundColor: "#FCA5A5" },
  supportTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#ffffff"
  },
  supportBody: {
    fontSize: 13,
    lineHeight: 18,
    color: "#DBEAFE",
    marginTop: 3
  },
  supportLink: {
    fontSize: 16,
    fontWeight: "700",
    color: "#ffffff",
    textDecorationLine: "underline",
    marginTop: 8
  }
});
