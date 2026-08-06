import Link from "next/link";
import {
  createPlatformAdminRepositoryFromEnv,
  createPlatformBillingRepositoryFromEnv,
  type PlatformSubscriptionInvoiceListItem
} from "@hhousing/data-access";
import type { PlatformSubscriptionInvoiceStatus } from "@hhousing/domain";
import AdminBillingSettingsForm from "../../../components/admin-billing-settings-form";
import AdminGenerateInvoicesButton from "../../../components/admin-generate-invoices-button";

type BillingView = "open" | "overdue" | "paid" | "all";

function formatMoney(amount: number, currency: string): string {
  return `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("fr-FR");
}

function statusLabel(status: string): string {
  switch (status) {
    case "issued":
      return "À encaisser";
    case "paid":
      return "Payée";
    case "void":
      return "Annulée";
    default:
      return status;
  }
}

function statusClass(status: string, overdue: boolean): string {
  if (overdue) {
    return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200";
  }
  switch (status) {
    case "paid":
      return "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300";
    case "void":
      return "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300";
    default:
      return "bg-blue-50 text-[#0063fe] dark:bg-[#0063fe]/15 dark:text-blue-200";
  }
}

function isOverdueInvoice(invoice: PlatformSubscriptionInvoiceListItem): boolean {
  if (invoice.status !== "issued") return false;
  const due = new Date(invoice.dueAtIso);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < Date.now();
}

function parseView(value: string | undefined): BillingView {
  if (value === "open" || value === "overdue" || value === "paid" || value === "all") {
    return value;
  }
  return "open";
}

const VIEWS: Array<{ id: BillingView; label: string; question: string }> = [
  { id: "open", label: "À encaisser", question: "Qui doit de l'argent ?" },
  { id: "overdue", label: "En retard", question: "Qui est en retard ?" },
  { id: "paid", label: "Payées", question: "Qui a payé ?" },
  { id: "all", label: "Toutes", question: "Historique complet" }
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

  const [settings, dashboard, invoices, overview] = await Promise.all([
    billingRepo.getBillingSettings(),
    billingRepo.getAdminBillingDashboard(),
    billingRepo.listInvoices(listInput),
    adminRepo.getOverviewStats()
  ]);

  const currency = dashboard.currencyCode;
  const activeViewMeta = VIEWS.find((item) => item.id === view) ?? VIEWS[0];

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-[#010a19] dark:text-white">Facturation SaaS</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Qui doit, qui a payé, qui est en retard, et combien vous encaissez.
        </p>
      </div>

      {/* Revenue KPIs */}
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0d1526]">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Encaissé ce mois</p>
          <p className="mt-2 text-2xl font-semibold text-[#010a19] dark:text-white">
            {formatMoney(dashboard.collectedMonthAmount, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">{dashboard.collectedMonthCount} paiement(s)</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0d1526]">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">À encaisser</p>
          <p className="mt-2 text-2xl font-semibold text-[#010a19] dark:text-white">
            {formatMoney(dashboard.openReceivableAmount, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">{dashboard.openInvoiceCount} facture(s) ouvertes</p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-800 dark:text-amber-200">
            En retard
          </p>
          <p className="mt-2 text-2xl font-semibold text-amber-950 dark:text-amber-100">
            {formatMoney(dashboard.overdueReceivableAmount, currency)}
          </p>
          <p className="mt-1 text-xs text-amber-800/80 dark:text-amber-200/80">
            {dashboard.overdueInvoiceCount} facture(s) échues
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0d1526]">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Encaissé YTD</p>
          <p className="mt-2 text-2xl font-semibold text-[#010a19] dark:text-white">
            {formatMoney(dashboard.collectedYearAmount, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Année civile en cours</p>
        </div>
      </section>

      {/* Org active / suspended */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <h3 className="text-base font-semibold text-[#010a19] dark:text-white">
          Organisations actives / suspendues
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Total</p>
            <p className="mt-1 text-2xl font-semibold text-[#010a19] dark:text-white">
              {overview.organizationCount}
            </p>
          </div>
          <Link
            href="/admin/organizations?status=active"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 transition hover:border-emerald-300 dark:border-emerald-900/50 dark:bg-emerald-950/30"
          >
            <p className="text-xs text-emerald-700 dark:text-emerald-300">Actives</p>
            <p className="mt-1 text-2xl font-semibold text-emerald-900 dark:text-emerald-100">
              {overview.activeOrganizationCount}
            </p>
          </Link>
          <Link
            href="/admin/organizations?status=suspended"
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-3 transition hover:border-red-300 dark:border-red-900/50 dark:bg-red-950/30"
          >
            <p className="text-xs text-red-700 dark:text-red-300">Suspendues</p>
            <p className="mt-1 text-2xl font-semibold text-red-900 dark:text-red-100">
              {overview.suspendedOrganizationCount}
            </p>
          </Link>
        </div>
      </section>

      {/* Settings + generate */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-[#010a19] dark:text-white">Paramètres tarifaires</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Actuel : {formatMoney(settings.pricePerUnitAmount, settings.currencyCode)} / logement · gratuit sous{" "}
              {settings.freePropertyThreshold} biens
            </p>
          </div>
          <AdminGenerateInvoicesButton />
        </div>
        <div className="mt-4">
          <AdminBillingSettingsForm initial={settings} />
        </div>
      </section>

      {/* Invoice views */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <div>
          <h3 className="text-base font-semibold text-[#010a19] dark:text-white">Factures</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{activeViewMeta.question}</p>
        </div>

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
            placeholder="Rechercher une organisation…"
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
                  <th className="pb-2 pr-4">Organisation</th>
                  <th className="pb-2 pr-4">Période</th>
                  <th className="pb-2 pr-4">Montant</th>
                  <th className="pb-2 pr-4">{view === "paid" ? "Payée le" : "Échéance"}</th>
                  <th className="pb-2 pr-4">Statut</th>
                  <th className="pb-2">Détail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.map((invoice) => {
                  const overdue = isOverdueInvoice(invoice);
                  return (
                    <tr key={invoice.id}>
                      <td className="py-3 pr-4">
                        <Link
                          href={`/admin/organizations/${invoice.organizationId}`}
                          className="font-medium text-[#010a19] hover:underline dark:text-white"
                        >
                          {invoice.organizationName}
                        </Link>
                        <p className="text-xs text-slate-400">
                          {invoice.propertyCount} biens · {invoice.unitCount} logements
                        </p>
                      </td>
                      <td className="py-3 pr-4">{invoice.period}</td>
                      <td className="py-3 pr-4">{formatMoney(invoice.amountDue, invoice.currencyCode)}</td>
                      <td className="py-3 pr-4">
                        {view === "paid"
                          ? formatDate(invoice.paidAtIso)
                          : formatDate(invoice.dueAtIso)}
                      </td>
                      <td className="py-3 pr-4">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass(invoice.status, overdue)}`}
                        >
                          {overdue && view !== "paid" ? "En retard" : statusLabel(invoice.status)}
                        </span>
                      </td>
                      <td className="py-3">
                        <Link
                          href={`/admin/billing/invoices/${invoice.id}`}
                          className="text-[#0063fe] hover:underline"
                        >
                          Ouvrir
                        </Link>
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
