import { useEffect, useState } from "react";
import { Redirect, Slot, useSegments } from "expo-router";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { SafeAreaProvider } from "react-native-safe-area-context";
import "@/i18n";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { BiometricLockProvider } from "@/contexts/biometric-lock-context";
import { InboxProvider } from "@/contexts/inbox-context";
import { AmountPrivacyProvider } from "@/contexts/amount-privacy-context";
import { PreferencesProvider, usePreferences } from "@/contexts/preferences-context";
import { BiometricLockScreen } from "@/components/biometric-lock-screen";
import { getWithAuth } from "@/lib/api-client";
import { subscribeAccountDeletionChanged } from "@/lib/account-deletion-gate";
import { maxFontSizeMultiplier, useTheme } from "@/theme";

// Keep the native splash up on cold start until auth + prefs are ready.
void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({
  duration: 200,
  fade: true
});

// Keep Dynamic Type from blowing up form layouts.
const TextWithDefaults = Text as typeof Text & {
  defaultProps?: { maxFontSizeMultiplier?: number };
};
const TextInputWithDefaults = TextInput as typeof TextInput & {
  defaultProps?: { maxFontSizeMultiplier?: number };
};
TextWithDefaults.defaultProps = {
  ...(TextWithDefaults.defaultProps ?? {}),
  maxFontSizeMultiplier
};
TextInputWithDefaults.defaultProps = {
  ...(TextInputWithDefaults.defaultProps ?? {}),
  maxFontSizeMultiplier
};

function RootNavigator(): React.ReactElement {
  const { session, isLoading } = useAuth();
  const { languageSelected, biometricPromptShown } = usePreferences();
  const segments = useSegments();
  const isAuthRoute = segments[0] === "(auth)";
  const isOnboardingRoute = segments[0] === "(onboarding)";
  const onboardingStep = isOnboardingRoute ? segments[1] : undefined;
  const isDeleteAccountRoute =
    segments[0] === "(tabs)"
    && segments[1] === "account"
    && segments[2] === "delete-account";

  const [pendingDeletion, setPendingDeletion] = useState(false);
  const [deletionChecked, setDeletionChecked] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    void SplashScreen.hideAsync();
  }, [isLoading]);

  useEffect(() => {
    let cancelled = false;
    let revision = 0;

    async function checkDeletion(): Promise<void> {
      const currentRevision = ++revision;
      if (!session) {
        if (!cancelled) {
          setPendingDeletion(false);
          setDeletionChecked(true);
        }
        return;
      }

      setDeletionChecked(false);
      const result = await getWithAuth<{
        deletion: { accountStatus: string };
      }>("/api/mobile/auth/delete-account");

      if (cancelled || currentRevision !== revision) {
        return;
      }

      if (result.success) {
        setPendingDeletion(result.data.deletion.accountStatus === "pending_deletion");
      } else if (result.code === "ACCOUNT_PENDING_DELETION") {
        setPendingDeletion(true);
      } else {
        setPendingDeletion(false);
      }
      setDeletionChecked(true);
    }

    void checkDeletion();
    const unsubscribe = subscribeAccountDeletionChanged(() => {
      void checkDeletion();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [session]);

  if (isLoading || (session && !deletionChecked)) {
    // Native splash still covers this; avoid a spinner flash underneath.
    return <View style={styles.loadingRoot} />;
  }

  if (!languageSelected) {
    if (onboardingStep !== "language") {
      return <Redirect href="/(onboarding)/language" />;
    }
    return <Slot />;
  }

  if (!biometricPromptShown) {
    if (onboardingStep !== "biometric") {
      return <Redirect href="/(onboarding)/biometric" />;
    }
    return <Slot />;
  }

  if (isOnboardingRoute) {
    return <Redirect href={session ? "/(tabs)" : "/(auth)/login"} />;
  }

  if (!session && !isAuthRoute) {
    return <Redirect href="/(auth)/login" />;
  }

  if (session && isAuthRoute) {
    return <Redirect href={pendingDeletion ? "/(tabs)/account/delete-account" : "/(tabs)"} />;
  }

  if (session && pendingDeletion && !isDeleteAccountRoute) {
    return <Redirect href="/(tabs)/account/delete-account" />;
  }

  return <Slot />;
}

function ThemedApp(): React.ReactElement {
  const { isReady } = usePreferences();
  const { colors } = useTheme();

  if (!isReady) {
    return <View style={styles.loadingRoot} />;
  }

  return (
    <>
      <StatusBar style={colors.statusBarStyle === "light" ? "light" : "dark"} />
      <AuthProvider>
        <BiometricLockProvider>
          <AmountPrivacyProvider>
            <InboxProvider>
              <RootNavigator />
              <BiometricLockScreen />
            </InboxProvider>
          </AmountPrivacyProvider>
        </BiometricLockProvider>
      </AuthProvider>
    </>
  );
}

export default function RootLayout(): React.ReactElement {
  return (
    <SafeAreaProvider>
      <PreferencesProvider>
        <ThemedApp />
      </PreferencesProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingRoot: {
    flex: 1
  }
});
