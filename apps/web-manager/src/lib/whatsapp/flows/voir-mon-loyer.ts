import type { Payment } from "@hhousing/domain";
import type { PaymentRepository, TenantLeaseRepository } from "@hhousing/data-access";
import { normalizeTenantPhoneNumber } from "@hhousing/data-access";

export type TenantRentSummary = {
  tenantFullName: string;
  amountLabel: string;
  dueDateLabel: string;
  statusLabel: string;
  statusCode: "paid" | "overdue" | "pending" | "none";
};

function formatAmount(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("fr-CD", {
      style: "currency",
      currency: currencyCode,
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `${amount} ${currencyCode}`;
  }
}

function formatDueDate(isoDate: string): string {
  const parsed = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return isoDate;
  }

  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(parsed);
}

function mapStatusLabel(status: Payment["status"]): { label: string; code: TenantRentSummary["statusCode"] } {
  switch (status) {
    case "paid":
      return { label: "Payé", code: "paid" };
    case "overdue":
      return { label: "En retard", code: "overdue" };
    case "pending":
      return { label: "À payer", code: "pending" };
    default:
      return { label: "À jour", code: "none" };
  }
}

function pickCurrentPayment(payments: Payment[]): Payment | null {
  const open = payments
    .filter((payment) => payment.status === "pending" || payment.status === "overdue")
    .sort((left, right) => left.dueDate.localeCompare(right.dueDate));

  if (open[0]) {
    return open[0];
  }

  return payments[0] ?? null;
}

export async function getTenantRentSummaryByPhone(params: {
  phone: string;
  tenantRepository: TenantLeaseRepository;
  paymentRepository: PaymentRepository;
}): Promise<TenantRentSummary | null> {
  const phoneNormalized = normalizeTenantPhoneNumber(params.phone);
  if (!phoneNormalized) {
    return null;
  }

  const tenant = await params.tenantRepository.findTenantByNormalizedPhone(phoneNormalized);
  if (!tenant) {
    return null;
  }

  const payments = await params.paymentRepository.listPayments({
    organizationId: tenant.organizationId,
    tenantId: tenant.id
  });

  const current = pickCurrentPayment(payments);
  if (!current) {
    return {
      tenantFullName: tenant.fullName,
      amountLabel: "—",
      dueDateLabel: "—",
      statusLabel: "Aucun loyer trouvé",
      statusCode: "none"
    };
  }

  const status = mapStatusLabel(current.status);

  return {
    tenantFullName: tenant.fullName,
    amountLabel: formatAmount(current.amount, current.currencyCode),
    dueDateLabel: formatDueDate(current.dueDate),
    statusLabel: status.label,
    statusCode: status.code
  };
}

export function buildVoirMonLoyerScreenData(summary: TenantRentSummary): {
  screen: string;
  data: Record<string, string>;
} {
  return {
    screen: "LOYER",
    data: {
      heading: "Votre loyer",
      tenant_name: summary.tenantFullName,
      amount_label: summary.amountLabel,
      due_date_label: summary.dueDateLabel,
      status_label: summary.statusLabel,
      summary_text: `${summary.amountLabel} · Échéance ${summary.dueDateLabel} · ${summary.statusLabel}`
    }
  };
}
