import { useState } from "react";
import { Stack } from "expo-router";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
      <SafeAreaView style={styles.safeRoot}>
        <KeyboardAvoidingView
          style={styles.root}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.brandBlock}>
            <Image
              source={require("../../assets/icon.png")}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.brandName}>Mon Espace</Text>
            <Text style={styles.subtitle}>Gérez votre logement, simplement.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Adresse e-mail</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color="#9CA3AF" />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                  placeholder="nom@exemple.com"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.passwordRow}>
                <Text style={styles.label}>Mot de passe</Text>
                <Text style={styles.forgotText}>Mot de passe oublié ?</Text>
              </View>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
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

          <View style={styles.footerWrap}>
            <Text style={styles.footerText}>Pas encore de compte ?</Text>
            <Text style={styles.footerLink}>Contactez votre gestionnaire.</Text>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  safeRoot: {
    flex: 1,
    backgroundColor: "#F3F4FA"
  },
  root: {
    flex: 1,
    backgroundColor: "#F3F4FA",
    justifyContent: "center",
    paddingHorizontal: 12,
    gap: 18
  },
  brandBlock: {
    alignItems: "center",
    gap: 8,
    marginTop: -8
  },
  brandName: {
    color: "#0063FE",
    fontSize: 28,
    fontWeight: "700"
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: 4
  },
  subtitle: {
    color: "#6B7280",
    fontSize: 18,
    lineHeight: 24,
    textAlign: "center"
  },
  card: {
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#C9CFDA",
    padding: 20,
    gap: 16
  },
  fieldGroup: {
    gap: 6
  },
  label: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "600"
  },
  passwordRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  forgotText: {
    fontSize: 13,
    color: "#0063FE",
    fontWeight: "500"
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "#C9CFDA",
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 12,
    minHeight: 52
  },
  input: {
    flex: 1,
    paddingVertical: 0,
    fontSize: 15,
    color: "#010A19",
    backgroundColor: "transparent"
  },
  error: {
    color: "#B91C1C",
    fontSize: 14
  },
  button: {
    marginTop: 4,
    borderRadius: 10,
    minHeight: 58,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0063FE"
  },
  buttonDisabled: {
    opacity: 0.65
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "700"
  },
  footerWrap: {
    alignItems: "center",
    gap: 2,
    marginTop: 8
  },
  footerText: {
    color: "#6B7280",
    fontSize: 14
  },
  footerLink: {
    color: "#0063FE",
    fontSize: 14,
    fontWeight: "600"
  }
});
