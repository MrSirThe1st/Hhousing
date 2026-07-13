import type { Tenant } from "@hhousing/domain";
import { normalizeDrcPhoneNumber } from "../pawapay/amount";

export function normalizeWhatsAppPhoneNumber(rawPhone: string): string | null {
  const drcNumber = normalizeDrcPhoneNumber(rawPhone);
  if (drcNumber) {
    return drcNumber;
  }

  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length >= 10 && digits.length <= 15) {
    return digits;
  }

  return null;
}

export function formatWhatsAppPhoneForDisplay(normalizedPhone: string): string {
  return `+${normalizedPhone}`;
}

export function resolveTenantWhatsAppRecipient(
  tenant: Pick<Tenant, "phone" | "whatsappNumber" | "whatsappOptIn">
): string | null {
  if (!tenant.whatsappOptIn) {
    return null;
  }

  const rawPhone = tenant.whatsappNumber ?? tenant.phone;
  if (!rawPhone) {
    return null;
  }

  return normalizeWhatsAppPhoneNumber(rawPhone);
}
