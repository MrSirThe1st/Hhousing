import FinanceFilterForm from "../../../components/finance-filter-form";
import FinanceMonthlyChart from "../../../components/finance-monthly-chart";
import RevenuesLedgerTable from "../../../components/revenues-ledger-table";
import {
  buildRevenueDataset,
  formatCurrencySummary,
  loadScopedPayments,
  normalizeFinanceFilters
} from "../../../lib/finance-reporting";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";

type RevenuesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function RevenuesPage({ searchParams }: RevenuesPageProps): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("finances");

  const params = await searchParams;
  const filters = normalizeFinanceFilters(params);
  const { payments, scopedPortfolio } = await loadScopedPayments(session);
  const dataset = buildRevenueDataset(payments, scopedPortfolio, filters);

  return (
    <div id="revenues-container" className="space-y-6 p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">Revenus</h1>
          <p className="mt-2 text-sm text-slate-500">
            Revenus opérationnels encaissés (hors garanties locatives).
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-8 border-b border-slate-200 pb-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Revenu encaissé</p>
          <p className="text-xl font-semibold text-slate-900">{formatCurrencySummary(dataset.revenueTotals)}</p>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Encaissements</p>
          <p className="text-xl font-semibold text-slate-900">{dataset.recordedPaymentCount.toLocaleString("fr-FR")}</p>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Garanties (passif)</p>
          <p className="text-xl font-semibold text-slate-900">{formatCurrencySummary(dataset.depositLiabilityTotals)}</p>
          <p className="mt-1 text-xs text-slate-500">{dataset.recordedDepositCount.toLocaleString("fr-FR")} encaissement(s)</p>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Propriétés actives</p>
          <p className="text-xl font-semibold text-slate-900">{dataset.propertyRevenue.length.toLocaleString("fr-FR")}</p>
        </div>
      </div>

      <FinanceFilterForm actionPath="/dashboard/revenues" filters={dataset.filters} propertyOptions={dataset.propertyOptions} />

      <FinanceMonthlyChart
        buckets={dataset.monthlyRevenue}
        emptyLabel="Aucun revenu encaissé sur cette période."
      />

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#010a19]">Par propriété</h2>
          <p className="mt-1 text-sm text-gray-500">Vue portefeuille des revenus déjà encaissés.</p>

          {dataset.propertyRevenue.length === 0 ? (
            <p className="mt-5 text-sm text-gray-500">Aucun revenu à afficher pour les filtres actifs.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {dataset.propertyRevenue.map((property) => (
                <div key={property.propertyId} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-[#010a19]">{property.propertyName}</p>
                      <p className="mt-1 text-sm text-gray-500">{property.paymentCount} encaissement(s)</p>
                    </div>
                    <p className="text-sm font-semibold text-[#010a19]">{formatCurrencySummary(property.totals)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#010a19]">Grand livre des revenus</h2>
          <p className="mt-1 text-sm text-gray-500">Un paiement payé devient un revenu ici. Rien n’est stocké en plus.</p>

          {dataset.ledger.length === 0 ? (
            <p className="mt-5 text-sm text-gray-500">Aucun revenu enregistré pour les filtres actifs.</p>
          ) : (
            <RevenuesLedgerTable entries={dataset.ledger} />
          )}
        </article>
      </section>
    </div>
  );
}