import { useEffect, useState } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { getWithoutAuth } from "@/lib/api-client";
import { env } from "@/lib/env";

type InvitationValidateData = {
  invitation: {
    tenantFullName: string;
  };
};

export default function AcceptInviteScreen(): React.ReactElement {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantFullName, setTenantFullName] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvitation(): Promise<void> {
      if (!token) {
        setError("Lien d'invitation invalide.");
        setIsLoading(false);
        return;
      }

      const result = await getWithoutAuth<InvitationValidateData>(
        `/api/mobile/invitations/validate?token=${encodeURIComponent(token)}`
      );

      if (!result.success) {
        setError(result.error);
        setIsLoading(false);
        return;
      }

      setTenantFullName(result.data.invitation.tenantFullName);
      setIsLoading(false);
    }

    void loadInvitation();
  }, [token]);

  function openWebActivation(): void {
    const url = `${env.apiBaseUrl}/invite?token=${encodeURIComponent(token)}`;
    void Linking.openURL(url);
  }

  return (
    <>
      <Stack.Screen options={{ title: "Invitation", headerShown: false }} />
      <View style={styles.root}>
        {isLoading ? (
          <ActivityIndicator size="large" color="#0063FE" />
        ) : error ? (
          <View style={styles.card}>
            <Text style={styles.title}>Lien invalide</Text>
            <Text style={styles.body}>{error}</Text>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.title}>Bienvenue{tenantFullName ? `, ${tenantFullName}` : ""}</Text>
            <Text style={styles.body}>
              Créez votre mot de passe sur la page web sécurisée, puis reconnectez-vous ici avec votre
              numéro et ce mot de passe.
            </Text>
            <Pressable style={styles.button} onPress={openWebActivation}>
              <Text style={styles.buttonText}>Ouvrir la page d&apos;activation</Text>
            </Pressable>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F3F4FA",
    justifyContent: "center",
    paddingHorizontal: 20
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#C9CFDA",
    padding: 24,
    gap: 14
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#010A19"
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: "#6B7280"
  },
  button: {
    marginTop: 8,
    borderRadius: 10,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0063FE"
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700"
  }
});
