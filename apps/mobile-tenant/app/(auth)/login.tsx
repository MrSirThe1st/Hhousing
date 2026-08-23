import { useEffect, useMemo, useState } from "react";
import { Stack, useRouter } from "expo-router";
import {
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { FullScreenLoadingOverlay } from "@/components/universal-loading-state";
import { useAuth } from "@/contexts/auth-context";
import { usePreferences } from "@/contexts/preferences-context";
import { postWithoutAuth } from "@/lib/api-client";
import {
  authenticateWithBiometrics,
  biometricFailureMessage,
  getBiometricCredentials,
  saveBiometricCredentials,
  type StoredCredentials
} from "@/lib/biometrics";
import { setPendingBiometricCredentials } from "@/lib/pending-biometric-credentials";
import { env } from "@/lib/env";
import {
  extractDrcNationalNumber,
  formatDrcNationalDisplay,
  nationalFromStoredPhone,
  toDrcE164,
  validateDrcPhoneInput
} from "@/lib/phone-input";
import { fontSize, spacing, touchTarget, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

type PhonePasswordLoginOutput = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tenantId: string;
  organizationId: string;
};

export default function LoginScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { signInWithSession } = useAuth();
  const { biometricEnabled } = usePreferences();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [phoneNational, setPhoneNational] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isBiometricReady, setIsBiometricReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrapBiometric(): Promise<void> {
      if (!biometricEnabled) {
        if (mounted) {
          setIsBiometricReady(false);
        }
        return;
      }

      const credentials = await getBiometricCredentials();
      if (!mounted) {
        return;
      }

      if (credentials) {
        const national = nationalFromStoredPhone(credentials.phone);
        if (national) {
          setPhoneNational(national);
        }
        setIsBiometricReady(true);
      } else {
        setIsBiometricReady(false);
      }
    }

    void bootstrapBiometric();
    return () => {
      mounted = false;
    };
  }, [biometricEnabled]);

  function handleOpenMarketplace(): void {
    const url = `${env.apiBaseUrl}/marketplace`;
    void Linking.openURL(url).catch((err) => {
      console.error("Failed to open marketplace URL:", err);
    });
  }

  function handlePhoneChange(nextValue: string): void {
    setPhoneNational(extractDrcNationalNumber(nextValue));
  }

  async function completeLogin(credentials: StoredCredentials): Promise<void> {
    const result = await postWithoutAuth<PhonePasswordLoginOutput>("/api/mobile/auth/login", {
      phone: credentials.phone,
      password: credentials.password
    });

    if (!result.success) {
      setError(result.error);
      setIsSubmitting(false);
      return;
    }

    const signInError = await signInWithSession(result.data.accessToken, result.data.refreshToken);
    if (signInError) {
      setError(t("auth.signInFailed"));
      setIsSubmitting(false);
      return;
    }

    // Keep credentials in memory for post-login Face ID setup (no second password prompt).
    setPendingBiometricCredentials(credentials);

    if (biometricEnabled) {
      await saveBiometricCredentials(credentials);
    }

    // Keep the blocking overlay up until navigation replaces this screen.
  }

  async function handleLogin(): Promise<void> {
    const phoneError = validateDrcPhoneInput(phoneNational);
    if (phoneError) {
      setError(phoneError);
      return;
    }

    if (password.length < 8) {
      setError(t("auth.passwordTooShort"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    await completeLogin({
      phone: toDrcE164(phoneNational),
      password
    });
  }

  async function handleBiometricLogin(): Promise<void> {
    setIsSubmitting(true);
    setError(null);

    const result = await authenticateWithBiometrics(t("biometric.signInPrompt"));
    if (!result.success) {
      const message = biometricFailureMessage(result);
      if (message) {
        setError(message);
      }
      setIsSubmitting(false);
      return;
    }

    const credentials = await getBiometricCredentials();
    if (!credentials) {
      setError(t("biometric.credentialsMissing"));
      setIsBiometricReady(false);
      setIsSubmitting(false);
      return;
    }

    await completeLogin(credentials);
  }

  return (
    <>
      <Stack.Screen options={{ title: t("auth.loginTitle"), headerShown: false }} />
      <SafeAreaView style={styles.safeRoot} edges={["top", "bottom"]}>
        <KeyboardAvoidingView
          style={styles.keyboardRoot}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.root}>
              <View style={styles.brandBlock}>
                <Image
                  source={require("../../assets/door_logo.png")}
                  style={styles.logo}
                  resizeMode="contain"
                />
                <Text style={styles.brandName}>{t("common.appName")}</Text>
                <Text style={styles.subtitle}>{t("auth.subtitle")}</Text>
              </View>

              <View style={styles.card}>
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>{t("auth.phoneLabel")}</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="call-outline" size={18} color={colors.iconMuted} />
                    <Text style={styles.prefix}>+243</Text>
                    <TextInput
                      value={formatDrcNationalDisplay(phoneNational)}
                      onChangeText={handlePhoneChange}
                      keyboardType="phone-pad"
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.input}
                      placeholder="990 000 000"
                      placeholderTextColor={colors.textFaint}
                      maxLength={11}
                    />
                  </View>
                  <Text style={styles.hint}>{t("auth.phoneHint")}</Text>
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>{t("auth.passwordLabel")}</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="lock-closed-outline" size={18} color={colors.iconMuted} />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={styles.input}
                      placeholder={t("auth.passwordPlaceholder")}
                      placeholderTextColor={colors.textFaint}
                    />
                    <Pressable
                      onPress={() => setShowPassword((value) => !value)}
                      hitSlop={12}
                      style={styles.iconBtn}
                    >
                      <Ionicons
                        name={showPassword ? "eye-off-outline" : "eye-outline"}
                        size={18}
                        color={colors.iconMuted}
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
                  <Text style={styles.buttonText}>{t("auth.signIn")}</Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    router.push("/(auth)/forgot-password");
                  }}
                  style={styles.forgotWrap}
                  disabled={isSubmitting}
                >
                  <Text style={styles.forgotText}>{t("auth.forgotPassword")}</Text>
                </Pressable>

                {isBiometricReady ? (
                  <Pressable
                    style={[styles.biometricButton, isSubmitting ? styles.buttonDisabled : null]}
                    onPress={() => {
                      void handleBiometricLogin();
                    }}
                    disabled={isSubmitting}
                  >
                    <Ionicons name="finger-print-outline" size={20} color={colors.brand} />
                    <Text style={styles.biometricButtonText}>{t("auth.signInBiometric")}</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.marketplaceWrap}>
                <Text style={styles.marketplaceText}>{t("auth.marketplacePrompt")}</Text>
                <Pressable
                  onPress={handleOpenMarketplace}
                  style={styles.marketplacePressable}
                  disabled={isSubmitting}
                >
                  <Text style={styles.marketplaceLink}>{t("auth.marketplaceLink")}</Text>
                  <Ionicons name="open-outline" size={14} color={colors.brand} />
                </Pressable>
              </View>

              <View style={styles.footerWrap}>
                <Text style={styles.footerText}>{t("auth.noAccount")}</Text>
                <Text style={styles.footerLink}>{t("auth.inviteHint")}</Text>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
      <FullScreenLoadingOverlay visible={isSubmitting} />
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    safeRoot: {
      flex: 1,
      backgroundColor: colors.backgroundAlt
    },
    keyboardRoot: {
      flex: 1
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      paddingVertical: spacing.lg
    },
    root: {
      backgroundColor: colors.backgroundAlt,
      paddingHorizontal: spacing.lg,
      gap: 18
    },
    brandBlock: {
      alignItems: "center",
      gap: 8,
      marginTop: -8
    },
    brandName: {
      color: colors.brand,
      fontSize: fontSize.display,
      fontWeight: "700"
    },
    logo: {
      width: 72,
      height: 108,
      marginBottom: 4
    },
    subtitle: {
      color: colors.textMuted,
      fontSize: fontSize.title,
      lineHeight: 24,
      textAlign: "center"
    },
    card: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      padding: 20,
      gap: 16
    },
    fieldGroup: {
      gap: 6
    },
    label: {
      fontSize: fontSize.secondary,
      color: colors.textMuted,
      fontWeight: "600"
    },
    inputWrap: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      borderRadius: 10,
      backgroundColor: colors.inputBg,
      paddingHorizontal: 12,
      minHeight: 52
    },
    prefix: {
      color: colors.text,
      fontSize: fontSize.body,
      fontWeight: "700"
    },
    input: {
      flex: 1,
      paddingVertical: 0,
      fontSize: fontSize.body,
      color: colors.text,
      backgroundColor: "transparent",
      minHeight: touchTarget - 16
    },
    iconBtn: {
      width: touchTarget,
      height: touchTarget,
      alignItems: "center",
      justifyContent: "center",
      marginRight: -8
    },
    hint: {
      color: colors.textFaint,
      fontSize: fontSize.caption,
      marginTop: 2
    },
    error: {
      color: colors.danger,
      fontSize: fontSize.secondary
    },
    button: {
      marginTop: 4,
      borderRadius: 10,
      minHeight: 58,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.brand
    },
    buttonDisabled: {
      opacity: 0.65
    },
    buttonText: {
      color: colors.onBrand,
      fontSize: fontSize.emphasis,
      fontWeight: "700"
    },
    forgotWrap: {
      alignItems: "center",
      paddingTop: 4
    },
    forgotText: {
      color: colors.brand,
      fontSize: fontSize.secondary,
      fontWeight: "600"
    },
    biometricButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      borderRadius: 10,
      minHeight: 52,
      borderWidth: 1,
      borderColor: colors.brand,
      backgroundColor: colors.surfaceMuted
    },
    biometricButtonText: {
      color: colors.brand,
      fontSize: fontSize.body,
      fontWeight: "700"
    },
    footerWrap: {
      alignItems: "center",
      gap: 2,
      marginTop: 8
    },
    footerText: {
      color: colors.textMuted,
      fontSize: fontSize.secondary
    },
    footerLink: {
      color: colors.brand,
      fontSize: fontSize.secondary,
      fontWeight: "600",
      textAlign: "center"
    },
    marketplaceWrap: {
      alignItems: "center",
      gap: 4,
      marginTop: 12
    },
    marketplaceText: {
      color: colors.textMuted,
      fontSize: fontSize.secondary
    },
    marketplacePressable: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4
    },
    marketplaceLink: {
      color: colors.brand,
      fontSize: fontSize.secondary,
      fontWeight: "600",
      textDecorationLine: "underline"
    }
  });
}
