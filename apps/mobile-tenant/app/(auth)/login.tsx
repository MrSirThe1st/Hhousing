import { useState } from "react";
import { Stack } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { useAuth } from "@/contexts/auth-context";

export default function LoginScreen(): React.ReactElement {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn(): Promise<void> {
    if (!email.trim() || !password) {
      setError("Email et mot de passe sont requis.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const signInError = await signIn(email, password);

    if (signInError) {
      setError("Connexion impossible. Vérifiez vos identifiants.");
      setIsSubmitting(false);
      return;
    }

    setIsSubmitting(false);
  }

  return (
    <>
      <Stack.Screen options={{ title: "Connexion", headerShown: false }} />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Hhousing</Text>
          <Text style={styles.subtitle}>Connectez-vous pour accéder à votre espace locataire.</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
              placeholder="email@example.com"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Mot de passe</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              style={styles.input}
              placeholder="Votre mot de passe"
            />
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Pressable
            style={[styles.button, isSubmitting ? styles.buttonDisabled : null]}
            onPress={() => {
              void handleSignIn();
            }}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Se connecter</Text>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#F4F7FB",
    justifyContent: "center",
    paddingHorizontal: 20
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 18,
    padding: 20,
    gap: 14,
    shadowColor: "#010A19",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3
  },
  title: {
    color: "#010A19",
    fontSize: 28,
    fontWeight: "700"
  },
  subtitle: {
    color: "#4B5563",
    fontSize: 14,
    lineHeight: 20
  },
  fieldGroup: {
    gap: 6
  },
  label: {
    fontSize: 13,
    color: "#1F2937",
    fontWeight: "600"
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
  error: {
    color: "#B91C1C",
    fontSize: 13
  },
  button: {
    marginTop: 6,
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
  }
});
