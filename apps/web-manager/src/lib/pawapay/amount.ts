import type { PawapayProviderCode } from "@hhousing/domain";

export function formatPawapayAmount(amount: number, provider: PawapayProviderCode): string {
  if (provider === "VODACOM_MPESA_COD") {
    return String(Math.round(amount));
  }

  return amount.toFixed(2);
}

export function normalizeDrcPhoneNumber(rawPhone: string): string | null {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length === 0) {
    return null;
  }

  if (digits.startsWith("243") && digits.length >= 11) {
    return digits;
  }

  if (digits.startsWith("0") && digits.length >= 10) {
    return `243${digits.slice(1)}`;
  }

  if (digits.length === 9) {
    return `243${digits}`;
  }

  return null;
}

export function isFinalPawapayDepositStatus(status: string): boolean {
  return status === "COMPLETED" || status === "FAILED";
}

export function isSuccessfulPawapayDepositStatus(status: string): boolean {
  return status === "COMPLETED";
}
