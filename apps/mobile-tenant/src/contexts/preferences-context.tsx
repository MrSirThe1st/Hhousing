import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { Appearance } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import i18n from "@/i18n";
import { detectDeviceLanguage, isAppLanguage, type AppLanguage } from "@/i18n/types";

const BIOMETRIC_KEY = "hhousing.prefs.biometricEnabled";
const BIOMETRIC_PROMPT_SHOWN_KEY = "hhousing.prefs.biometricPromptShown";
const LANGUAGE_KEY = "hhousing.prefs.language";
const LANGUAGE_SELECTED_KEY = "hhousing.prefs.languageSelected";
const NOTIFY_INVOICES_KEY = "hhousing.prefs.notifyInvoices";
const NOTIFY_RENT_DUE_KEY = "hhousing.prefs.notifyRentDue";
const AMOUNTS_SENSITIVE_KEY = "hhousing.prefs.amountsSensitive";

export type ThemeMode = "light" | "dark";

function resolveSystemThemeMode(): ThemeMode {
  return Appearance.getColorScheme() === "dark" ? "dark" : "light";
}

function followSystemColorScheme(): void {
  Appearance.setColorScheme(null);
}

type PreferencesContextValue = {
  isReady: boolean;
  languageSelected: boolean;
  biometricPromptShown: boolean;
  biometricEnabled: boolean;
  themeMode: ThemeMode;
  language: AppLanguage;
  notifyInvoices: boolean;
  notifyRentDue: boolean;
  amountsSensitive: boolean;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  markLanguageSelected: () => Promise<void>;
  markBiometricPromptShown: () => Promise<void>;
  /** Applies language in-memory for onboarding preview (not persisted). */
  previewLanguage: (language: AppLanguage) => Promise<void>;
  setLanguage: (language: AppLanguage) => Promise<void>;
  setNotifyInvoices: (enabled: boolean) => Promise<void>;
  setNotifyRentDue: (enabled: boolean) => Promise<void>;
  setAmountsSensitive: (enabled: boolean) => Promise<void>;
};

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function parseBoolean(raw: string | null, fallback: boolean): boolean {
  if (raw === "true") return true;
  if (raw === "false") return false;
  return fallback;
}

