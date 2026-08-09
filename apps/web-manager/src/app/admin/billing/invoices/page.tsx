import Link from "next/link";
import {
  createPlatformBillingRepositoryFromEnv,
  type PlatformSubscriptionInvoiceListItem
} from "@hhousing/data-access";
import type { PlatformSubscriptionInvoiceStatus } from "@hhousing/domain";
import AdminInvoiceActions from "../../../../components/admin-invoice-actions";
import BillingStatusBadge from "../../../../components/billing-status-badge";
import {
  billingDisplayStatus,
  formatBillingDate,
  formatBillingMoney,
  paymentMethodLabel
} from "../../../../lib/billing/saas-billing-ui";

type BillingView = "open" | "overdue" | "paid" | "all";

function parseView(value: string | undefined): BillingView {
  if (value === "open" || value === "overdue" || value === "paid" || value === "all") {
    return value;
  }
  return "open";
}

const VIEWS: Array<{ id: BillingView; label: string }> = [
  { id: "open", label: "À encaisser" },
  { id: "overdue", label: "En retard" },
  { id: "paid", label: "Payées" },
  { id: "all", label: "Toutes" }
];

export default async function AdminBillingInvoicesPage({
  searchParams
}: {
  searchParams: Promise<{ view?: string; search?: string; period?: string; status?: string }>;
}): Promise<React.ReactElement> {
  const params = await searchParams;
  const view = parseView(params.view);
  const search = params.search?.trim() || null;
  const period = params.period?.trim() || null;
  const statusFilter =
    params.status === "issued" || params.status === "paid" || params.status === "void"
      ? (params.status as PlatformSubscriptionInvoiceStatus)
      : null;

  const billingRepo = createPlatformBillingRepositoryFromEnv(process.env);

  const listInput =
    view === "open"
      ? { status: "issued" as const, search, limit: 100 }
      : view === "overdue"
        ? { overdueOnly: true, search, limit: 100 }
        : view === "paid"
          ? { status: "paid" as const, search, period, limit: 100 }
          : { status: statusFilter, search, period, limit: 100 };

  const invoices = await billingRepo.listInvoices(listInput);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-[#010a19] dark:text-white">Factures</h2>
        <p className="mt-1 text-sm text-slate-500">Gestion opérationnelle des factures SaaS.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {VIEWS.map((item) => {
          const href =
            item.id === "all"
              ? `/admin/billing/invoices?view=all${search ? `&search=${encodeURIComponent(search)}` : ""}${period ? `&period=${encodeURIComponent(period)}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}`
              : `/admin/billing/invoices?view=${item.id}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
          const active = view === item.id;
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

      <form className="flex flex-col gap-3 sm:flex-row" method="get">
        <input type="hidden" name="view" value={view} />
        <input
          type="search"
          name="search"
          defaultValue={search ?? ""}
          placeholder="Org, numéro de facture…"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
        />
        {view === "paid" || view === "all" ? (
          <input
            type="text"
            name="period"
            defaultValue={period ?? ""}
            placeholder="Période (YYYY-MM)"
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
          />
        ) : null}
        {view === "all" ? (
          <select
            name="status"
            defaultValue={statusFilter ?? ""}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-[#0d1526] dark:text-white"
          >
            <option value="">Tous les statuts</option>
            <option value="issued">À encaisser</option>
            <option value="paid">Payées</option>
            <option value="void">Annulées</option>
          </select>
        ) : null}
        <button
          type="submit"
          className="rounded-lg bg-[#010a19] px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-[#010a19]"
        >
          Filtrer
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0d1526]">
        {invoices.length === 0 ? (
          <p className="p-5 text-sm text-slate-500">Aucune facture dans cette vue.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 font-medium">Facture</th>
                  <th className="px-4 py-3 font-medium">Org</th>
                  <th className="px-4 py-3 font-medium">Montant</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">{view === "paid" ? "Payée" : "Échéance"}</th>
                  <th className="px-4 py-3 font-medium">Signal</th>
                  <th className="px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.map((invoice: PlatformSubscriptionInvoiceListItem) => {
                  const status = billingDisplayStatus(invoice);
                  const signaled = Boolean(invoice.paymentReportedAtIso);
                  return (
                    <tr key={invoice.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/billing/invoices/${invoice.id}`}
                          className="font-medium text-[#0063fe] hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                        <p className="text-xs text-slate-400">{invoice.period}</p>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/organizations/${invoice.organizationId}`}
                          className="text-[#010a19] hover:underline dark:text-white"
                        >
                          {invoice.organizationName}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {formatBillingMoney(invoice.amountDue, invoice.currencyCode)}
                      </td>
                      <td className="px-4 py-3">
                        <BillingStatusBadge status={status} />
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {view === "paid"
                          ? formatBillingDate(invoice.paidAtIso)
                          : formatBillingDate(invoice.dueAtIso)}
                      </td>
                      <td className="px-4 py-3">
                        {signaled ? (
                          <span className="text-xs font-medium text-amber-800 dark:text-amber-200">
                            Oui
                            {invoice.paymentMethod
                              ? ` · ${paymentMethodLabel(invoice.paymentMethod)}`
                              : ""}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-400">Non</span>
                        )}
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
