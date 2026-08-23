import { useMemo, useState } from "react";
import { Stack, useRouter } from "expo-router";
import {
  KeyboardAvoidingView,
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
import { AppLoader } from "@/components/universal-loading-state";
import { PageHeader } from "@/components/page-header";
import { postWithoutAuth } from "@/lib/api-client";
import {
  extractDrcNationalNumber,
  formatDrcNationalDisplay,
  toDrcE164,
  validateDrcPhoneInput
} from "@/lib/phone-input";
import { fontSize, fontWeight, spacing, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

type Mode = "phone" | "email";

type ForgotPasswordOutput = {
  message: string;
};

export default function ForgotPasswordScreen(): React.ReactElement {
  const { t } = useTranslation();
  const router = useRouter();
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [mode, setMode] = useState<Mode>("phone");
  const [phoneNational, setPhoneNational] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(): Promise<void> {
    setError(null);

    if (mode === "phone") {
      const phoneError = validateDrcPhoneInput(phoneNational);
      if (phoneError) {
        setError(phoneError);
        return;
      }
    } else if (!email.trim().includes("@")) {
      setError(t("auth.forgotInvalidEmail"));
      return;
    }

    setIsSubmitting(true);
    try {
      const body =
        mode === "phone"
          ? { phone: toDrcE164(phoneNational) }
          : { email: email.trim().toLowerCase() };

      const result = await postWithoutAuth<ForgotPasswordOutput>(
        "/api/mobile/auth/forgot-password",
        body
      );

      if (!result.success) {
        setError(result.error);
        return;
      }

      setSent(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <Stack.Screen options={{ title: t("auth.forgotTitle"), headerShown: false }} />
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
            <PageHeader title={t("auth.forgotTitle")} onBack={() => { router.back(); }} />

            {sent ? (
            <View style={styles.card}>
              <Ionicons name="mail-outline" size={36} color={colors.brand} />
              <Text style={styles.successTitle}>{t("auth.forgotSentTitle")}</Text>
              <Text style={styles.successBody}>{t("auth.forgotSentBody")}</Text>
              <Text style={styles.helpText}>{t("auth.forgotNoEmailAccess")}</Text>
              <Pressable
                style={styles.button}
                onPress={() => {
                  router.replace("/(auth)/login");
                }}
              >
                <Text style={styles.buttonText}>{t("auth.backToLogin")}</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.card}>
              <Text style={styles.subtitle}>{t("auth.forgotSubtitle")}</Text>

              {mode === "phone" ? (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>{t("auth.phoneLabel")}</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="call-outline" size={18} color={colors.iconMuted} />
                    <Text style={styles.prefix}>+243</Text>
                    <TextInput
                      value={formatDrcNationalDisplay(phoneNational)}
                      onChangeText={(next) => {
                        setPhoneNational(extractDrcNationalNumber(next));
                      }}
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
              ) : (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>{t("auth.emailLabel")}</Text>
                  <View style={styles.inputWrap}>
                    <Ionicons name="mail-outline" size={18} color={colors.iconMuted} />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                      autoComplete="email"
                      style={styles.input}
                      placeholder={t("auth.emailPlaceholder")}
                      placeholderTextColor={colors.textFaint}
                    />
                  </View>
                </View>
              )}

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <Pressable
                style={[styles.button, isSubmitting ? styles.buttonDisabled : null]}
                onPress={() => {
                  void handleSubmit();
                }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <AppLoader size="small" tone="onBrand" />
                ) : (
                  <Text style={styles.buttonText}>{t("auth.forgotSubmit")}</Text>
                )}
              </Pressable>

              <Pressable
                onPress={() => {
                  setError(null);
                  setMode((prev) => (prev === "phone" ? "email" : "phone"));
                }}
                style={styles.switchMode}
              >
                <Text style={styles.switchModeText}>
                  {mode === "phone" ? t("auth.forgotUseEmail") : t("auth.forgotUsePhone")}
                </Text>
              </Pressable>

              <Text style={styles.helpText}>{t("auth.forgotNoEmailAccess")}</Text>
            </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.xl,
      gap: spacing.sm
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      padding: 20,
      gap: 14
    },
    subtitle: {
      color: colors.textSecondary,
      fontSize: fontSize.body,
      lineHeight: 22
    },
    fieldGroup: {
      gap: 6
    },
    label: {
      fontSize: fontSize.secondary,
      fontWeight: fontWeight.semibold,
      color: colors.textSecondary
    },
    inputWrap: {
      minHeight: 52,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: colors.inputBorder,
      backgroundColor: colors.inputBg,
      paddingHorizontal: 12,
      flexDirection: "row",
      alignItems: "center",
      gap: 8
    },
    prefix: {
      color: colors.textMuted,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold
    },
    input: {
      flex: 1,
      color: colors.text,
      fontSize: fontSize.body,
      paddingVertical: 12
    },
    hint: {
      fontSize: fontSize.caption,
      color: colors.textFaint
    },
    error: {
      color: colors.danger,
      fontSize: fontSize.secondary
    },
    button: {
      minHeight: 52,
      borderRadius: 12,
      backgroundColor: colors.brand,
      alignItems: "center",
      justifyContent: "center"
    },
    buttonDisabled: {
      opacity: 0.6
    },
    buttonText: {
      color: colors.onBrand,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold
    },
    switchMode: {
      alignItems: "center",
      paddingVertical: 4
    },
    switchModeText: {
      color: colors.brand,
      fontSize: fontSize.secondary,
      fontWeight: fontWeight.semibold
    },
    helpText: {
      color: colors.textMuted,
      fontSize: fontSize.secondary,
      lineHeight: 20,
      textAlign: "center"
    },
    successTitle: {
      fontSize: fontSize.emphasis,
      fontWeight: fontWeight.bold,
      color: colors.text
    },
    successBody: {
      color: colors.textSecondary,
      fontSize: fontSize.body,
      lineHeight: 22
    }
  });
}
