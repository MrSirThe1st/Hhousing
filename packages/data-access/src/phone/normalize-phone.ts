/**
 * Normalize phone numbers for tenant identity matching (WhatsApp / OTP login).
 * Prefer DRC (+243) rules, then fall back to international digits.
 */
export function normalizeTenantPhoneNumber(rawPhone: string): string | null {
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

  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }

  return null;
}
