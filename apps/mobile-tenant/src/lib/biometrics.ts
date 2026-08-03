import * as LocalAuthentication from "expo-local-authentication";
import type { LocalAuthenticationError } from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";
import i18n from "@/i18n";

const CREDENTIALS_KEY = "hhousing.biometric.credentials";

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_PASSCODE_SET_THIS_DEVICE_ONLY
};

const SECURE_STORE_FALLBACK_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY
};

export type StoredCredentials = {
  phone: string;
  password: string;
};

export type BiometricAvailability = {
  hardware: boolean;
  enrolled: boolean;
  available: boolean;
};

export type BiometricAuthResult = {
  success: boolean;
  /** User dismissed the prompt without completing auth. */
  cancelled: boolean;
  error: LocalAuthenticationError | null;
};

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  const hardware = await LocalAuthentication.hasHardwareAsync();
  const enrolled = hardware ? await LocalAuthentication.isEnrolledAsync() : false;
  return {
    hardware,
    enrolled,
    available: hardware && enrolled
  };
}

/**
 * Prompts Face ID / fingerprint. On failure or cancel, callers should offer
 * the account password fallback (this app has no PIN).
 */
export async function authenticateWithBiometrics(promptMessage: string): Promise<BiometricAuthResult> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      cancelLabel: i18n.t("common.cancel"),
      // Biometrics only — account password is the app-level fallback.
      disableDeviceFallback: true
    });

    if (result.success) {
      return { success: true, cancelled: false, error: null };
    }

    const error = result.error;
    const cancelled =
      error === "user_cancel" ||
      error === "app_cancel" ||
      error === "system_cancel" ||
      error === "user_fallback";

    return { success: false, cancelled, error };
  } catch {
    return { success: false, cancelled: false, error: "unknown" };
  }
}

export function biometricFailureMessage(result: BiometricAuthResult): string | null {
  if (result.success || result.cancelled) {
    return null;
  }

  switch (result.error) {
    case "lockout":
      return i18n.t("biometric.lockout");
    case "not_enrolled":
    case "passcode_not_set":
      return i18n.t("biometric.notEnrolled");
    case "not_available":
      return i18n.t("biometric.unavailable");
    case "authentication_failed":
      return i18n.t("biometric.failedFallback");
    default:
      return i18n.t("biometric.failedFallback");
  }
}

export async function saveBiometricCredentials(credentials: StoredCredentials): Promise<void> {
  const payload = JSON.stringify(credentials);
  try {
    await SecureStore.setItemAsync(CREDENTIALS_KEY, payload, SECURE_STORE_OPTIONS);
  } catch {
    // Device may have no passcode — fall back to unlock-gated keychain.
    await SecureStore.setItemAsync(CREDENTIALS_KEY, payload, SECURE_STORE_FALLBACK_OPTIONS);
  }
}

export async function getBiometricCredentials(): Promise<StoredCredentials | null> {
  let raw: string | null = null;
  try {
    raw = await SecureStore.getItemAsync(CREDENTIALS_KEY, SECURE_STORE_OPTIONS);
  } catch {
    raw = await SecureStore.getItemAsync(CREDENTIALS_KEY, SECURE_STORE_FALLBACK_OPTIONS);
  }

  if (!raw) {
    // Try the fallback accessibility level if the primary read returned null.
    raw = await SecureStore.getItemAsync(CREDENTIALS_KEY, SECURE_STORE_FALLBACK_OPTIONS);
  }

  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<StoredCredentials>;
    if (typeof parsed.phone === "string" && typeof parsed.password === "string") {
      return { phone: parsed.phone, password: parsed.password };
    }
  } catch {
    // Corrupted payload — clear it.
  }

  await clearBiometricCredentials();
  return null;
}

export async function hasBiometricCredentials(): Promise<boolean> {
  const credentials = await getBiometricCredentials();
  return credentials !== null;
}

export async function verifyStoredPassword(password: string): Promise<boolean> {
  const credentials = await getBiometricCredentials();
  if (!credentials) {
    return false;
  }
  return credentials.password === password;
}

export async function clearBiometricCredentials(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY, SECURE_STORE_OPTIONS);
  } catch {
    // ignore
  }
  try {
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY, SECURE_STORE_FALLBACK_OPTIONS);
  } catch {
    // ignore
  }
}
