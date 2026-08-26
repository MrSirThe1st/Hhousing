import type { Invoice, Payment } from "@hhousing/domain";
import { getSharedPool, readDatabaseEnv } from "@hhousing/data-access";
import { createInvoiceRepo } from "../../shared";

export type MobileMoneySummary = {
  provider: string;
  phoneNumber: string;
  transactionId: string;
  completedAtIso: string | null;
};

export type InvoiceSummary = {
  id: string;
  invoiceNumber: string;
  status: Invoice["status"];
  issueDate: string;
  dueDate: string;
  totalAmount: number;
  currencyCode: string;
  period: string | null;
};

export type MobilePaymentDetail = {
  payment: Payment;
  invoice: InvoiceSummary | null;
  mobileMoney: MobileMoneySummary | null;
};

function toInvoiceSummary(invoice: Invoice): InvoiceSummary {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    status: invoice.status,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    totalAmount: invoice.totalAmount,
    currencyCode: invoice.currencyCode,
    period: invoice.period
  };
}

async function findInvoiceForPayment(
  organizationId: string,
  leaseId: string,
  paymentId: string
): Promise<Invoice | null> {
  const invoiceRepo = createInvoiceRepo();
  const invoices = await invoiceRepo.listInvoices({ organizationId, leaseId });

  const bySource = invoices.find(
    (invoice) => invoice.sourcePaymentId === paymentId && invoice.status !== "void"
  );
  if (bySource) {
    return bySource;
  }

  for (const invoice of invoices) {
    if (invoice.status === "void") {
      continue;
    }
    const detail = await invoiceRepo.getInvoiceDetail(invoice.id, organizationId);
    if (detail?.applications.some((application) => application.paymentId === paymentId)) {
      return detail.invoice;
    }
  }

  return null;
}

async function findMobileMoneyForPayment(
  organizationId: string,
  paymentId: string
): Promise<MobileMoneySummary | null> {
  try {
    const env = readDatabaseEnv(process.env);
    if (!env.success) {
      return null;
    }
    const pool = getSharedPool(env.data.connectionString);
    const result = await pool.query<{
      id: string;
      provider: string;
      phone_number: string;
      completed_at: Date | string | null;
    }>(
      `select t.id, t.provider, t.phone_number, t.completed_at
       from pawapay_transactions t
       join pawapay_transaction_allocations a on a.transaction_id = t.id
       where a.payment_id = $1
         and t.organization_id = $2
         and t.status = 'completed'
       order by t.completed_at desc nulls last, t.created_at desc
       limit 1`,
      [paymentId, organizationId]
    );

    const row = result.rows[0];
    if (!row) {
      return null;
    }

    return {
      provider: row.provider,
      phoneNumber: row.phone_number,
      transactionId: row.id,
      completedAtIso: row.completed_at
        ? row.completed_at instanceof Date
          ? row.completed_at.toISOString()
          : row.completed_at
        : null
    };
  } catch (error) {
    console.error("Failed to load mobile money for payment", error);
    return null;
  }
}

export async function buildMobilePaymentDetail(
  organizationId: string,
  payment: Payment
): Promise<MobilePaymentDetail> {
  const [invoice, mobileMoney] = await Promise.all([
    findInvoiceForPayment(organizationId, payment.leaseId, payment.id),
    findMobileMoneyForPayment(organizationId, payment.id)
  ]);

  return {
    payment,
    invoice: invoice ? toInvoiceSummary(invoice) : null,
    mobileMoney
  };
}
