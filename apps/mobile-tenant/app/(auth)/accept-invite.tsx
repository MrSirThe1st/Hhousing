import { useEffect, useMemo, useState } from "react";
import { Stack, useLocalSearchParams } from "expo-router";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ScreenLoader } from "@/components/universal-loading-state";
import { getWithoutAuth } from "@/lib/api-client";
import { env } from "@/lib/env";
import { fontWeight, fontSize, useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";

type InvitationValidateData = {
  invitation: {
    tenantFullName: string;
  };
};

export default function AcceptInviteScreen(): React.ReactElement {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === "string" ? params.token : "";
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tenantFullName, setTenantFullName] = useState<string | null>(null);

  useEffect(() => {
    async function loadInvitation(): Promise<void> {
      if (!token) {
        setError(t("auth.invalidLink"));
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
  }, [t, token]);

  function openWebActivation(): void {
    const url = `${env.apiBaseUrl}/invite?token=${encodeURIComponent(token)}`;
    void Linking.openURL(url);
  }

  return (
    <>
      <Stack.Screen options={{ title: t("auth.inviteTitle"), headerShown: false }} />
      <View style={styles.root}>
        {isLoading ? (
          <ScreenLoader />
        ) : (
          <View style={styles.content}>
            {error ? (
              <View style={styles.card}>
                <Text style={styles.title}>{t("auth.invalidLinkTitle")}</Text>
                <Text style={styles.body}>{error}</Text>
              </View>
            ) : (
              <View style={styles.card}>
                <Text style={styles.title}>
                  {tenantFullName
                    ? t("auth.welcomeNamed", { name: tenantFullName })
                    : t("auth.welcome")}
                </Text>
                <Text style={styles.body}>{t("auth.inviteBody")}</Text>
                <Pressable style={styles.button} onPress={openWebActivation}>
                  <Text style={styles.buttonText}>{t("auth.openActivation")}</Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </View>
    </>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: colors.backgroundAlt
    },
    content: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 20
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.borderStrong,
      padding: 24,
      gap: 14
    },
    title: {
      fontSize: fontSize.emphasis,
      fontWeight: fontWeight.semibold,
      color: colors.text
    },
    body: {
      fontSize: fontSize.body,
      lineHeight: 22,
      color: colors.textMuted
    },
    button: {
      marginTop: 8,
      borderRadius: 10,
      minHeight: 52,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.brand
    },
    buttonText: {
      color: colors.onBrand,
      fontSize: fontSize.body,
      fontWeight: "700"
    }
  });
}
