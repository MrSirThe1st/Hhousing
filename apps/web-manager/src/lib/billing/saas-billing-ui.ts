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

export function billingStatusBadgeClass(status: PlatformBillingDisplayStatus): string {
  switch (status) {
    case "issued":
      return "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-950/50 dark:text-amber-200 dark:ring-amber-400/30";
    case "paid":
      return "bg-emerald-50 text-emerald-800 ring-1 ring-inset ring-emerald-600/20 dark:bg-emerald-950/50 dark:text-emerald-200 dark:ring-emerald-400/30";
    case "overdue":
      return "bg-red-50 text-red-800 ring-1 ring-inset ring-red-600/20 dark:bg-red-950/50 dark:text-red-200 dark:ring-red-400/30";
    case "void":
      return "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-500/15 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/30";
    default:
      return "bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-500/15";
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
