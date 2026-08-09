import Link from "next/link";
import { createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";
import BillingStatusBadge from "../../../../components/billing-status-badge";
import {
  billingDisplayStatus,
  formatBillingDate,
  formatBillingMoney,
  formatBillingPeriod
} from "../../../../lib/billing/saas-billing-ui";
import { requireDashboardSectionAccess } from "../../../../lib/dashboard-access";

type InvoiceFilter = "all" | "issued" | "paid" | "overdue" | "void";

function parseFilter(value: string | undefined): InvoiceFilter {
  if (value === "issued" || value === "paid" || value === "overdue" || value === "void" || value === "all") {
    return value;
  }
  return "all";
}

const FILTERS: Array<{ id: InvoiceFilter; label: string }> = [
  { id: "all", label: "Toutes" },
  { id: "issued", label: "En attente" },
  { id: "overdue", label: "En retard" },
  { id: "paid", label: "Payées" },
  { id: "void", label: "Annulées" }
];

export default async function DashboardBillingInvoicesPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}): Promise<React.ReactElement> {
  const params = await searchParams;
  const filter = parseFilter(params.status);
  const { session } = await requireDashboardSectionAccess("billing");
  const repo = createPlatformBillingRepositoryFromEnv(process.env);
  const invoices = await repo.listInvoicesForOrganization(session.organizationId, 48);

  const filtered = invoices.filter((invoice) => {
    const status = billingDisplayStatus(invoice);
    if (filter === "all") return true;
    if (filter === "issued") return status === "issued";
    if (filter === "overdue") return status === "overdue";
    if (filter === "paid") return status === "paid";
    return status === "void";
  });

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#010a19] dark:text-white">Factures Haraka</h2>
        <p className="mt-1 text-sm text-slate-500">Historique de vos factures d&apos;abonnement.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((item) => {
          const href =
            item.id === "all"
              ? "/dashboard/billing/invoices"
              : `/dashboard/billing/invoices?status=${item.id}`;
          const active = filter === item.id;
          return (
            <Link
              key={item.id}
              href={href}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-[#f2f6fb] text-[#0f2748] ring-1 ring-[#d9e7ff] dark:bg-slate-800 dark:text-white dark:ring-slate-700"
                  : "text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800/60"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0d1526]">
        {filtered.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Aucune facture dans cette vue.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <tr>
                  <th className="px-5 py-3 font-medium">Facture</th>
                  <th className="px-5 py-3 font-medium">Période</th>
                  <th className="px-5 py-3 font-medium">Montant</th>
                  <th className="px-5 py-3 font-medium">Échéance</th>
                  <th className="px-5 py-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filtered.map((invoice) => {
                  const status = billingDisplayStatus(invoice);
                  return (
                    <tr key={invoice.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-3">
                        <Link
                          href={`/dashboard/billing/invoices/${invoice.id}`}
                          className="font-medium text-[#0063fe] hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-5 py-3 capitalize text-slate-600 dark:text-slate-300">
                        {formatBillingPeriod(invoice.period)}
                      </td>
                      <td className="px-5 py-3 text-[#010a19] dark:text-white">
                        {formatBillingMoney(invoice.amountDue, invoice.currencyCode)}
                      </td>
                      <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                        {formatBillingDate(invoice.dueAtIso)}
                      </td>
                      <td className="px-5 py-3">
                        <BillingStatusBadge status={status} />
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
