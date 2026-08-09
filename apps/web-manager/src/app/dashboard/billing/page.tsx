import Link from "next/link";
import { createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";
import BillingStatusBadge from "../../../components/billing-status-badge";
import {
  billingDisplayStatus,
  formatBillingDate,
  formatBillingMoney,
  formatBillingPeriod,
  overdueDays
} from "../../../lib/billing/saas-billing-ui";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";

export default async function DashboardBillingPage(): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("billing");
  const repo = createPlatformBillingRepositoryFromEnv(process.env);

  const [estimate, invoices, overdueInvoice] = await Promise.all([
    repo.estimateOrganizationBilling(session.organizationId),
    repo.listInvoicesForOrganization(session.organizationId, 6),
    repo.getOpenOverdueInvoiceForOrganization(session.organizationId)
  ]);

  const openInvoice = invoices.find((invoice) => invoice.status === "issued") ?? null;
  const heroInvoice = overdueInvoice ?? openInvoice;
  const displayStatus = heroInvoice ? billingDisplayStatus(heroInvoice) : null;
  const currency = estimate?.currencyCode ?? openInvoice?.currencyCode ?? "USD";
  const usageSource = openInvoice ?? estimate;
  const lateDays = overdueInvoice ? overdueDays(overdueInvoice.dueAtIso) : 0;
  const recentActivity = invoices.slice(0, 5);

  return (
    <div className="space-y-6">
      <section
        className={`rounded-xl border bg-white p-6 dark:bg-[#0d1526] ${
          displayStatus === "overdue"
            ? "border-red-200 dark:border-red-900/60"
            : "border-slate-200 dark:border-slate-800"
        }`}
      >
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Solde actuel</p>
            {heroInvoice && displayStatus ? (
              <>
                <p className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-[#010a19] dark:text-white">
                  {formatBillingMoney(heroInvoice.amountDue, heroInvoice.currencyCode)}
                </p>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                  Échéance {formatBillingDate(heroInvoice.dueAtIso)}
                  {displayStatus === "overdue"
                    ? ` · ${lateDays} jour${lateDays > 1 ? "s" : ""} de retard`
                    : ""}
                </p>
                <div className="mt-3">
                  <BillingStatusBadge status={displayStatus} />
                </div>
              </>
            ) : (
              <p className="mt-2 text-sm text-emerald-700 dark:text-emerald-300">
                Aucun montant dû pour le moment.
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 lg:justify-end">
            {heroInvoice ? (
              <>
                <Link
                  href="/dashboard/billing/payments"
                  className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0052d4]"
                >
                  Payer maintenant
                </Link>
                <a
                  href={`/api/billing/invoices/${heroInvoice.id}/pdf`}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-[#010a19] dark:border-slate-700 dark:text-white"
                >
                  Télécharger
                </a>
                <Link
                  href={`/dashboard/billing/invoices/${heroInvoice.id}`}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-[#0063fe] hover:underline"
                >
                  Voir la facture
                </Link>
              </>
            ) : (
              <Link
                href="/dashboard/billing/invoices"
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium dark:border-slate-700"
              >
                Voir les factures
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[#010a19] dark:text-white">Utilisation</h2>
            <Link
              href="/dashboard/billing/settings"
              className="text-xs font-medium text-[#0063fe] hover:underline"
            >
              Détails
            </Link>
          </div>
          {usageSource ? (
            <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
              <p>
                <span className="text-2xl font-semibold text-[#010a19] dark:text-white">
                  {usageSource.unitCount}
                </span>{" "}
                logements
              </p>
              <p>
                {formatBillingMoney(usageSource.pricePerUnitAmount, currency)} / logement
                {estimate ? (
                  <>
                    {" "}
                    · Plan {estimate.isFreeTier ? "gratuit" : "standard"}
                  </>
                ) : null}
              </p>
              <p className="text-[#010a19] dark:text-white">
                {usageSource.unitCount} × {formatBillingMoney(usageSource.pricePerUnitAmount, currency)}{" "}
                ={" "}
                <span className="font-semibold">
                  {formatBillingMoney(
                    "isFreeTier" in usageSource && usageSource.isFreeTier ? 0 : usageSource.amountDue,
                    currency
                  )}
                </span>
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Données d&apos;utilisation indisponibles.</p>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[#010a19] dark:text-white">Facture en cours</h2>
            {heroInvoice ? (
              <Link
                href={`/dashboard/billing/invoices/${heroInvoice.id}`}
                className="text-xs font-medium text-[#0063fe] hover:underline"
              >
                Ouvrir
              </Link>
            ) : null}
          </div>
          {heroInvoice ? (
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Numéro</dt>
                <dd className="font-medium text-[#010a19] dark:text-white">{heroInvoice.invoiceNumber}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Période</dt>
                <dd className="capitalize text-[#010a19] dark:text-white">
                  {formatBillingPeriod(heroInvoice.period)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Montant</dt>
                <dd className="font-medium text-[#010a19] dark:text-white">
                  {formatBillingMoney(heroInvoice.amountDue, heroInvoice.currencyCode)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Aucune facture ouverte.</p>
          )}
        </section>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-[#010a19] dark:text-white">Activité récente</h2>
          <Link
            href="/dashboard/billing/invoices"
            className="text-xs font-medium text-[#0063fe] hover:underline"
          >
            Toutes les factures
          </Link>
        </div>
        {recentActivity.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Aucune activité pour le moment.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {recentActivity.map((invoice) => {
              const status = billingDisplayStatus(invoice);
              return (
                <li key={invoice.id}>
                  <Link
                    href={`/dashboard/billing/invoices/${invoice.id}`}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-medium text-[#010a19] dark:text-white">
                        {invoice.invoiceNumber}
                      </p>
                      <p className="text-xs capitalize text-slate-500">
                        {formatBillingPeriod(invoice.period)}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-slate-700 dark:text-slate-200">
                        {formatBillingMoney(invoice.amountDue, invoice.currencyCode)}
                      </span>
                      <BillingStatusBadge status={status} />
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
