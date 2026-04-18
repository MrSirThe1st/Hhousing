import Link from "next/link";
import { redirect } from "next/navigation";
import FinanceFilterForm from "../../../components/finance-filter-form";
import FinanceMonthlyChart from "../../../components/finance-monthly-chart";
import {
  buildExpenseDataset,
  buildFinanceQueryString,
  buildPropertyFinanceSummary,
  buildRevenueDataset,
  formatCurrencySummary,
  loadScopedFinanceData,
  normalizeFinanceFilters,
  subtractCurrencyTotals
} from "../../../lib/finance-reporting";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";

type ReportsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("finances");

  const params = await searchParams;
  const filters = normalizeFinanceFilters(params);
  const { payments, expenses, scopedPortfolio } = await loadScopedFinanceData(session);
  const revenueDataset = buildRevenueDataset(payments, scopedPortfolio, filters);
  const expenseDataset = buildExpenseDataset(expenses, scopedPortfolio, filters);
  const netTotals = subtractCurrencyTotals(revenueDataset.revenueTotals, expenseDataset.expenseTotals);
  const propertySummary = buildPropertyFinanceSummary(revenueDataset, expenseDataset);
  const exportQuery = buildFinanceQueryString(filters);
  const csvHref = `/api/reports/finance/export${exportQuery.length > 0 ? `?${exportQuery}` : ""}`;
  const pdfHref = `/reports/finance/print${exportQuery.length > 0 ? `?${exportQuery}` : ""}`;

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">Rapports</h1>
          <p className="mt-2 text-sm text-slate-500">
            Agrégation des revenus et dépenses, recalculée à chaque ouverture.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <a
            href={csvHref}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Exporter CSV
          </a>
          <Link
            href={pdfHref}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
          >
            Exporter PDF
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-8 border-b border-slate-200 pb-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Total revenus</p>
          <p className="text-xl font-semibold text-slate-900">{formatCurrencySummary(revenueDataset.revenueTotals)}</p>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Total dépenses</p>
          <p className="text-xl font-semibold text-slate-900">{formatCurrencySummary(expenseDataset.expenseTotals)}</p>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Dépôts (passif)</p>
          <p className="text-xl font-semibold text-slate-900">{formatCurrencySummary(revenueDataset.depositLiabilityTotals)}</p>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Net income</p>
          <p className="text-xl font-semibold text-slate-900">{formatCurrencySummary(netTotals)}</p>
        </div>
      </div>

      <FinanceFilterForm actionPath="/dashboard/reports" filters={revenueDataset.filters} propertyOptions={revenueDataset.propertyOptions} />

      <section className="grid gap-6 xl:grid-cols-2">
        <FinanceMonthlyChart
          buckets={revenueDataset.monthlyRevenue}
          emptyLabel="Aucune donnée de revenu à agréger sur cette période."
        />
        <FinanceMonthlyChart
          buckets={expenseDataset.monthlyExpenses}
          emptyLabel="Aucune dépense à agréger sur cette période."
        />
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[#010a19]">Lecture du portefeuille</h2>
            <p className="mt-1 text-sm text-gray-500">Synthèse par propriété, recalculée à chaque ouverture de page.</p>
          </div>
        </div>

        {revenueDataset.propertyRevenue.length === 0 && expenseDataset.propertyExpenses.length === 0 ? (
          <p className="mt-5 text-sm text-gray-500">Aucune donnée à agréger pour les filtres actifs.</p>
        ) : (
          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            {propertySummary.map((property) => (
              <article key={property.propertyId ?? "general"} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-[#010a19]">{property.propertyName}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      {property.paymentCount} revenu(x) · {property.expenseCount} dépense(s)
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#010a19]">Rev: {formatCurrencySummary(property.revenueTotals)}</p>
                    <p className="mt-1 text-xs text-gray-500">Dép: {formatCurrencySummary(property.expenseTotals)}</p>
                    <p className="mt-1 text-xs font-medium text-gray-600">
                      Net: {formatCurrencySummary(property.netTotals)}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}