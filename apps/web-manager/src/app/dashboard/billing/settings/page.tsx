import ContactBillingSupportButton from "../../../../components/contact-billing-support-button";
import { createPlatformBillingRepositoryFromEnv } from "@hhousing/data-access";
import { formatBillingMoney } from "../../../../lib/billing/saas-billing-ui";
import { requireDashboardSectionAccess } from "../../../../lib/dashboard-access";

export default async function DashboardBillingSettingsPage(): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("billing");
  const repo = createPlatformBillingRepositoryFromEnv(process.env);
  const estimate = await repo.estimateOrganizationBilling(session.organizationId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-[#010a19] dark:text-white">Paramètres</h2>
        <p className="mt-1 text-sm text-slate-500">
          Votre offre Haraka et les informations utiles pour la facturation.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <h3 className="text-sm font-semibold text-[#010a19] dark:text-white">Offre &amp; tarification</h3>
        {estimate ? (
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs text-slate-500">Plan</dt>
              <dd className="mt-1 text-sm font-medium text-[#010a19] dark:text-white">
                {estimate.isFreeTier ? "Gratuit" : "Standard (usage)"}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Tarif</dt>
              <dd className="mt-1 text-sm font-medium text-[#010a19] dark:text-white">
                {formatBillingMoney(estimate.pricePerUnitAmount, estimate.currencyCode)} / logement /
                mois
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Biens</dt>
              <dd className="mt-1 text-sm font-medium text-[#010a19] dark:text-white">
                {estimate.propertyCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Logements</dt>
              <dd className="mt-1 text-sm font-medium text-[#010a19] dark:text-white">
                {estimate.unitCount}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Seuil gratuit</dt>
              <dd className="mt-1 text-sm font-medium text-[#010a19] dark:text-white">
                {estimate.freePropertyThreshold} biens
              </dd>
            </div>
            <div>
              <dt className="text-xs text-slate-500">Estimation période en cours</dt>
              <dd className="mt-1 text-sm font-medium text-[#010a19] dark:text-white">
                {formatBillingMoney(estimate.amountDue, estimate.currencyCode)}
              </dd>
            </div>
          </dl>
        ) : (
          <p className="mt-4 text-sm text-slate-500">Impossible de charger votre offre.</p>
        )}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
        <h3 className="text-sm font-semibold text-[#010a19] dark:text-white">Support</h3>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
          Une question sur une facture ou un paiement&nbsp;? Contactez le support Haraka.
        </p>
        <div className="mt-4">
          <ContactBillingSupportButton />
        </div>
      </section>
    </div>
  );
}
