import CurrencyTotalStack from "../../../components/currency-total-stack";
import FinanceFilterForm from "../../../components/finance-filter-form";
import RevenuesLedgerTable from "../../../components/revenues-ledger-table";
import { loadRevenuesPageData } from "../../../lib/revenues-page-data";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";

type RevenuesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RevenuesPage({ searchParams }: RevenuesPageProps): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("finances");

  const params = await searchParams;
  const dataset = await loadRevenuesPageData(session, params);
  const ledgerPageSize = Math.max(4, Math.min(8, dataset.propertyRevenue.length || 6));

  return (
    <div id="revenues-container" className="space-y-6 p-8">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">Revenus</h1>
        <p className="mt-2 text-sm text-slate-500">
          Revenus opérationnels encaissés (hors garanties locatives).
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-8 border-b border-slate-200 pb-3">
        <div className="min-w-[9rem]">
          <p className="text-xs uppercase tracking-wide text-slate-500">Revenu encaissé</p>
          <div className="mt-2">
            <CurrencyTotalStack totals={dataset.revenueTotals} />
          </div>
        </div>

        <div className="hidden h-10 w-px self-center bg-slate-200 sm:block" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Encaissements</p>
          <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900">
            {dataset.recordedPaymentCount.toLocaleString("fr-FR")}
          </p>
        </div>

        <div className="hidden h-10 w-px self-center bg-slate-200 sm:block" />

        <div className="min-w-[9rem]">
          <p className="text-xs uppercase tracking-wide text-slate-500">Cautions (passif)</p>
          <div className="mt-2">
            <CurrencyTotalStack totals={dataset.depositLiabilityTotals} tone="muted" />
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {dataset.recordedDepositCount.toLocaleString("fr-FR")} encaissement(s)
          </p>
        </div>

        <div className="hidden h-10 w-px self-center bg-slate-200 sm:block" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Propriétés actives</p>
          <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900">
            {dataset.propertyRevenue.length.toLocaleString("fr-FR")}
          </p>
        </div>
      </div>

      <FinanceFilterForm
        actionPath="/dashboard/revenues"
        filters={dataset.filters}
        propertyOptions={dataset.propertyOptions}
      />

      <section className="grid items-stretch gap-6 xl:grid-cols-12">
        <div className="flex xl:col-span-4">
          <article className="flex h-full min-h-0 w-full flex-col rounded-xl border border-slate-200 bg-white">
            <div className="shrink-0 border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-[#010a19]">Par propriété</h2>
              <p className="mt-1 text-sm text-slate-500">Vue portefeuille des revenus déjà encaissés.</p>
            </div>

            {dataset.propertyRevenue.length === 0 ? (
              <div className="flex flex-1 items-center justify-center px-5 py-8 text-center text-sm text-slate-400">
                Aucun revenu à afficher pour les filtres actifs.
              </div>
            ) : (
              <ul className="min-h-0 flex-1 divide-y divide-slate-200 overflow-y-auto">
                {dataset.propertyRevenue.map((property) => (
                  <li key={property.propertyId} className="flex items-start justify-between gap-4 px-5 py-4">
                    <div className="min-w-0">
                      <p className="font-medium text-[#010a19]">{property.propertyName}</p>
                      <p className="mt-0.5 text-sm text-slate-500">{property.paymentCount} encaissement(s)</p>
                    </div>
                    <div className="min-w-26 shrink-0">
                      <CurrencyTotalStack totals={property.totals} size="sm" />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>

        <div className="flex xl:col-span-8">
          <article className="flex h-full min-h-0 w-full flex-col rounded-xl border border-slate-200 bg-white">
            <div className="shrink-0 border-b border-slate-200 px-5 py-4">
              <h2 className="text-base font-semibold text-[#010a19]">Grand livre des revenus</h2>
              <p className="mt-1 text-sm text-slate-500">Un paiement payé devient un revenu ici.</p>
            </div>

            <div className="flex min-h-0 flex-1 flex-col">
              {dataset.ledger.length === 0 ? (
                <div className="flex flex-1 items-center justify-center px-5 py-8 text-center text-sm text-slate-400">
                  Aucun revenu enregistré pour les filtres actifs.
                </div>
              ) : (
                <RevenuesLedgerTable entries={dataset.ledger} pageSize={ledgerPageSize} />
              )}
            </div>
          </article>
        </div>
      </section>
    </div>
  );
}
