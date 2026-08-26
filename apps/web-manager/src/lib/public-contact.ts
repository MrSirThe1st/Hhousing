import { LEGAL_CONTACT_EMAIL } from "./legal/site-legal";

/** Default public contact number (RDC). Override with NEXT_PUBLIC_CONTACT_WHATSAPP. */
const DEFAULT_CONTACT_WHATSAPP = "243994380039";

/** Digits-only WhatsApp number for wa.me links (e.g. 243900000000). */
export function getContactWhatsAppNumber(): string | null {
  const raw = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP?.trim() || DEFAULT_CONTACT_WHATSAPP;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 10 ? digits : null;
}

export function buildWhatsAppContactUrl(message?: string): string | null {
  const number = getContactWhatsAppNumber();
  if (!number) {
    return null;
  }
  const text = message?.trim()
    || "Bonjour, je souhaite en savoir plus sur Haraka Property.";
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

export function getPublicContactEmail(): string {
  return LEGAL_CONTACT_EMAIL;
}
