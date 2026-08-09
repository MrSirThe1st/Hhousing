import Link from "next/link";
import { createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";
import BillingStatusBadge from "../../../../components/billing-status-badge";
import ReportSaasPaymentButton from "../../../../components/report-saas-payment-button";
import {
  billingDisplayStatus,
  formatBillingDate,
  formatBillingMoney,
  formatBillingPeriod,
  paymentMethodLabel,
  readSaasBillingPaymentConfig
} from "../../../../lib/billing/saas-billing-ui";
import { requireDashboardSectionAccess } from "../../../../lib/dashboard-access";

export default async function DashboardBillingPaymentsPage(): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("billing");
  const repo = createPlatformBillingRepositoryFromEnv(process.env);
  const paymentConfig = readSaasBillingPaymentConfig(process.env);

  const [invoices, overdueInvoice] = await Promise.all([
    repo.listInvoicesForOrganization(session.organizationId, 48),
    repo.getOpenOverdueInvoiceForOrganization(session.organizationId)
  ]);

  const openInvoice = invoices.find((invoice) => invoice.status === "issued") ?? null;
  const heroInvoice = overdueInvoice ?? openInvoice;
  const paymentHistory = invoices.filter(
    (invoice) => invoice.status === "paid" || Boolean(invoice.paymentReportedAtIso)
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#010a19] dark:text-white">Paiements</h2>
        <p className="mt-1 text-sm text-slate-500">
          Effectuez un paiement Mobile Money, puis signalez-le pour confirmation.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <h3 className="text-sm font-semibold text-[#010a19] dark:text-white">
          {paymentConfig.pawapayEnabled ? "Payer en ligne" : "Payer par Mobile Money"}
        </h3>

        {paymentConfig.pawapayEnabled ? (
          <div className="mt-4 space-y-2">
            <button
              type="button"
              disabled
              className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white opacity-70"
              title="Bientôt disponible"
            >
              Payer avec Mobile Money
            </button>
            <p className="text-xs text-slate-500">
              Paiement en ligne PawaPay — bientôt activé. Utilisez le paiement manuel ci-dessous en
              attendant.
            </p>
          </div>
        ) : null}

        <div
          className={
            paymentConfig.pawapayEnabled
              ? "mt-6 border-t border-slate-100 pt-5 dark:border-slate-800"
              : "mt-4"
          }
        >
          {paymentConfig.pawapayEnabled ? (
            <p className="mb-3 text-sm font-medium text-[#010a19] dark:text-white">
              Paiement hors ligne
            </p>
          ) : null}
          <ul className="space-y-3">
            {paymentConfig.methods.map((method) => (
              <li
                key={method.id}
                className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
              >
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
              {" · "}
              <Link
                href={`/dashboard/billing/invoices/${heroInvoice.id}`}
                className="text-[#0063fe] hover:underline"
              >
                Voir la facture
              </Link>
            </p>
          ) : (
            <p className="mt-4 text-sm text-slate-500">Aucune facture ouverte à régler.</p>
          )}

          {paymentConfig.instructions ? (
            <p className="mt-3 text-sm text-slate-500">{paymentConfig.instructions}</p>
          ) : (
            <p className="mt-3 text-sm text-slate-500">
              Indiquez la référence de facture dans le message du transfert Mobile Money.
            </p>
          )}

          {heroInvoice && heroInvoice.status === "issued" ? (
            <div className="mt-5">
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

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <h3 className="text-sm font-semibold text-[#010a19] dark:text-white">Historique des paiements</h3>
        {paymentHistory.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Aucun paiement signalé ou confirmé pour le moment.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 dark:divide-slate-800">
            {paymentHistory.map((invoice) => {
              const status = billingDisplayStatus(invoice);
              return (
                <li
                  key={invoice.id}
                  className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <Link
                      href={`/dashboard/billing/invoices/${invoice.id}`}
                      className="text-sm font-medium text-[#0063fe] hover:underline"
                    >
                      {invoice.invoiceNumber}
                    </Link>
                    <p className="text-xs text-slate-500">
                      {invoice.status === "paid" && invoice.paidAtIso
                        ? `Confirmé le ${formatBillingDate(invoice.paidAtIso)}`
                        : invoice.paymentReportedAtIso
                          ? `Signalé le ${formatBillingDate(invoice.paymentReportedAtIso)}`
                          : formatBillingPeriod(invoice.period)}
                      {invoice.paymentMethod
                        ? ` · ${paymentMethodLabel(invoice.paymentMethod)}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-[#010a19] dark:text-white">
                      {formatBillingMoney(invoice.amountDue, invoice.currencyCode)}
                    </span>
                    <BillingStatusBadge
                      status={status}
                      suffix={
                        invoice.status === "issued" && invoice.paymentReportedAtIso
                          ? "· signalé"
                          : undefined
                      }
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
