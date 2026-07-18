/**
 * Client-side DRC phone helpers for tenant inputs.
 * Stored/submitted value: +243XXXXXXXXX (E.164-style with leading +).
 */

export const DRC_COUNTRY_CODE = "243";
export const DRC_NATIONAL_LENGTH = 9;

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

/** Extract the 9-digit Congolese national number from common paste formats. */
export function extractDrcNationalNumber(raw: string): string {
  const digits = digitsOnly(raw);

  if (digits.startsWith(DRC_COUNTRY_CODE)) {
    return digits.slice(DRC_COUNTRY_CODE.length, DRC_COUNTRY_CODE.length + DRC_NATIONAL_LENGTH);
  }

  if (digits.startsWith("0")) {
    return digits.slice(1, 1 + DRC_NATIONAL_LENGTH);
  }

  return digits.slice(0, DRC_NATIONAL_LENGTH);
}

/** Format national digits as `990 000 000`. */
export function formatDrcNationalDisplay(nationalDigits: string): string {
  const digits = digitsOnly(nationalDigits).slice(0, DRC_NATIONAL_LENGTH);
  const parts: string[] = [];

  if (digits.length > 0) {
    parts.push(digits.slice(0, 3));
  }
  if (digits.length > 3) {
    parts.push(digits.slice(3, 6));
  }
  if (digits.length > 6) {
    parts.push(digits.slice(6, 9));
  }

  return parts.join(" ");
}

export function toDrcE164(nationalDigits: string): string {
  const digits = digitsOnly(nationalDigits).slice(0, DRC_NATIONAL_LENGTH);
  return `+${DRC_COUNTRY_CODE}${digits}`;
}

export function isCompleteDrcNational(nationalDigits: string): boolean {
  return digitsOnly(nationalDigits).length === DRC_NATIONAL_LENGTH;
}

export function validateDrcPhoneInput(rawOrNational: string): string | null {
  const national = extractDrcNationalNumber(rawOrNational);
  if (national.length === 0) {
    return "Le numéro de téléphone est requis.";
  }
  if (!isCompleteDrcNational(national)) {
    return "Entrez un numéro congolais à 9 chiffres (ex. 990 000 000).";
  }
  return null;
}

/** Parse an existing stored phone into national digits for the input. */
export function nationalFromStoredPhone(stored: string | null | undefined): string {
  if (!stored) {
    return "";
  }
  return extractDrcNationalNumber(stored);
}
