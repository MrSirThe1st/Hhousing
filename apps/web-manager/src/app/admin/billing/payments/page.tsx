import Link from "next/link";
import { createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";
import AdminInvoiceActions from "../../../../components/admin-invoice-actions";
import BillingStatusBadge from "../../../../components/billing-status-badge";
import {
  billingDisplayStatus,
  formatBillingDate,
  formatBillingMoney,
  paymentMethodLabel
} from "../../../../lib/billing/saas-billing-ui";

type PaymentsView = "pending" | "confirmed";

function parseView(value: string | undefined): PaymentsView {
  return value === "confirmed" ? "confirmed" : "pending";
}

export default async function AdminBillingPaymentsPage({
  searchParams
}: {
  searchParams: Promise<{ view?: string }>;
}): Promise<React.ReactElement> {
  const params = await searchParams;
  const view = parseView(params.view);
  const repo = createPlatformBillingRepositoryFromEnv(process.env);

  const invoices =
    view === "pending"
      ? await repo.listInvoices({ paymentReportedOnly: true, status: "issued", limit: 100 })
      : await repo.listInvoices({ status: "paid", limit: 100 });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#010a19] dark:text-white">Paiements</h2>
        <p className="mt-1 text-sm text-slate-500">
          Signaux clients et paiements confirmés — mêmes actions qu&apos;avant.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/admin/billing/payments"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            view === "pending"
              ? "bg-[#f2f6fb] text-[#0f2748] ring-1 ring-[#d9e7ff] dark:bg-slate-800 dark:text-white dark:ring-slate-700"
              : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
          }`}
        >
          À confirmer
        </Link>
        <Link
          href="/admin/billing/payments?view=confirmed"
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
            view === "confirmed"
              ? "bg-[#f2f6fb] text-[#0f2748] ring-1 ring-[#d9e7ff] dark:bg-slate-800 dark:text-white dark:ring-slate-700"
              : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
          }`}
        >
          Confirmés
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0d1526]">
        {invoices.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">
            {view === "pending"
              ? "Aucun signal client en attente de confirmation."
              : "Aucun paiement confirmé dans cette liste."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Facture</th>
                  <th className="px-4 py-3 font-medium">Org</th>
                  <th className="px-4 py-3 font-medium">Montant</th>
                  <th className="px-4 py-3 font-medium">Méthode</th>
                  <th className="px-4 py-3 font-medium">
                    {view === "pending" ? "Signalé le" : "Payée le"}
                  </th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.map((invoice) => {
                  const status = billingDisplayStatus(invoice);
                  return (
                    <tr key={invoice.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/billing/invoices/${invoice.id}`}
                          className="font-medium text-[#0063fe] hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/organizations/${invoice.organizationId}`}
                          className="hover:underline"
                        >
                          {invoice.organizationName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {formatBillingMoney(invoice.amountDue, invoice.currencyCode)}
                      </td>
                      <td className="px-4 py-3">{paymentMethodLabel(invoice.paymentMethod)}</td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {view === "pending"
                          ? formatBillingDate(invoice.paymentReportedAtIso)
                          : formatBillingDate(invoice.paidAtIso)}
                      </td>
                      <td className="px-4 py-3">
                        <BillingStatusBadge status={status} />
                      </td>
                      <td className="px-4 py-3">
                        {invoice.status === "issued" ? (
                          <AdminInvoiceActions invoiceId={invoice.id} status={invoice.status} compact />
                        ) : (
                          <Link
                            href={`/admin/billing/invoices/${invoice.id}`}
                            className="text-xs text-[#0063fe] hover:underline"
                          >
                            Ouvrir
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
