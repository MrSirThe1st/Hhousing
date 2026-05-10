import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import type { Tenant } from "@/lib/domain-types";
import type { ApiResult } from "@/lib/api-client";
import type { LeaseWithTenantView } from "@/lib/api-contracts-types";
import { getWithAuth, patchWithAuth } from "@/lib/api-client";
import { FormSkeleton } from "@/components/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { NetworkError } from "@/components/network-error";

type ProfileOutput = { tenant: Tenant };
type LeaseOutput = { lease: LeaseWithTenantView | null };

export default function EditProfileScreen(): React.ReactElement {
  const router = useRouter();
  const { session, isLoading: isAuthLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [tenant, setTenant] = useState<Tenant | null>(null);

  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [isBiometricEnabled, setIsBiometricEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    if (!session?.access_token) {
      setError("Session expirée. Veuillez vous reconnecter.");
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
      setFullName(profileResult.data.tenant.fullName);
      setPhone(profileResult.data.tenant.phone ?? "");
      setError(null);
    } else {
      const profileUnavailable = profileResult.code === "NOT_FOUND" || (profileResult.code === "INTERNAL_ERROR" && profileResult.error.includes("404"));

      if (profileUnavailable && leaseResult.success && leaseResult.data.lease) {
        const lease = leaseResult.data.lease;
        const derivedTenant: Tenant = {
          id: lease.tenantId,
          organizationId: lease.organizationId,
          authUserId: session.user.id,
          fullName: lease.tenantFullName,
          email: lease.tenantEmail,
          phone: null,
          dateOfBirth: null,
          photoUrl: null,
          employmentStatus: null,
          jobTitle: null,
          monthlyIncome: null,
          numberOfOccupants: null,
          createdAtIso: lease.createdAtIso
        };

        setTenant(derivedTenant);
        setFullName(derivedTenant.fullName);
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

    void load();
  }, [isAuthLoading, load, session?.access_token]);

  const handleSave = useCallback(async (): Promise<void> => {
    if (!fullName.trim()) {
      Alert.alert("Erreur", "Le nom complet est requis.");
      return;
    }

    setIsSaving(true);
    const result: ApiResult<ProfileOutput> = await patchWithAuth<ProfileOutput>("/api/mobile/profile", {
      fullName: fullName.trim(),
      phone: phone.trim() || null
    });
    setIsSaving(false);

    if (!result.success) {
      const profileUnavailable = result.code === "NOT_FOUND" || (result.code === "INTERNAL_ERROR" && result.error.includes("404"));
      if (profileUnavailable) {
        Alert.alert("Indisponible", "Le service de modification du profil est temporairement indisponible.");
      } else {
        Alert.alert("Erreur", result.error);
      }
    } else {
      setTenant(result.data.tenant);
      router.back();
    }
  }, [fullName, phone, router]);

  if (isLoading || isAuthLoading) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loadingWrap}>
          <FormSkeleton fields={2} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !tenant) {
    return (
      <SafeAreaView style={styles.root}>
        <View style={styles.loadingWrap}>
          {isOffline ? (
            <NetworkError onRetry={() => { void load(); }} />
          ) : (
            <View style={styles.notice}>
              <Text style={styles.errorText}>{error ?? "Profil introuvable."}</Text>
              <Pressable style={styles.retryBtn} onPress={() => { void load(); }}>
                <Text style={styles.retryBtnText}>Réessayer</Text>
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.topBar}>
        <Pressable style={styles.backBtn} onPress={() => { router.back(); }}>
          <Ionicons name="arrow-back" size={21} color="#0063FE" />
          <Text style={styles.topTitle}>Modifier le profil</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} style={styles.flex} contentContainerStyle={styles.content}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatarCircle}>
            <Ionicons name="person-outline" size={38} color="#6B7280" />
          </View>
          <View style={styles.avatarBadge}>
            <Ionicons name="camera-outline" size={14} color="#ffffff" />
          </View>
        </View>

        <Text style={styles.title}>Modifier le profil</Text>
        <Text style={styles.subtitle}>Mettez à jour vos informations personnelles</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Nom complet</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="person-outline" size={16} color="#6B7280" />
            <TextInput
              value={fullName}
              onChangeText={setFullName}
              style={styles.input}
              autoCapitalize="words"
              autoCorrect={false}
              placeholder="Votre nom complet"
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Téléphone</Text>
          <View style={styles.inputWrap}>
            <Ionicons name="call-outline" size={16} color="#6B7280" />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              style={styles.input}
              keyboardType="phone-pad"
              autoCorrect={false}
              placeholder="+243..."
              placeholderTextColor="#9CA3AF"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Email (non modifiable)</Text>
          <View style={[styles.inputWrap, styles.readonlyField]}>
            <Ionicons name="mail-outline" size={16} color="#9CA3AF" />
            <Text style={styles.readonlyValue}>{tenant.email ?? "—"}</Text>
          </View>
        </View>

        <Text style={styles.securityTitle}>Sécurité</Text>
        <View style={styles.securityCard}>
          <Pressable style={styles.securityRow} onPress={() => { Alert.alert("Info", "Bientôt disponible"); }}>
            <View style={styles.securityLeft}>
              <Ionicons name="lock-closed-outline" size={16} color="#0063FE" />
              <Text style={styles.securityText}>Changer le mot de passe</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </Pressable>

          <View style={styles.securityDivider} />

          <View style={styles.securityRow}>
            <View style={styles.securityLeft}>
              <Ionicons name="finger-print-outline" size={16} color="#0063FE" />
              <Text style={styles.securityText}>Authentification biométrique</Text>
            </View>
            <Switch
              value={isBiometricEnabled}
              onValueChange={setIsBiometricEnabled}
              trackColor={{ false: "#D1D5DB", true: "#93C5FD" }}
              thumbColor={isBiometricEnabled ? "#0063FE" : "#F3F4F6"}
            />
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
            ? <ActivityIndicator color="#ffffff" size="small" />
            : <Text style={styles.saveBtnText}>Enregistrer les modifications</Text>}
        </Pressable>

        <Pressable style={styles.cancelBtn} onPress={() => { router.back(); }}>
          <Text style={styles.cancelBtnText}>Annuler</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F5F6FA"
  },
  flex: { flex: 1 },
  loadingWrap: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16
  },
  topBar: {
    minHeight: 48,
    borderBottomWidth: 1,
    borderBottomColor: "#D4DAE7",
    paddingHorizontal: 12,
    justifyContent: "center"
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  topTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#0063FE"
  },
  content: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 20,
    gap: 12
  },
  avatarWrap: {
    alignSelf: "center",
    position: "relative"
  },
  avatarCircle: {
    width: 82,
    height: 82,
    borderRadius: 41,
    borderWidth: 2,
    borderColor: "#0063FE",
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center"
  },
  avatarBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#0063FE",
    position: "absolute",
    right: -2,
    bottom: 6,
    alignItems: "center",
    justifyContent: "center"
  },
  title: {
    textAlign: "center",
    fontSize: 21,
    fontWeight: "700",
    color: "#010A19"
  },
  subtitle: {
    textAlign: "center",
    fontSize: 14,
    color: "#6B7280",
    marginTop: -6
  },
  notice: {
    borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB",
    backgroundColor: "#ffffff", padding: 14, gap: 10
  },
  errorText: { color: "#B91C1C", fontSize: 14 },
  retryBtn: {
    alignSelf: "flex-start", borderRadius: 8, backgroundColor: "#0063FE",
    paddingHorizontal: 12, paddingVertical: 8
  },
  retryBtnText: { color: "#ffffff", fontWeight: "600", fontSize: 13 },
  field: { gap: 6, marginTop: 4 },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6B7280",
    textTransform: "uppercase"
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#C5CCD9",
    borderRadius: 10,
    backgroundColor: "#F5F6FA",
    minHeight: 44,
    paddingHorizontal: 10
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#010A19",
    paddingVertical: 0
  },
  readonlyField: {
    backgroundColor: "#ECEEF7"
  },
  readonlyValue: { fontSize: 15, color: "#9CA3AF" },
  securityTitle: {
    fontSize: 30,
    fontWeight: "700",
    color: "#010A19",
    marginTop: 8
  },
  securityCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C5CCD9",
    backgroundColor: "#ffffff",
    overflow: "hidden"
  },
  securityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    minHeight: 52
  },
  securityLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10
  },
  securityText: {
    fontSize: 18,
    color: "#374151",
    fontWeight: "500"
  },
  securityDivider: {
    height: 1,
    backgroundColor: "#E5E7EB"
  },
  footerActions: {
    borderTopWidth: 1,
    borderTopColor: "#D4DAE7",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    backgroundColor: "#F5F6FA"
  },
  saveBtn: {
    borderRadius: 10, backgroundColor: "#0063FE",
    paddingVertical: 14, alignItems: "center"
  },
  saveBtnDisabled: { backgroundColor: "#93C5FD" },
  saveBtnText: { color: "#ffffff", fontSize: 17, fontWeight: "700" },
  cancelBtn: {
    alignItems: "center",
    justifyContent: "center",
    minHeight: 34
  },
  cancelBtnText: {
    color: "#6B7280",
    fontSize: 14,
    fontWeight: "600"
  }
});