export function PreferencesProvider({ children }: PropsWithChildren): React.ReactElement {
  const [isReady, setIsReady] = useState(false);
  const [languageSelected, setLanguageSelectedState] = useState(false);
  const [biometricPromptShown, setBiometricPromptShownState] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(resolveSystemThemeMode);
  const [language, setLanguageState] = useState<AppLanguage>("fr");
  const [notifyInvoices, setNotifyInvoicesState] = useState(false);
  const [notifyRentDue, setNotifyRentDueState] = useState(false);
  const [amountsSensitive, setAmountsSensitiveState] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function bootstrap(): Promise<void> {
      try {
        const [
          biometricRaw,
          biometricPromptRaw,
          languageRaw,
          languageSelectedRaw,
          invoicesRaw,
          rentDueRaw,
          amountsSensitiveRaw
        ] = await Promise.all([
          AsyncStorage.getItem(BIOMETRIC_KEY),
          AsyncStorage.getItem(BIOMETRIC_PROMPT_SHOWN_KEY),
          AsyncStorage.getItem(LANGUAGE_KEY),
          AsyncStorage.getItem(LANGUAGE_SELECTED_KEY),
          AsyncStorage.getItem(NOTIFY_INVOICES_KEY),
          AsyncStorage.getItem(NOTIFY_RENT_DUE_KEY),
          AsyncStorage.getItem(AMOUNTS_SENSITIVE_KEY)
        ]);

        if (!mounted) {
          return;
        }

        setBiometricEnabledState(parseBoolean(biometricRaw, false));
        setNotifyInvoicesState(parseBoolean(invoicesRaw, false));
        setNotifyRentDueState(parseBoolean(rentDueRaw, false));
        setAmountsSensitiveState(parseBoolean(amountsSensitiveRaw, true));

        // Only skip the post-login offer when it was explicitly dismissed/completed,
        // or biometrics are already enabled.
        setBiometricPromptShownState(
          biometricPromptRaw === "true" || biometricRaw === "true"
        );

        // Existing installs that already persisted a language skip the picker.
        setLanguageSelectedState(
          languageSelectedRaw === "true" || languageRaw !== null
        );

        setThemeModeState(resolveSystemThemeMode());
        followSystemColorScheme();

        const nextLanguage: AppLanguage = isAppLanguage(languageRaw)
          ? languageRaw
          : detectDeviceLanguage();
        setLanguageState(nextLanguage);
        if (i18n.language !== nextLanguage) {
          await i18n.changeLanguage(nextLanguage);
        }
      } finally {
        if (mounted) {
          setIsReady(true);
        }
      }
    }

    void bootstrap();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setThemeModeState(colorScheme === "dark" ? "dark" : "light");
    });
    return () => {
      subscription.remove();
    };
  }, []);

  const setBiometricEnabled = useCallback(async (enabled: boolean): Promise<void> => {
    setBiometricEnabledState(enabled);
    await AsyncStorage.setItem(BIOMETRIC_KEY, enabled ? "true" : "false");
  }, []);

  const markLanguageSelected = useCallback(async (): Promise<void> => {
    setLanguageSelectedState(true);
    await AsyncStorage.setItem(LANGUAGE_SELECTED_KEY, "true");
  }, []);

  const markBiometricPromptShown = useCallback(async (): Promise<void> => {
    setBiometricPromptShownState(true);
    await AsyncStorage.setItem(BIOMETRIC_PROMPT_SHOWN_KEY, "true");
  }, []);

  const previewLanguage = useCallback(async (next: AppLanguage): Promise<void> => {
    setLanguageState(next);
    await i18n.changeLanguage(next);
  }, []);

  const setLanguage = useCallback(async (next: AppLanguage): Promise<void> => {
    setLanguageState(next);
    await AsyncStorage.setItem(LANGUAGE_KEY, next);
    await i18n.changeLanguage(next);
  }, []);

  const setNotifyInvoices = useCallback(async (enabled: boolean): Promise<void> => {
    setNotifyInvoicesState(enabled);
    await AsyncStorage.setItem(NOTIFY_INVOICES_KEY, enabled ? "true" : "false");
  }, []);

  const setNotifyRentDue = useCallback(async (enabled: boolean): Promise<void> => {
    setNotifyRentDueState(enabled);
    await AsyncStorage.setItem(NOTIFY_RENT_DUE_KEY, enabled ? "true" : "false");
  }, []);

  const setAmountsSensitive = useCallback(async (enabled: boolean): Promise<void> => {
    setAmountsSensitiveState(enabled);
    await AsyncStorage.setItem(AMOUNTS_SENSITIVE_KEY, enabled ? "true" : "false");
  }, []);

  const value = useMemo(
    () => ({
      isReady,
      languageSelected,
      biometricPromptShown,
      biometricEnabled,
      themeMode,
      language,
      notifyInvoices,
      notifyRentDue,
      amountsSensitive,
      setBiometricEnabled,
      markLanguageSelected,
      markBiometricPromptShown,
      previewLanguage,
      setLanguage,
      setNotifyInvoices,
      setNotifyRentDue,
      setAmountsSensitive
    }),
    [
      isReady,
      languageSelected,
      biometricPromptShown,
      biometricEnabled,
      themeMode,
      language,
      notifyInvoices,
      notifyRentDue,
      amountsSensitive,
      setBiometricEnabled,
      markLanguageSelected,
      markBiometricPromptShown,
      previewLanguage,
      setLanguage,
      setNotifyInvoices,
      setNotifyRentDue,
      setAmountsSensitive
    ]
  );

  return (
    <PreferencesContext.Provider value={value}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const value = useContext(PreferencesContext);
  if (!value) {
    throw new Error("usePreferences must be used within PreferencesProvider");
  }
  return value;
}
