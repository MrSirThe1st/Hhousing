import Link from "next/link";
import { redirect } from "next/navigation";
import FinanceFilterForm from "../../../components/finance-filter-form";
import FinanceMonthlyChart from "../../../components/finance-monthly-chart";
import FinanceSummaryCards from "../../../components/finance-summary-cards";
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
import { getServerAuthSession } from "../../../lib/session";

type ReportsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

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
      <section className="rounded-[28px] border border-gray-200 bg-[radial-gradient(circle_at_top_left,rgba(0,99,254,0.10),transparent_32%),linear-gradient(180deg,#ffffff_0%,#f5f9ff_100%)] p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0063fe]">Finance · Rapports</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#010a19]">Rapports</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Cette page n’écrit rien. Elle agrège simplement les revenus enregistrés, applique vos filtres, calcule les totaux
          et affiche la tendance mensuelle. Le résultat net est recalculé à chaque ouverture à partir des revenus encaissés
          et des dépenses réellement saisies.
        </p>
      </section>

      <FinanceFilterForm actionPath="/dashboard/reports" filters={revenueDataset.filters} propertyOptions={revenueDataset.propertyOptions} />

      <section className="flex flex-wrap items-center gap-3">
        <a
          href={csvHref}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Exporter CSV
        </a>
        <Link
          href={pdfHref}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-medium text-white hover:bg-[#0050d0]"
        >
          Exporter PDF
        </Link>
      </section>

      <FinanceSummaryCards
        items={[
          {
            label: "Total revenus",
            value: formatCurrencySummary(revenueDataset.revenueTotals),
            hint: `Du ${revenueDataset.filters.from} au ${revenueDataset.filters.to}`
          },
          {
            label: "Total dépenses",
            value: formatCurrencySummary(expenseDataset.expenseTotals),
            hint: "Sorties enregistrées sur la période"
          },
          {
            label: "Net income",
            value: formatCurrencySummary(netTotals),
            hint: "Revenus - dépenses enregistrées"
          },
          {
            label: "Lignes agrégées",
            value: `${revenueDataset.recordedPaymentCount.toLocaleString("fr-FR")} rev. / ${expenseDataset.recordedExpenseCount.toLocaleString("fr-FR")} dép.`,
            hint: "Données réellement utilisées dans le calcul"
          }
        ]}
      />

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