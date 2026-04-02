import { useEffect, useState } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type {
  AcceptTenantInvitationOutput,
  TenantInvitationPreview,
  ValidateTenantInvitationOutput
} from "@hhousing/api-contracts";
import { useAuth } from "@/contexts/auth-context";
import { getWithoutAuth, postWithoutAuth } from "@/lib/api-client";

export default function AcceptInviteScreen(): React.ReactElement {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const { signIn } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<TenantInvitationPreview | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    async function load(): Promise<void> {
      if (!token) {
        setError("Lien d'invitation invalide.");
        setIsLoading(false);
        return;
      }

      const result = await getWithoutAuth<ValidateTenantInvitationOutput>(
        `/api/mobile/invitations/validate?token=${encodeURIComponent(token)}`
      );

      if (!result.success) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      setPreview(result.data.invitation);
      setPhone(result.data.invitation.tenantPhone ?? "");
      setIsLoading(false);
    }

    void load();
  }, [token]);

  async function handleAccept(): Promise<void> {
    if (!preview) {
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await postWithoutAuth<AcceptTenantInvitationOutput>(
      "/api/mobile/invitations/accept",
      {
        token,
        password,
        phone: phone.trim() || null
      }
    );

    if (!result.success) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    const signInError = await signIn(preview.tenantEmail, password);
    if (signInError) {
      setError("Compte activé, mais la connexion automatique a échoué.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  }

  return (
    <>
      <Stack.Screen options={{ title: "Activer le compte", headerShown: false }} />
      <View style={styles.root}>
        <View style={styles.card}>
          <Text style={styles.title}>Activation du compte</Text>
          {isLoading ? <ActivityIndicator size="large" color="#0063FE" /> : null}

          {!isLoading && error ? <Text style={styles.error}>{error}</Text> : null}

          {!isLoading && !error && preview ? (
            <>
              <Text style={styles.subtitle}>
                Bienvenue {preview.tenantFullName}. Définissez votre mot de passe pour accéder à votre espace locataire.
              </Text>
              <Text style={styles.meta}>Organisation: {preview.organizationName}</Text>
              <Text style={styles.meta}>Email: {preview.tenantEmail}</Text>
              <TextInput
                value={phone}
                onChangeText={setPhone}
                placeholder="Téléphone (optionnel)"
                style={styles.input}
              />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Mot de passe"
                secureTextEntry
                style={styles.input}
              />
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirmer le mot de passe"
                secureTextEntry
                style={styles.input}
              />
              <Pressable
                style={[styles.button, isSubmitting ? styles.buttonDisabled : null]}
                disabled={isSubmitting}
                onPress={() => {
                  void handleAccept();
                }}
              >
                <Text style={styles.buttonText}>
                  {isSubmitting ? "Activation..." : "Activer mon compte"}
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "#F4F7FB",
    paddingHorizontal: 20
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    gap: 12
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#010A19"
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    color: "#4B5563"
  },
  meta: {
    fontSize: 13,
    color: "#6B7280"
  },
  input: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: "#010A19",
    backgroundColor: "#ffffff"
  },
  button: {
    marginTop: 4,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#0063FE"
  },
  buttonDisabled: {
    opacity: 0.65
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700"
  },
  error: {
    color: "#B91C1C",
    fontSize: 14
  }
});