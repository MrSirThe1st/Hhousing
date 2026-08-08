import Link from "next/link";
import { notFound } from "next/navigation";
import { createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";
import ReportSaasPaymentButton from "../../../../../components/report-saas-payment-button";
import {
  billingDisplayStatus,
  billingStatusBadgeClass,
  billingStatusDot,
  billingStatusLabel,
  formatBillingDate,
  formatBillingMoney,
  formatBillingPeriod,
  overdueDays,
  readSaasBillingPaymentConfig
} from "../../../../../lib/billing/saas-billing-ui";
import { requireDashboardSectionAccess } from "../../../../../lib/dashboard-access";

export default async function DashboardBillingInvoiceDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;
  const { session } = await requireDashboardSectionAccess("billing");
  const repo = createPlatformBillingRepositoryFromEnv(process.env);
  const paymentConfig = readSaasBillingPaymentConfig(process.env);
  const invoice = await repo.getInvoiceById(id);

  if (!invoice || invoice.organizationId !== session.organizationId) {
    notFound();
  }

  const status = billingDisplayStatus(invoice);
  const lateDays = status === "overdue" ? overdueDays(invoice.dueAtIso) : 0;

  return (
    <div className="space-y-6 px-4 py-6 md:px-6">
      <div>
        <Link href="/dashboard/billing" className="text-sm text-slate-500 hover:underline dark:text-slate-400">
          ← Facturation
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-[#010a19] dark:text-white">
          Facture {invoice.invoiceNumber}
        </h1>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <dl className="grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs text-slate-500">Période</dt>
            <dd className="mt-1 capitalize font-medium text-[#010a19] dark:text-white">
              {formatBillingPeriod(invoice.period)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Statut</dt>
            <dd className="mt-1">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${billingStatusBadgeClass(status)}`}
              >
                {billingStatusDot(status)} {billingStatusLabel(status)}
                {status === "paid" && invoice.paidAtIso
                  ? ` le ${formatBillingDate(invoice.paidAtIso)}`
                  : ""}
                {status === "overdue" ? ` (${lateDays} j)` : ""}
              </span>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Logements</dt>
            <dd className="mt-1 font-medium text-[#010a19] dark:text-white">{invoice.unitCount}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Montant</dt>
            <dd className="mt-1 text-xl font-semibold text-[#010a19] dark:text-white">
              {formatBillingMoney(invoice.amountDue, invoice.currencyCode)}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Échéance</dt>
            <dd className="mt-1 text-sm">{formatBillingDate(invoice.dueAtIso)}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Référence</dt>
            <dd className="mt-1 font-medium text-[#010a19] dark:text-white">{invoice.invoiceNumber}</dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href={`/api/billing/invoices/${invoice.id}/pdf`}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium dark:border-slate-700"
          >
            Télécharger PDF
          </a>
          {invoice.status === "issued" ? (
            <a
              href="/dashboard/billing#paiement"
              className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white"
            >
              Payer maintenant
            </a>
          ) : null}
        </div>

        {invoice.status === "issued" ? (
          <div className="mt-6 border-t border-slate-100 pt-5 dark:border-slate-800">
            <p className="mb-3 text-sm font-medium text-[#010a19] dark:text-white">
              Après paiement Mobile Money
            </p>
            <ReportSaasPaymentButton
              invoiceId={invoice.id}
              alreadyReported={Boolean(invoice.paymentReportedAtIso)}
              methods={paymentConfig.methods.map((method) => ({
                id: method.id,
                label: method.label
              }))}
            />
          </div>
        ) : null}
      </section>
    </div>
  );
}
