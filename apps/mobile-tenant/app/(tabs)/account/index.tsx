import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { Lease } from "@hhousing/domain";
import type { ApiResult } from "@hhousing/api-contracts";
import { getWithAuth } from "@/lib/api-client";
import { ScreenShell } from "@/components/screen-shell";
import { useAuth } from "@/contexts/auth-context";

type LeaseOutput = { lease: Lease | null };

export default function AccountScreen(): React.ReactElement {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lease, setLease] = useState<Lease | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  const loadProfile = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    const result: ApiResult<LeaseOutput> = await getWithAuth<LeaseOutput>("/api/mobile/lease");
    if (!result.success) {
      setError(result.error);
      setLease(null);
    } else {
      setLease(result.data.lease);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const handleSignOut = async (): Promise<void> => {
    setIsSigningOut(true);
    await signOut();
  };

  const email = session?.user.email ?? "Utilisateur";

  if (isLoading) {
    return (
      <ScreenShell title="Profil" subtitle={email}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0063FE" />
        </View>
      </ScreenShell>
    );
  }

  return (
    <ScreenShell title="Profil" subtitle={email}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.container}>
        {error ? (
          <View style={styles.notice}>
            <Text style={styles.errorText}>{error}</Text>
            <Pressable style={styles.retry} onPress={() => { void loadProfile(); }}>
              <Text style={styles.retryText}>Réessayer</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={styles.profileCard}>
          <Text style={styles.profileLabel}>Compte</Text>
          <View style={styles.profileField}>
            <Text style={styles.fieldLabel}>Email</Text>
            <Text style={styles.fieldValue}>{email}</Text>
          </View>
          {lease ? (
            <View style={styles.profileField}>
              <Text style={styles.fieldLabel}>Loyer mensuel</Text>
              <Text style={styles.fieldValue}>
                {new Intl.NumberFormat("fr-FR", {
                  style: "currency",
                  currency: lease.currencyCode,
                  maximumFractionDigits: 0
                }).format(lease.monthlyRentAmount)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={styles.menuCard}>
          <MenuItem
            label="Mon bail"
            subtitle="Voir les détails du contrat"
            onPress={() => { router.push("/(tabs)/account/lease"); }}
          />
          <MenuItem
            label="Documents"
            subtitle="Bail, reçus et avis"
            onPress={() => { router.push("/(tabs)/account/documents"); }}
          />
        </View>

        <Pressable
          style={[styles.logoutButton, isSigningOut && styles.buttonDisabled]}
          onPress={() => { void handleSignOut(); }}
          disabled={isSigningOut}
        >
          {isSigningOut ? (
            <ActivityIndicator color="#ffffff" size="small" />
          ) : (
            <Text style={styles.logoutButtonText}>Se déconnecter</Text>
          )}
        </Pressable>
      </ScrollView>
    </ScreenShell>
  );
}

function MenuItem({
  label,
  subtitle,
  onPress
}: {
  label: string;
  subtitle: string;
  onPress: () => void;
}): React.ReactElement {
  return (
    <Pressable style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuCopy}>
        <Text style={styles.menuLabel}>{label}</Text>
        <Text style={styles.menuSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.menuArrow}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centerContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  notice: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#ffffff",
    padding: 14,
    gap: 10,
    marginBottom: 16
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
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#ffffff",
    padding: 16,
    gap: 14,
    marginBottom: 16
  },
  profileLabel: { fontSize: 15, fontWeight: "700", color: "#010A19" },
  profileField: { gap: 4 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: "#6B7280" },
  fieldValue: { fontSize: 14, color: "#010A19" },
  menuCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#ffffff",
    marginBottom: 20,
    overflow: "hidden"
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB"
  },
  menuCopy: { flex: 1, gap: 4 },
  menuLabel: { fontSize: 15, fontWeight: "700", color: "#010A19" },
  menuSubtitle: { fontSize: 13, color: "#6B7280" },
  menuArrow: { fontSize: 24, color: "#94A3B8", marginLeft: 12 },
  logoutButton: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#DC2626",
    marginBottom: 30
  },
  buttonDisabled: { backgroundColor: "#FCA5A5" },
  logoutButtonText: { color: "#ffffff", fontSize: 14, fontWeight: "700" }
});
