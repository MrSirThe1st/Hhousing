import type { PawapayProviderCode } from "@hhousing/domain";

export interface PawapayConfig {
  apiToken: string;
  apiBaseUrl: string;
  defaultCountry: string;
  env: "sandbox" | "production";
}

/**
 * Normalize a pasted PawaPay token. Vercel/env UIs often get values like
 * `PAWAPAY_API_TOKEN=eyJ...`, `Bearer eyJ...`, or duplicated pastes.
 */
export function normalizePawapayApiToken(raw: string | undefined): string | null {
  if (!raw) {
    return null;
  }

  let value = raw.trim().replace(/^["']|["']$/g, "");

  // Take the first JWT-looking segment if the value was pasted multiple times.
  const jwtMatch = value.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  if (jwtMatch) {
    return jwtMatch[0];
  }

  value = value
    .replace(/^PAWAPAY_API_TOKEN\s*=\s*/i, "")
    .replace(/^Bearer\s+/i, "")
    .trim();

  return value.length > 0 ? value : null;
}

export function readPawapayConfig(env: NodeJS.ProcessEnv = process.env): PawapayConfig | null {
  const apiToken = normalizePawapayApiToken(env.PAWAPAY_API_TOKEN);
  const apiBaseUrl = env.PAWAPAY_API_BASE_URL?.trim() ?? "https://api.sandbox.pawapay.io";
  const defaultCountry = env.PAWAPAY_DEFAULT_COUNTRY?.trim() ?? "COD";
  const envName = env.PAWAPAY_ENV?.trim() === "production" ? "production" : "sandbox";

  if (!apiToken) {
    return null;
  }

  return {
    apiToken,
    apiBaseUrl: apiBaseUrl.replace(/\/$/, ""),
    defaultCountry,
    env: envName
  };
}

export const PAWAPAY_PROVIDER_OPTIONS: Array<{
  code: PawapayProviderCode;
  label: string;
}> = [
  { code: "AIRTEL_COD", label: "Airtel Money" },
  { code: "ORANGE_COD", label: "Orange Money" },
  { code: "VODACOM_MPESA_COD", label: "M-Pesa" }
];

export function isPawapayProviderCode(value: string): value is PawapayProviderCode {
  return PAWAPAY_PROVIDER_OPTIONS.some((option) => option.code === value);
}
