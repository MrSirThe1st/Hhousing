import { useEffect, useRef, useState } from "react";
import { Slot, useRouter, useSegments } from "expo-router";
import { Appearance, Text, TextInput } from "react-native";
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
import { BlockingLoadingScreen } from "@/components/universal-loading-state";
import { getWithAuth } from "@/lib/api-client";
import { subscribeAccountDeletionChanged } from "@/lib/account-deletion-gate";
import { clearPendingBiometricCredentials } from "@/lib/pending-biometric-credentials";
import { maxFontSizeMultiplier, useTheme } from "@/theme";

void SplashScreen.preventAutoHideAsync();
SplashScreen.setOptions({
  duration: 200,
  fade: true
});
// Prefer light splash immediately; prefs may switch to dark before hide.
Appearance.setColorScheme("light");

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

/**
 * Single source of truth for where the user should be.
 * No intermediate “gate ready” flags — those caused login/home/loader to fight.
 */
function RootNavigator(): React.ReactElement {
  const { session, isLoading } = useAuth();
  const { languageSelected, biometricPromptShown, isReady } = usePreferences();
  const segments = useSegments();
  const router = useRouter();

  const group = segments[0];
  const leaf = segments[1];
  const isAuthRoute = group === "(auth)";
  const isOnboardingRoute = group === "(onboarding)";
  const isDeleteAccountRoute =
    group === "(tabs)" && leaf === "account" && segments[2] === "delete-account";

  const sessionUserId = session?.user?.id ?? null;
  const [pendingDeletion, setPendingDeletion] = useState(false);
  const pendingDeletionRef = useRef(false);

  useEffect(() => {
    // Keep the native splash up until prefs + auth are ready and the color
    // scheme matches the in-app theme (light by default).
    if (!isReady || isLoading) {
      return;
    }
    void SplashScreen.hideAsync();
  }, [isReady, isLoading]);

  // Soft deletion check — only redirects when true; never blanks the UI.
  useEffect(() => {
    let cancelled = false;

    async function checkDeletion(): Promise<void> {
      if (!sessionUserId) {
        if (!cancelled && pendingDeletionRef.current) {
          pendingDeletionRef.current = false;
          setPendingDeletion(false);
        }
        return;
      }

      const result = await getWithAuth<{
        deletion: { accountStatus: string };
      }>("/api/mobile/auth/delete-account");

      if (cancelled) {
        return;
      }

      const next =
        (result.success && result.data.deletion.accountStatus === "pending_deletion")
        || (!result.success && result.code === "ACCOUNT_PENDING_DELETION");

      if (next !== pendingDeletionRef.current) {
        pendingDeletionRef.current = next;
        setPendingDeletion(next);
        if (next) {
          clearPendingBiometricCredentials();
        }
      }
    }

    void checkDeletion();
    return subscribeAccountDeletionChanged(() => {
      void checkDeletion();
    });
  }, [sessionUserId]);

  // Imperative replace avoids stacked Redirect + Modal races.
  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!languageSelected) {
      if (!(isOnboardingRoute && leaf === "language")) {
        router.replace("/(onboarding)/language");
      }
      return;
    }

    if (!sessionUserId) {
      if (!isAuthRoute) {
        router.replace("/(auth)/login");
      }
      return;
    }

    if (pendingDeletion) {
      if (!isDeleteAccountRoute) {
        router.replace("/(tabs)/account/delete-account");
      }
      return;
    }

    if (!biometricPromptShown) {
      if (!(isOnboardingRoute && leaf === "biometric")) {
        router.replace("/(onboarding)/biometric");
      }
      return;
    }

    if (isAuthRoute || isOnboardingRoute) {
      router.replace("/(tabs)");
    }
  }, [
    isLoading,
    languageSelected,
    sessionUserId,
    pendingDeletion,
    biometricPromptShown,
    isAuthRoute,
    isOnboardingRoute,
    isDeleteAccountRoute,
    leaf,
    router
  ]);

  if (isLoading) {
    return <BlockingLoadingScreen />;
  }

  // While logged-in routing settles, show one blocker — never login+home together.
  if (sessionUserId && !pendingDeletion && !biometricPromptShown && !(isOnboardingRoute && leaf === "biometric")) {
    return <BlockingLoadingScreen />;
  }

  if (sessionUserId && biometricPromptShown && !pendingDeletion && (isAuthRoute || isOnboardingRoute)) {
    return <BlockingLoadingScreen />;
  }

  if (!sessionUserId && !isAuthRoute && languageSelected) {
    return <BlockingLoadingScreen />;
  }

  return <Slot />;
}

function ThemedApp(): React.ReactElement {
  const { isReady, themeMode } = usePreferences();
  const { colors } = useTheme();

  useEffect(() => {
    if (!isReady) {
      return;
    }
    Appearance.setColorScheme(themeMode);
  }, [isReady, themeMode]);

  if (!isReady) {
    return <BlockingLoadingScreen />;
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
