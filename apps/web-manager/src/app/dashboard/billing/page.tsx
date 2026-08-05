import Link from "next/link";
import { createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";
import ReportSaasPaymentButton from "../../../components/report-saas-payment-button";

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
      return "À payer";
    case "pending_confirmation":
      return "En attente de confirmation";
    case "paid":
      return "Payée";
    case "void":
      return "Annulée";
    default:
      return status;
  }
}

function providerLabel(provider: string): string {
  switch (provider) {
    case "airtel":
      return "Airtel Money";
    case "orange":
      return "Orange Money";
    case "mpesa":
      return "M-Pesa";
    default:
      return "Mobile Money";
  }
}

export default async function DashboardBillingPage(): Promise<React.ReactElement> {
  const { session, access } = await requireDashboardSectionAccess("billing");
  const repo = createPlatformBillingRepositoryFromEnv(process.env);

  const [estimate, invoices, paymentMethods] = await Promise.all([
    repo.estimateOrganizationBilling(session.organizationId),
    repo.listInvoicesForOrganization(session.organizationId, 24),
    repo.listPaymentMethods(true)
  ]);

  const openInvoice = invoices.find((invoice) => invoice.status === "issued" || invoice.status === "pending_confirmation");

  return (
    <div className="space-y-6 px-4 py-6 md:px-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#010a19] dark:text-white">Abonnement Haraka</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Facturation mensuelle selon vos logements. Gratuit sous 2 biens.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <h2 className="text-lg font-semibold text-[#010a19] dark:text-white">Période en cours</h2>
        {estimate ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-slate-500">Biens</p>
              <p className="mt-1 text-2xl font-semibold text-[#010a19] dark:text-white">{estimate.propertyCount}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Logements</p>
              <p className="mt-1 text-2xl font-semibold text-[#010a19] dark:text-white">{estimate.unitCount}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Tarif</p>
              <p className="mt-1 text-lg font-semibold text-[#010a19] dark:text-white">
                {formatMoney(estimate.pricePerUnitAmount, estimate.currencyCode)} / logement
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Estimation</p>
              <p className="mt-1 text-2xl font-semibold text-[#010a19] dark:text-white">
                {estimate.isFreeTier ? "Gratuit" : formatMoney(estimate.amountDue, estimate.currencyCode)}
              </p>
            </div>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">Impossible de calculer l&apos;estimation.</p>
        )}
        {estimate?.isFreeTier ? (
          <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200">
            Votre organisation a moins de {estimate.freePropertyThreshold} biens — aucun abonnement n&apos;est dû
            pour cette période.
          </p>
        ) : null}
      </section>

      {openInvoice ? (
        <section className="rounded-xl border border-[#0063fe]/30 bg-white p-5 dark:border-[#0063fe]/40 dark:bg-[#0d1526]">
          <h2 className="text-lg font-semibold text-[#010a19] dark:text-white">
            Facture {openInvoice.period} — {statusLabel(openInvoice.status)}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Montant :{" "}
            <span className="font-semibold text-[#010a19] dark:text-white">
              {formatMoney(openInvoice.amountDue, openInvoice.currencyCode)}
            </span>{" "}
            · À payer avant le {formatDate(openInvoice.dueAtIso)}
          </p>

          <div className="mt-4 space-y-3">
            <p className="text-sm font-medium text-[#010a19] dark:text-white">Payer par Mobile Money</p>
            {paymentMethods.length === 0 ? (
              <p className="text-sm text-slate-500">
                Aucun numéro de paiement configuré pour le moment. Contactez le support Haraka.
              </p>
            ) : (
              <ul className="space-y-2">
                {paymentMethods.map((method) => (
                  <li
                    key={method.id}
                    className="rounded-lg border border-slate-100 px-3 py-3 dark:border-slate-800"
                  >
                    <p className="font-medium text-[#010a19] dark:text-white">{method.displayName}</p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {providerLabel(method.provider)} ·{" "}
                      <span className="font-mono font-semibold">{method.accountNumber}</span>
                    </p>
                    {method.instructions ? (
                      <p className="mt-1 text-xs text-slate-500">{method.instructions}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {openInvoice.status === "issued" && access.billingWritable ? (
            <ReportSaasPaymentButton invoiceId={openInvoice.id} />
          ) : null}
          {openInvoice.status === "pending_confirmation" ? (
            <p className="mt-4 text-sm text-amber-700 dark:text-amber-300">
              Paiement signalé le {formatDate(openInvoice.paymentReportedAtIso)}. En attente de confirmation par
              Haraka Property.
            </p>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <h2 className="text-lg font-semibold text-[#010a19] dark:text-white">Historique</h2>
        {invoices.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Aucune facture d&apos;abonnement pour le moment.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100 dark:divide-slate-800">
            {invoices.map((invoice) => (
              <li key={invoice.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-[#010a19] dark:text-white">{invoice.period}</p>
                  <p className="text-xs text-slate-500">
                    {invoice.propertyCount} biens · {invoice.unitCount} logements · échéance{" "}
                    {formatDate(invoice.dueAtIso)}
                  </p>
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-300">
                  {formatMoney(invoice.amountDue, invoice.currencyCode)} · {statusLabel(invoice.status)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-slate-400">
        Besoin d&apos;aide ? Utilisez le chat support ou écrivez-nous.{" "}
        <Link href="/dashboard" className="text-[#0063fe] hover:underline">
          Retour au tableau de bord
        </Link>
      </p>
    </div>
  );
}
