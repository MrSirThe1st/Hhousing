import Link from "next/link";
import { createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";
import AdminBillingSettingsForm from "../../../components/admin-billing-settings-form";
import AdminGenerateInvoicesButton from "../../../components/admin-generate-invoices-button";
import AdminPaymentMethodsPanel from "../../../components/admin-payment-methods-panel";

function formatMoney(amount: number, currency: string): string {
  return `${amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

function statusLabel(status: string): string {
  switch (status) {
    case "issued":
      return "Émise";
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

export default async function AdminBillingPage(): Promise<React.ReactElement> {
  const repo = createPlatformBillingRepositoryFromEnv(process.env);
  const [settings, methods, invoices] = await Promise.all([
    repo.getBillingSettings(),
    repo.listPaymentMethods(false),
    repo.listInvoices({ limit: 30 })
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-[#010a19] dark:text-white">Facturation SaaS</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Tarifs, moyens de paiement Mobile Money et factures d&apos;abonnement opérateurs.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <h3 className="text-base font-semibold text-[#010a19] dark:text-white">Paramètres tarifaires</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Actuel : {formatMoney(settings.pricePerUnitAmount, settings.currencyCode)} / logement · gratuit sous{" "}
          {settings.freePropertyThreshold} biens
        </p>
        <div className="mt-4">
          <AdminBillingSettingsForm initial={settings} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <h3 className="text-base font-semibold text-[#010a19] dark:text-white">Moyens de paiement</h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Affichés sur la page Facturation des opérateurs (paiement manuel).
        </p>
        <div className="mt-4">
          <AdminPaymentMethodsPanel initialMethods={methods} />
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-base font-semibold text-[#010a19] dark:text-white">Factures d&apos;abonnement</h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Génération mensuelle (cron) ou manuelle ci-dessous. Confirmez les paiements reçus.
            </p>
          </div>
          <AdminGenerateInvoicesButton />
        </div>

        <div className="mt-6 overflow-x-auto">
          {invoices.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune facture pour le moment.</p>
          ) : (
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-400">
                <tr>
                  <th className="pb-2 pr-4">Organisation</th>
                  <th className="pb-2 pr-4">Période</th>
                  <th className="pb-2 pr-4">Montant</th>
                  <th className="pb-2 pr-4">Statut</th>
                  <th className="pb-2">Détail</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.map((invoice) => (
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
                    <td className="py-3 pr-4">{statusLabel(invoice.status)}</td>
                    <td className="py-3">
                      <Link
                        href={`/admin/billing/invoices/${invoice.id}`}
                        className="text-[#0063fe] hover:underline"
                      >
                        Ouvrir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
