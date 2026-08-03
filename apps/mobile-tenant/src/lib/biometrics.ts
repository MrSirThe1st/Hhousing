import { Platform } from "react-native";
import * as LocalAuthentication from "expo-local-authentication";
import {
  AuthenticationType,
  type LocalAuthenticationError
} from "expo-local-authentication";
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

/** How we present biometrics in UI for this device. */
export type BiometricModality = "face" | "fingerprint" | "biometric";

export type BiometricAvailability = {
  hardware: boolean;
  enrolled: boolean;
  available: boolean;
  modality: BiometricModality;
  types: AuthenticationType[];
};

export type BiometricAuthResult = {
  success: boolean;
  /** User dismissed the prompt without completing auth. */
  cancelled: boolean;
  error: LocalAuthenticationError | null;
};

export type BiometricIconName =
  | "scan-outline"
  | "finger-print-outline"
  | "shield-checkmark-outline";

export function resolveBiometricModality(types: AuthenticationType[]): BiometricModality {
  const hasFingerprint = types.includes(AuthenticationType.FINGERPRINT);
  const hasFace = types.includes(AuthenticationType.FACIAL_RECOGNITION);
  if (hasFace && hasFingerprint) {
    return "biometric";
  }
  if (hasFace) {
    return "face";
  }
  if (hasFingerprint) {
    return "fingerprint";
  }
  // Iris-only or unknown — keep copy generic.
  return "biometric";
}

/** Primary glyph for a modality. Prefer `biometricIconsForModality` when both apply. */
export function biometricIconForModality(modality: BiometricModality): BiometricIconName {
  switch (modality) {
    case "face":
      return "scan-outline";
    case "fingerprint":
      return "finger-print-outline";
    default:
      return "shield-checkmark-outline";
  }
}

/** Icons to show — two glyphs when the device supports face + fingerprint. */
export function biometricIconsForModality(modality: BiometricModality): BiometricIconName[] {
  if (modality === "biometric") {
    return ["scan-outline", "finger-print-outline"];
  }
  return [biometricIconForModality(modality)];
}

/** Localized short name: Face ID, Touch ID, Fingerprint, Biometrics, etc. */
export function biometricMethodLabel(modality: BiometricModality): string {
  if (modality === "face") {
    return Platform.OS === "ios"
      ? i18n.t("biometric.methodFaceId")
      : i18n.t("biometric.methodFace");
  }
  if (modality === "fingerprint") {
    return Platform.OS === "ios"
      ? i18n.t("biometric.methodTouchId")
      : i18n.t("biometric.methodFingerprint");
  }
  return i18n.t("biometric.methodBiometric");
}

export async function getBiometricAvailability(): Promise<BiometricAvailability> {
  const hardware = await LocalAuthentication.hasHardwareAsync();
  const types = hardware
    ? await LocalAuthentication.supportedAuthenticationTypesAsync()
    : [];
  const enrolled = hardware ? await LocalAuthentication.isEnrolledAsync() : false;
  return {
    hardware,
    enrolled,
    available: hardware && enrolled,
    modality: resolveBiometricModality(types),
    types
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
