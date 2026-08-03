import { getLocales } from "expo-localization";

export type AppLanguage = "fr" | "en";

export const APP_LANGUAGES: AppLanguage[] = ["fr", "en"];

export function isAppLanguage(value: string | null | undefined): value is AppLanguage {
  return value === "fr" || value === "en";
}

export function localeTagForLanguage(language: AppLanguage): string {
  return language === "en" ? "en-US" : "fr-FR";
}

/** Prefer device language when it is fr/en; otherwise French. */
export function detectDeviceLanguage(): AppLanguage {
  try {
    const locales = getLocales();
    for (const locale of locales) {
      const code = (locale.languageCode ?? "").toLowerCase();
      if (isAppLanguage(code)) {
        return code;
      }
    }
  } catch {
    // Fall through to default.
  }
  return "fr";
}
