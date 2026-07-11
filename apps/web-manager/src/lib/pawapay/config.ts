import type { PawapayProviderCode } from "@hhousing/domain";

export interface PawapayConfig {
  apiToken: string;
  apiBaseUrl: string;
  defaultCountry: string;
  env: "sandbox" | "production";
}

export function readPawapayConfig(env: NodeJS.ProcessEnv = process.env): PawapayConfig | null {
  const apiToken = env.PAWAPAY_API_TOKEN?.trim();
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
