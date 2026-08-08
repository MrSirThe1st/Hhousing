import type {
  PlatformBillingDisplayStatus,
  PlatformSaasPaymentMethod,
  PlatformSubscriptionInvoice
} from "@hhousing/domain";
import { resolvePlatformBillingDisplayStatus } from "@hhousing/domain";

export function formatBillingMoney(amount: number, currency: string): string {
  return `${amount.toLocaleString("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  })} ${currency}`;
}

export function formatBillingDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("fr-FR");
}

export function formatBillingPeriod(period: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(period);
  if (!match) return period;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 1));
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });
}

export function billingDisplayStatus(
  invoice: Pick<PlatformSubscriptionInvoice, "status" | "dueAtIso">
): PlatformBillingDisplayStatus {
  return resolvePlatformBillingDisplayStatus(invoice);
}

export function billingStatusLabel(status: PlatformBillingDisplayStatus): string {
  switch (status) {
    case "issued":
      return "En attente";
    case "paid":
      return "Payée";
    case "overdue":
      return "En retard";
    case "void":
      return "Annulée";
    default:
      return status;
  }
}

export function billingStatusDot(status: PlatformBillingDisplayStatus): string {
  switch (status) {
    case "issued":
      return "🟠";
    case "paid":
      return "🟢";
    case "overdue":
      return "🔴";
    case "void":
      return "⚫";
    default:
      return "";
  }
}

export function billingStatusBadgeClass(status: PlatformBillingDisplayStatus): string {
  switch (status) {
    case "issued":
      return "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200";
    case "paid":
      return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300";
    case "overdue":
      return "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200";
    case "void":
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function paymentMethodLabel(method: PlatformSaasPaymentMethod | null | undefined): string {
  switch (method) {
    case "orange":
      return "Orange Money";
    case "airtel":
      return "Airtel Money";
    case "mpesa":
      return "M-Pesa";
    case "other":
      return "Autre";
    default:
      return "—";
  }
}

export function overdueDays(dueAtIso: string, nowMs = Date.now()): number {
  const due = new Date(dueAtIso).getTime();
  if (Number.isNaN(due) || due >= nowMs) return 0;
  return Math.max(1, Math.floor((nowMs - due) / (24 * 60 * 60 * 1000)));
}

export interface SaasOfflinePaymentMethod {
  id: PlatformSaasPaymentMethod;
  label: string;
  colorClass: string;
  accountNumber: string | null;
  accountName: string | null;
}

export interface SaasBillingPaymentConfig {
  pawapayEnabled: boolean;
  instructions: string | null;
  methods: SaasOfflinePaymentMethod[];
}

export function readSaasBillingPaymentConfig(
  env: NodeJS.ProcessEnv = process.env
): SaasBillingPaymentConfig {
  const pawapayEnabled =
    env.PAWAPAY_SAAS_ENABLED === "1" ||
    env.PAWAPAY_SAAS_ENABLED === "true" ||
    env.NEXT_PUBLIC_PAWAPAY_SAAS_ENABLED === "1" ||
    env.NEXT_PUBLIC_PAWAPAY_SAAS_ENABLED === "true";

  const methods: SaasOfflinePaymentMethod[] = [
    {
      id: "orange",
      label: "Orange Money",
      colorClass: "text-orange-600",
      accountNumber: env.SAAS_BILLING_ORANGE_MONEY_NUMBER?.trim() || null,
      accountName: env.SAAS_BILLING_ORANGE_MONEY_NAME?.trim() || null
    },
    {
      id: "airtel",
      label: "Airtel Money",
      colorClass: "text-sky-600",
      accountNumber: env.SAAS_BILLING_AIRTEL_MONEY_NUMBER?.trim() || null,
      accountName: env.SAAS_BILLING_AIRTEL_MONEY_NAME?.trim() || null
    },
    {
      id: "mpesa",
      label: "M-Pesa",
      colorClass: "text-emerald-600",
      accountNumber: env.SAAS_BILLING_MPESA_NUMBER?.trim() || null,
      accountName: env.SAAS_BILLING_MPESA_NAME?.trim() || null
    }
  ];

  return {
    pawapayEnabled,
    instructions: env.SAAS_BILLING_PAYMENT_INSTRUCTIONS?.trim() || null,
    methods
  };
}
