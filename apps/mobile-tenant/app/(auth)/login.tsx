import { useState } from "react";
import { Stack } from "expo-router";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
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
import { postWithoutAuth } from "@/lib/api-client";
import { env } from "@/lib/env";

type PhonePasswordLoginOutput = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tenantId: string;
  organizationId: string;
};

export default function LoginScreen(): React.ReactElement {
  const { signInWithSession } = useAuth();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleOpenMarketplace(): void {
    const url = `${env.apiBaseUrl}/marketplace`;
    void Linking.openURL(url).catch((err) => {
      console.error("Failed to open marketplace URL:", err);
    });
  }

  async function handleLogin(): Promise<void> {
    if (!phone.trim()) {
      setError("Entrez votre numéro de téléphone.");
      return;
    }

    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    const result = await postWithoutAuth<PhonePasswordLoginOutput>("/api/mobile/auth/login", {
      phone: phone.trim(),
      password
    });

    if (!result.success) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    const signInError = await signInWithSession(result.data.accessToken, result.data.refreshToken);
    if (signInError) {
      setError("Connexion impossible. Réessayez.");
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
            <Text style={styles.subtitle}>Connectez-vous avec votre numéro et votre mot de passe.</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Numéro de téléphone</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="call-outline" size={18} color="#9CA3AF" />
                <TextInput
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                  placeholder="+243 990 000 000"
                  placeholderTextColor="#9CA3AF"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Mot de passe</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color="#9CA3AF" />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={styles.input}
                  placeholder="Votre mot de passe"
                  placeholderTextColor="#9CA3AF"
                />
                <Pressable onPress={() => setShowPassword((value) => !value)} hitSlop={8}>
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={18}
                    color="#9CA3AF"
                  />
                </Pressable>
              </View>
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={[styles.button, isSubmitting ? styles.buttonDisabled : null]}
              onPress={() => {
                void handleLogin();
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

          <View style={styles.marketplaceWrap}>
            <Text style={styles.marketplaceText}>Vous cherchez un logement ?</Text>
            <Pressable onPress={handleOpenMarketplace} style={styles.marketplacePressable}>
              <Text style={styles.marketplaceLink}>Explorer les annonces</Text>
              <Ionicons name="open-outline" size={14} color="#0063FE" />
            </Pressable>
          </View>

          <View style={styles.footerWrap}>
            <Text style={styles.footerText}>Pas encore de compte ?</Text>
            <Text style={styles.footerLink}>
              Activez-le via le lien d&apos;invitation reçu par e-mail ou WhatsApp.
            </Text>
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
    fontWeight: "600",
    textAlign: "center"
  },
  marketplaceWrap: {
    alignItems: "center",
    gap: 4,
    marginTop: 12
  },
  marketplaceText: {
    color: "#6B7280",
    fontSize: 14
  },
  marketplacePressable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  marketplaceLink: {
    color: "#0063FE",
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline"
  }
});
