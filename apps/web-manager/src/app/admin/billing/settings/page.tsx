import { createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";
import AdminBillingSettingsForm from "../../../../components/admin-billing-settings-form";
import AdminGenerateInvoicesButton from "../../../../components/admin-generate-invoices-button";
import { formatBillingMoney } from "../../../../lib/billing/saas-billing-ui";

export default async function AdminBillingSettingsPage(): Promise<React.ReactElement> {
  const repo = createPlatformBillingRepositoryFromEnv(process.env);
  const settings = await repo.getBillingSettings();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#010a19] dark:text-white">Paramètres</h2>
        <p className="mt-1 text-sm text-slate-500">
          Tarification plateforme et génération des factures mensuelles.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-[#010a19] dark:text-white">
              Paramètres tarifaires
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Actuel&nbsp;: {formatBillingMoney(settings.pricePerUnitAmount, settings.currencyCode)} /
              logement · gratuit sous {settings.freePropertyThreshold} biens
            </p>
          </div>
          <AdminGenerateInvoicesButton />
        </div>
        <div className="mt-4">
          <AdminBillingSettingsForm initial={settings} />
        </div>
      </section>
    </div>
  );
}
