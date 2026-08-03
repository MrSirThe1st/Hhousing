import i18n from "i18next";
import { isAppLanguage, localeTagForLanguage, type AppLanguage } from "./types";

function currentLanguage(): AppLanguage {
  return isAppLanguage(i18n.language) ? i18n.language : "fr";
}

function currentLocaleTag(): string {
  return localeTagForLanguage(currentLanguage());
}

/** Format amount with dotted thousands (DRC-friendly) and currency code suffix. */
export function formatAmount(amount: number, currencyCode: string): string {
  const formatted = new Intl.NumberFormat(currentLocaleTag(), {
    maximumFractionDigits: 0
  }).format(amount);
  return `${formatted.replace(/\u00A0|\s/g, ".")} ${currencyCode}`;
}

/** Format YYYY-MM-DD as "d MMMM yyyy" using the active locale. */
export function formatDueDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map((part) => parseInt(part, 10));
  if (!year || !month || !day) {
    return dateStr;
  }
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat(currentLocaleTag(), {
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(date);
}

/** Format YYYY-MM-DD as "dd MMM yyyy". */
export function formatHistoryDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map((part) => parseInt(part, 10));
  if (!year || !month || !day) {
    return dateStr;
  }
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat(currentLocaleTag(), {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

/** Format YYYY-MM-DD as dd/MM/yyyy. */
export function formatNumericDate(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map((part) => parseInt(part, 10));
  if (!year || !month || !day) {
    return dateStr;
  }
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

/** Long month name from YYYY-MM-DD (e.g. "Janvier" / "January"). */
export function monthNameFromYmd(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map((part) => parseInt(part, 10));
  if (!year || !month) {
    return "";
  }
  const date = new Date(year, month - 1, day || 1);
  return new Intl.DateTimeFormat(currentLocaleTag(), { month: "long" }).format(date);
}

/** Uppercase month + year label for grouping (e.g. "JANVIER 2026"). */
export function monthGroupLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  const monthName = new Intl.DateTimeFormat(currentLocaleTag(), { month: "long" }).format(date);
  return `${monthName.toUpperCase()} ${year}`;
}

export function formatLocaleDate(value: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleDateString(currentLocaleTag(), options);
}

export function formatLocaleDateTime(value: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleString(currentLocaleTag(), options);
}
