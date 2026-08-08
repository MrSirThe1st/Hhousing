import Link from "next/link";
import {
  createPlatformAdminRepositoryFromEnv,
  createPlatformBillingRepositoryFromEnv,
  type PlatformSubscriptionInvoiceListItem
} from "@hhousing/data-access";
import type { PlatformSubscriptionInvoiceStatus } from "@hhousing/domain";
import AdminBillingSettingsForm from "../../../components/admin-billing-settings-form";
import AdminGenerateInvoicesButton from "../../../components/admin-generate-invoices-button";
import AdminInvoiceActions from "../../../components/admin-invoice-actions";
import {
  billingDisplayStatus,
  billingStatusBadgeClass,
  billingStatusDot,
  billingStatusLabel,
  formatBillingDate,
  formatBillingMoney,
  paymentMethodLabel
} from "../../../lib/billing/saas-billing-ui";

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

export default async function AdminBillingPage({
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
  const adminRepo = createPlatformAdminRepositoryFromEnv(process.env);

  const listInput =
    view === "open"
      ? { status: "issued" as const, search, limit: 100 }
      : view === "overdue"
        ? { overdueOnly: true, search, limit: 100 }
        : view === "paid"
          ? { status: "paid" as const, search, period, limit: 100 }
          : { status: statusFilter, search, period, limit: 100 };

  const [settings, dashboard, invoices, orgSnapshots, overview] = await Promise.all([
    billingRepo.getBillingSettings(),
    billingRepo.getAdminBillingDashboard(),
    billingRepo.listInvoices(listInput),
    billingRepo.listOrganizationBillingSnapshots(),
    adminRepo.getOverviewStats()
  ]);

  const currency = dashboard.currencyCode;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-[#010a19] dark:text-white">Facturation SaaS</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          KPIs, organisations à encaisser, et opérations de factures.
        </p>
      </div>

      {/* 1. KPI dashboard */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0d1526]">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">MRR</p>
          <p className="mt-2 text-2xl font-semibold text-[#010a19] dark:text-white">
            {formatBillingMoney(dashboard.mrrAmount, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Période en cours (émises + payées)</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0d1526]">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Encours</p>
          <p className="mt-2 text-2xl font-semibold text-[#010a19] dark:text-white">
            {formatBillingMoney(dashboard.openReceivableAmount, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">{dashboard.openInvoiceCount} facture(s) à recevoir</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
          <p className="text-xs font-medium uppercase tracking-wide text-red-800 dark:text-red-200">
            En retard
          </p>
          <p className="mt-2 text-2xl font-semibold text-red-950 dark:text-red-100">
            {formatBillingMoney(dashboard.overdueReceivableAmount, currency)}
          </p>
          <p className="mt-1 text-xs text-red-800/80 dark:text-red-200/80">
            {dashboard.overdueInvoiceCount} facture(s) échues
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0d1526]">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Collecté ce mois</p>
          <p className="mt-2 text-2xl font-semibold text-[#010a19] dark:text-white">
            {formatBillingMoney(dashboard.collectedMonthAmount, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">{dashboard.collectedMonthCount} paiement(s)</p>
        </div>
      </section>

      {/* Org active / suspended counters */}
      <section className="flex flex-wrap gap-3 text-sm">
        <Link href="/admin/organizations?status=active" className="text-emerald-700 hover:underline dark:text-emerald-300">
          {overview.activeOrganizationCount} actives
        </Link>
        <span className="text-slate-300">·</span>
        <Link href="/admin/organizations?status=suspended" className="text-red-700 hover:underline dark:text-red-300">
          {overview.suspendedOrganizationCount} suspendues
        </Link>
        <span className="text-slate-300">·</span>
        <span className="text-slate-500">{overview.organizationCount} au total</span>
      </section>

      {/* 2. Organisations table */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <h3 className="text-base font-semibold text-[#010a19] dark:text-white">Organisations</h3>
        <p className="mt-1 text-xs text-slate-500">Vue actionnable sur le solde ouvert de chaque org.</p>
        <div className="mt-4 overflow-x-auto">
          {orgSnapshots.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune organisation active.</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="pb-2 pr-4">Org</th>
                  <th className="pb-2 pr-4">Units</th>
                  <th className="pb-2 pr-4">Due</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {orgSnapshots.map((org) => {
                  const invoice = org.openInvoice;
                  const status = invoice ? billingDisplayStatus(invoice) : null;
                  return (
                    <tr key={org.organizationId}>
                      <td className="py-3 pr-4">
                        <Link
                          href={`/admin/organizations/${org.organizationId}`}
                          className="font-medium text-[#010a19] hover:underline dark:text-white"
                        >
                          {org.organizationName}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">{org.unitCount}</td>
                      <td className="py-3 pr-4">
                        {invoice
                          ? formatBillingMoney(invoice.amountDue, invoice.currencyCode)
                          : "—"}
                      </td>
                      <td className="py-3 pr-4">
                        {status ? (
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${billingStatusBadgeClass(status)}`}
                          >
                            {billingStatusDot(status)} {billingStatusLabel(status)}
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            🟢 À jour
                          </span>
                        )}
                      </td>
                      <td className="py-3">
                        {invoice ? (
                          <Link
                            href={`/admin/billing/invoices/${invoice.id}`}
                            className="text-[#0063fe] hover:underline"
                          >
                            {status === "overdue" ? "Relancer" : "Ouvrir"}
                          </Link>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </section>

      {/* Settings + generate */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-[#010a19] dark:text-white">Paramètres tarifaires</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Actuel : {formatBillingMoney(settings.pricePerUnitAmount, settings.currencyCode)} / logement ·
              gratuit sous {settings.freePropertyThreshold} biens
            </p>
          </div>
          <AdminGenerateInvoicesButton />
        </div>
        <div className="mt-4">
          <AdminBillingSettingsForm initial={settings} />
        </div>
      </section>

      {/* 3. Invoice table */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <h3 className="text-base font-semibold text-[#010a19] dark:text-white">Factures</h3>

        <div className="mt-4 flex flex-wrap gap-2">
          {VIEWS.map((item) => {
            const href =
              item.id === "all"
                ? `/admin/billing?view=all${search ? `&search=${encodeURIComponent(search)}` : ""}${period ? `&period=${encodeURIComponent(period)}` : ""}${statusFilter ? `&status=${statusFilter}` : ""}`
                : `/admin/billing?view=${item.id}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
            const active = view === item.id;
            return (
              <Link
                key={item.id}
                href={href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
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

        <form className="mt-4 flex flex-col gap-3 sm:flex-row" method="get">
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

        <div className="mt-6 overflow-x-auto">
          {invoices.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune facture dans cette vue.</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="pb-2 pr-4">Invoice</th>
                  <th className="pb-2 pr-4">Org</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">{view === "paid" ? "Payée" : "Due"}</th>
                  <th className="pb-2 pr-4">Signal</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.map((invoice: PlatformSubscriptionInvoiceListItem) => {
                  const status = billingDisplayStatus(invoice);
                  const signaled = Boolean(invoice.paymentReportedAtIso);
                  return (
                    <tr key={invoice.id}>
                      <td className="py-3 pr-4">
                        <Link
                          href={`/admin/billing/invoices/${invoice.id}`}
                          className="font-medium text-[#0063fe] hover:underline"
                        >
                          {invoice.invoiceNumber}
                        </Link>
                        <p className="text-xs text-slate-400">{invoice.period}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <Link
                          href={`/admin/organizations/${invoice.organizationId}`}
                          className="text-[#010a19] hover:underline dark:text-white"
                        >
                          {invoice.organizationName}
                        </Link>
                      </td>
                      <td className="py-3 pr-4">
                        {formatBillingMoney(invoice.amountDue, invoice.currencyCode)}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${billingStatusBadgeClass(status)}`}
                        >
                          {billingStatusDot(status)} {billingStatusLabel(status)}
                        </span>
                      </td>
                      <td className="py-3 pr-4">
                        {view === "paid"
                          ? formatBillingDate(invoice.paidAtIso)
                          : formatBillingDate(invoice.dueAtIso)}
                      </td>
                      <td className="py-3 pr-4">
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
                      <td className="py-3">
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
          )}
        </div>
      </section>
    </div>
  );
}
