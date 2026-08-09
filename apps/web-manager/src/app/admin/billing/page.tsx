import Link from "next/link";
import {
  createPlatformAdminRepositoryFromEnv,
  createPlatformBillingRepositoryFromEnv
} from "@hhousing/data-access";
import BillingStatusBadge from "../../../components/billing-status-badge";
import {
  billingDisplayStatus,
  formatBillingMoney
} from "../../../lib/billing/saas-billing-ui";

export default async function AdminBillingPage(): Promise<React.ReactElement> {
  const billingRepo = createPlatformBillingRepositoryFromEnv(process.env);
  const adminRepo = createPlatformAdminRepositoryFromEnv(process.env);

  const [dashboard, orgSnapshots, overview, recentOpen, signaled] = await Promise.all([
    billingRepo.getAdminBillingDashboard(),
    billingRepo.listOrganizationBillingSnapshots(),
    adminRepo.getOverviewStats(),
    billingRepo.listInvoices({ status: "issued", limit: 5 }),
    billingRepo.listInvoices({ paymentReportedOnly: true, status: "issued", limit: 5 })
  ]);

  const currency = dashboard.currencyCode;
  const actionableOrgs = orgSnapshots.filter((org) => org.openInvoice !== null).slice(0, 8);

  return (
    <div className="space-y-6">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0d1526]">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">MRR</p>
          <p className="mt-2 text-2xl font-semibold text-[#010a19] dark:text-white">
            {formatBillingMoney(dashboard.mrrAmount, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Période en cours</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#0d1526]">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Encours</p>
          <p className="mt-2 text-2xl font-semibold text-[#010a19] dark:text-white">
            {formatBillingMoney(dashboard.openReceivableAmount, currency)}
          </p>
          <p className="mt-1 text-xs text-slate-500">{dashboard.openInvoiceCount} facture(s)</p>
        </div>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
          <p className="text-xs font-medium uppercase tracking-wide text-red-800 dark:text-red-200">
            En retard
          </p>
          <p className="mt-2 text-2xl font-semibold text-red-950 dark:text-red-100">
            {formatBillingMoney(dashboard.overdueReceivableAmount, currency)}
          </p>
          <p className="mt-1 text-xs text-red-800/80 dark:text-red-200/80">
            {dashboard.overdueInvoiceCount} facture(s)
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

      <section className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
        <Link
          href="/admin/organizations?status=active"
          className="text-emerald-700 hover:underline dark:text-emerald-300"
        >
          {overview.activeOrganizationCount} orgs actives
        </Link>
        <span className="text-slate-300 dark:text-slate-600">·</span>
        <Link
          href="/admin/organizations?status=suspended"
          className="text-red-700 hover:underline dark:text-red-300"
        >
          {overview.suspendedOrganizationCount} suspendues
        </Link>
        <span className="text-slate-300 dark:text-slate-600">·</span>
        <Link href="/admin/billing/invoices" className="text-[#0063fe] hover:underline">
          Gérer les factures
        </Link>
        <Link href="/admin/billing/payments" className="text-[#0063fe] hover:underline">
          Paiements à confirmer
          {signaled.length > 0 ? ` (${signaled.length}+)` : ""}
        </Link>
        <Link href="/admin/billing/settings" className="text-[#0063fe] hover:underline">
          Paramètres
        </Link>
      </section>

      <div className="grid gap-6 xl:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[#010a19] dark:text-white">
              Organisations à suivre
            </h2>
            <Link href="/admin/billing/invoices?view=open" className="text-xs text-[#0063fe] hover:underline">
              Voir tout
            </Link>
          </div>
          {actionableOrgs.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Aucune organisation avec solde ouvert.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {actionableOrgs.map((org) => {
                const invoice = org.openInvoice!;
                const status = billingDisplayStatus(invoice);
                return (
                  <li
                    key={org.organizationId}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <Link
                        href={`/admin/organizations/${org.organizationId}`}
                        className="text-sm font-medium text-[#010a19] hover:underline dark:text-white"
                      >
                        {org.organizationName}
                      </Link>
                      <p className="text-xs text-slate-500">{org.unitCount} logements</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-[#010a19] dark:text-white">
                        {formatBillingMoney(invoice.amountDue, invoice.currencyCode)}
                      </span>
                      <BillingStatusBadge status={status} />
                      <Link
                        href={`/admin/billing/invoices/${invoice.id}`}
                        className="text-xs font-medium text-[#0063fe] hover:underline"
                      >
                        {status === "overdue" ? "Relancer" : "Ouvrir"}
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[#010a19] dark:text-white">
              Factures ouvertes récentes
            </h2>
            <Link href="/admin/billing/invoices" className="text-xs text-[#0063fe] hover:underline">
              Toutes
            </Link>
          </div>
          {recentOpen.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Aucune facture ouverte.</p>
          ) : (
            <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
              {recentOpen.map((invoice) => {
                const status = billingDisplayStatus(invoice);
                return (
                  <li
                    key={invoice.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <Link
                        href={`/admin/billing/invoices/${invoice.id}`}
                        className="text-sm font-medium text-[#0063fe] hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </Link>
                      <p className="text-xs text-slate-500">{invoice.organizationName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm">
                        {formatBillingMoney(invoice.amountDue, invoice.currencyCode)}
                      </span>
                      <BillingStatusBadge status={status} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
