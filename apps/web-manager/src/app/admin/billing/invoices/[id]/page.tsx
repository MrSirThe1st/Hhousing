import Link from "next/link";
import { notFound } from "next/navigation";
import { createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";
import AdminInvoiceActions from "../../../../../components/admin-invoice-actions";
import {
  billingDisplayStatus,
  billingStatusBadgeClass,
  billingStatusDot,
  billingStatusLabel,
  formatBillingDate,
  formatBillingMoney,
  formatBillingPeriod,
  paymentMethodLabel
} from "../../../../../lib/billing/saas-billing-ui";

export default async function AdminBillingInvoiceDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const repo = createPlatformBillingRepositoryFromEnv(process.env);
  const invoice = await repo.getInvoiceById(id);
  if (!invoice) {
    notFound();
  }

  const status = billingDisplayStatus(invoice);
  const signaled = Boolean(invoice.paymentReportedAtIso);

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin/billing" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Facturation
        </Link>
        <h2 className="mt-2 text-2xl font-semibold text-[#010a19] dark:text-white">
          Facture {invoice.invoiceNumber}
        </h2>
        <p className="mt-1 text-sm capitalize text-slate-500 dark:text-slate-400">
          {formatBillingPeriod(invoice.period)} · {invoice.id}
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Organisation</dt>
            <dd className="mt-1">
              <Link
                href={`/admin/organizations/${invoice.organizationId}`}
                className="font-medium text-[#0063fe] hover:underline"
              >
                {invoice.organizationName}
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Statut</dt>
            <dd className="mt-1">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${billingStatusBadgeClass(status)}`}
              >
                {billingStatusDot(status)} {billingStatusLabel(status)}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Montant</dt>
            <dd className="mt-1 text-xl font-semibold text-[#010a19] dark:text-white">
              {formatBillingMoney(invoice.amountDue, invoice.currencyCode)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Usage</dt>
            <dd className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {invoice.propertyCount} biens · {invoice.unitCount} logements ×{" "}
              {formatBillingMoney(invoice.pricePerUnitAmount, invoice.currencyCode)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Émise</dt>
            <dd className="mt-1 text-sm">{formatBillingDate(invoice.issuedAtIso)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Échéance</dt>
            <dd className="mt-1 text-sm">{formatBillingDate(invoice.dueAtIso)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Payée le</dt>
            <dd className="mt-1 text-sm">{formatBillingDate(invoice.paidAtIso)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Raison d&apos;annulation</dt>
            <dd className="mt-1 text-sm">{invoice.voidReason ?? "—"}</dd>
          </div>
        </dl>

        <div className="mt-6 rounded-lg border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
          <h3 className="text-sm font-semibold text-[#010a19] dark:text-white">Paiement</h3>
          <dl className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <dt className="text-xs text-slate-500">Signal client</dt>
              <dd className="mt-1 text-sm font-medium">
                {signaled ? `Oui (${formatBillingDate(invoice.paymentReportedAtIso)})` : "Non"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Méthode</dt>
              <dd className="mt-1 text-sm font-medium">{paymentMethodLabel(invoice.paymentMethod)}</dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Référence</dt>
              <dd className="mt-1 text-sm font-medium">{invoice.invoiceNumber}</dd>
            </div>
          </dl>
          {invoice.paymentNote ? (
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Note&nbsp;: {invoice.paymentNote}</p>
          ) : null}
        </div>

        <div className="mt-6">
          <AdminInvoiceActions invoiceId={invoice.id} status={invoice.status} />
        </div>
      </section>
    </div>
  );
}
