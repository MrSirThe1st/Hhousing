import Constants from "expo-constants";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim();
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim();
const hostedApiBaseUrl = "https://www.harakaproperty.com";

function extractHost(value: string): string | null {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return null;
  }

  if (trimmedValue.includes("://")) {
    try {
      return new URL(trimmedValue).hostname;
    } catch {
      return null;
    }
  }

  const [hostAndPort] = trimmedValue.split("/");
  const [host] = hostAndPort.split(":");
  return host || null;
}

function resolveDevHost(): string | null {
  const hostFromExpoConfig = extractHost(Constants.expoConfig?.hostUri ?? "");

  if (hostFromExpoConfig) {
    return hostFromExpoConfig;
  }

  const hostFromLinking = extractHost(Constants.linkingUri ?? "");
  return hostFromLinking;
}

function resolveApiBaseUrl(): string {
  const explicitApiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();

  if (explicitApiBaseUrl) {
    return explicitApiBaseUrl.replace(/\/$/, "");
  }

  if (!__DEV__) {
    return hostedApiBaseUrl;
  }

  const host = resolveDevHost();

  if (host && host !== "localhost") {
    return `http://${host}:3000`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:3000";
  }

  return "http://127.0.0.1:3000";
}

const apiBaseUrl = resolveApiBaseUrl();

if (!supabaseUrl) {
  throw new Error("EXPO_PUBLIC_SUPABASE_URL is required");
}

if (!supabasePublishableKey) {
  throw new Error("EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required");
}

export const env = {
  supabaseUrl,
  supabasePublishableKey,
  apiBaseUrl,
  hostedApiBaseUrl
};
