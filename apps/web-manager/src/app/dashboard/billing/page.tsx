import Link from "next/link";
import { createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";
import ReportSaasPaymentButton from "../../../components/report-saas-payment-button";
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
} from "../../../lib/billing/saas-billing-ui";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";

export default async function DashboardBillingPage(): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("billing");
  const repo = createPlatformBillingRepositoryFromEnv(process.env);
  const paymentConfig = readSaasBillingPaymentConfig(process.env);

  const [estimate, invoices, overdueInvoice] = await Promise.all([
    repo.estimateOrganizationBilling(session.organizationId),
    repo.listInvoicesForOrganization(session.organizationId, 24),
    repo.getOpenOverdueInvoiceForOrganization(session.organizationId)
  ]);

  const openInvoice = invoices.find((invoice) => invoice.status === "issued") ?? null;
  const heroInvoice = overdueInvoice ?? openInvoice;
  const displayStatus = heroInvoice ? billingDisplayStatus(heroInvoice) : null;
  const currency = estimate?.currencyCode ?? openInvoice?.currencyCode ?? "USD";
  const usageSource = openInvoice ?? estimate;
  const lateDays = overdueInvoice ? overdueDays(overdueInvoice.dueAtIso) : 0;

  return (
    <div className="space-y-6 px-4 py-6 md:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#010a19] dark:text-white">Facturation</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Solde, paiement, utilisation et historique de vos factures.
        </p>
      </div>

      {/* 1. Current balance hero */}
      <section
        className={`rounded-xl border bg-white p-5 dark:bg-[#0d1526] ${
          displayStatus === "overdue"
            ? "border-red-300 dark:border-red-800"
            : heroInvoice
              ? "border-[#0063fe]/30 dark:border-[#0063fe]/40"
              : "border-slate-200 dark:border-slate-800"
        }`}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
          Solde actuel
        </p>
        {heroInvoice && displayStatus ? (
          <>
            <p className="mt-3 text-3xl font-semibold text-[#010a19] dark:text-white">
              {formatBillingMoney(heroInvoice.amountDue, heroInvoice.currencyCode)}{" "}
              <span className="text-base font-medium text-slate-500">à payer</span>
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Échéance&nbsp;: {formatBillingDate(heroInvoice.dueAtIso)}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${billingStatusBadgeClass(displayStatus)}`}
              >
                {billingStatusDot(displayStatus)} {billingStatusLabel(displayStatus)}
              </span>
              {displayStatus === "overdue" ? (
                <span className="text-sm font-medium text-red-700 dark:text-red-300">
                  Paiement en retard ({lateDays} jour{lateDays > 1 ? "s" : ""})
                </span>
              ) : null}
            </div>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href="#paiement"
                className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white"
              >
                Payer maintenant
              </a>
              <a
                href={`/api/billing/invoices/${heroInvoice.id}/pdf`}
                className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-[#010a19] dark:border-slate-700 dark:text-white"
              >
                Télécharger la facture
              </a>
              <Link
                href={`/dashboard/billing/invoices/${heroInvoice.id}`}
                className="rounded-lg px-4 py-2 text-sm font-medium text-[#0063fe] hover:underline"
              >
                Voir le détail
              </Link>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">
            Rien à payer pour le moment — aucune facture en attente.
          </p>
        )}
      </section>

      {/* 2. Payment methods */}
      <section
        id="paiement"
        className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
          Méthodes de paiement
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[#010a19] dark:text-white">
          {paymentConfig.pawapayEnabled ? "Payer en ligne" : "Mobile Money"}
        </h2>

        {paymentConfig.pawapayEnabled ? (
          <div className="mt-4 space-y-3">
            <button
              type="button"
              disabled
              className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white opacity-70"
              title="Bientôt disponible"
            >
              Payer avec Mobile Money
            </button>
            <p className="text-xs text-slate-500">
              Paiement en ligne PawaPay — bientôt activé. En attendant, utilisez le paiement manuel
              ci-dessous.
            </p>
          </div>
        ) : null}

        <div className={paymentConfig.pawapayEnabled ? "mt-6 border-t border-slate-100 pt-5 dark:border-slate-800" : "mt-4"}>
          {paymentConfig.pawapayEnabled ? (
            <p className="mb-3 text-sm font-medium text-[#010a19] dark:text-white">
              Paiement hors ligne (secours)
            </p>
          ) : null}
          <ul className="space-y-3">
            {paymentConfig.methods.map((method) => (
              <li key={method.id} className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-3">
                <span className={`text-sm font-semibold ${method.colorClass}`}>{method.label}</span>
                <span className="text-sm text-slate-600 dark:text-slate-300">
                  {method.accountNumber
                    ? `${method.accountNumber}${method.accountName ? ` · ${method.accountName}` : ""}`
                    : "Numéro à venir — contactez le support si besoin"}
                </span>
              </li>
            ))}
          </ul>
          {heroInvoice ? (
            <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
              Référence&nbsp;:{" "}
              <span className="font-semibold text-[#010a19] dark:text-white">
                {heroInvoice.invoiceNumber}
              </span>
            </p>
          ) : null}
          {paymentConfig.instructions ? (
            <p className="mt-3 text-sm text-slate-500">{paymentConfig.instructions}</p>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Indiquez la référence de facture dans le message du transfert Mobile Money.
            </p>
          )}
          {heroInvoice && heroInvoice.status === "issued" ? (
            <div className="mt-4">
              <ReportSaasPaymentButton
                invoiceId={heroInvoice.id}
                alreadyReported={Boolean(heroInvoice.paymentReportedAtIso)}
                methods={paymentConfig.methods.map((method) => ({
                  id: method.id,
                  label: method.label
                }))}
              />
            </div>
          ) : null}
        </div>
      </section>

      {/* 3. Usage & pricing */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
          Utilisation
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[#010a19] dark:text-white">
          Utilisation &amp; tarification
        </h2>
        {usageSource ? (
          <div className="mt-4 space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p>
              <span className="text-2xl font-semibold text-[#010a19] dark:text-white">
                {"unitCount" in usageSource ? usageSource.unitCount : 0}
              </span>{" "}
              logements
            </p>
            <p>
              Tarif&nbsp;:{" "}
              <span className="font-medium text-[#010a19] dark:text-white">
                {formatBillingMoney(usageSource.pricePerUnitAmount, currency)} / logement
              </span>
            </p>
            <p className="rounded-lg bg-slate-50 px-3 py-3 font-medium text-[#010a19] dark:bg-slate-800/60 dark:text-white">
              {usageSource.unitCount} × {formatBillingMoney(usageSource.pricePerUnitAmount, currency)} ={" "}
              {formatBillingMoney(
                "isFreeTier" in usageSource && usageSource.isFreeTier ? 0 : usageSource.amountDue,
                currency
              )}
            </p>
            {estimate ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <p>
                  Plan&nbsp;:{" "}
                  <span className="font-medium text-[#010a19] dark:text-white">
                    {estimate.isFreeTier ? "Gratuit" : "Standard"}
                  </span>
                </p>
                <p>
                  Seuil gratuit&nbsp;:{" "}
                  <span className="font-medium text-[#010a19] dark:text-white">
                    {estimate.freePropertyThreshold} logements (biens)
                  </span>
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Aucune donnée d&apos;utilisation disponible.</p>
        )}
      </section>

      {/* 4. Billing history */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.04em] text-slate-500">
          Historique
        </p>
        <h2 className="mt-1 text-lg font-semibold text-[#010a19] dark:text-white">
          Historique des factures
        </h2>
        {invoices.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Aucune facture pour le moment.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {invoices.map((invoice) => {
              const status = billingDisplayStatus(invoice);
              return (
                <li key={invoice.id}>
                  <Link
                    href={`/dashboard/billing/invoices/${invoice.id}`}
                    className="flex flex-col gap-1 py-3 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between dark:hover:bg-slate-800/40"
                  >
                    <div>
                      <p className="font-medium capitalize text-[#010a19] dark:text-white">
                        {formatBillingPeriod(invoice.period)}
                      </p>
                      <p className="text-xs text-slate-500">{invoice.invoiceNumber}</p>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="text-slate-700 dark:text-slate-200">
                        {formatBillingMoney(invoice.amountDue, invoice.currencyCode)}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${billingStatusBadgeClass(status)}`}
                      >
                        {billingStatusDot(status)} {billingStatusLabel(status)}
                      </span>
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
