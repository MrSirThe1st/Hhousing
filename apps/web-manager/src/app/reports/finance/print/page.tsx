import { redirect } from "next/navigation";
import ReportPrintTrigger from "../../../../components/report-print-trigger";
import {
  buildExpenseDataset,
  buildFinanceQueryString,
  buildMonthlyNetBuckets,
  buildPropertyFinanceSummary,
  buildRevenueDataset,
  formatCurrencySummary,
  formatExpenseCategory,
  loadScopedFinanceData,
  normalizeFinanceFilters,
  subtractCurrencyTotals
} from "../../../../lib/finance-reporting";
import { getServerAuthSession } from "../../../../lib/session";

type PrintReportPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PrintReportPage({ searchParams }: PrintReportPageProps): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const filters = normalizeFinanceFilters(params);
  const query = buildFinanceQueryString(filters);
  const backHref = `/dashboard/reports${query.length > 0 ? `?${query}` : ""}`;
  const { payments, expenses, scopedPortfolio } = await loadScopedFinanceData(session);
  const revenueDataset = buildRevenueDataset(payments, scopedPortfolio, filters);
  const expenseDataset = buildExpenseDataset(expenses, scopedPortfolio, filters);
  const propertySummary = buildPropertyFinanceSummary(revenueDataset, expenseDataset);
  const monthlyNet = buildMonthlyNetBuckets(revenueDataset, expenseDataset);
  const netTotals = subtractCurrencyTotals(revenueDataset.revenueTotals, expenseDataset.expenseTotals);

  return (
    <div className="min-h-screen bg-white px-6 py-8 text-[#010a19] print:p-0">
      <div className="mx-auto max-w-5xl">
        <ReportPrintTrigger backHref={backHref} />

        <section className="border-b border-gray-200 pb-6">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0063fe]">Finance · Rapport imprimable</p>
          <h1 className="mt-2 text-3xl font-semibold">Rapport financier</h1>
          <p className="mt-2 text-sm text-gray-600">Période du {filters.from} au {filters.to}</p>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <article className="rounded-xl border border-gray-200 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Revenus (hors dépôts)</p>
            <p className="mt-2 text-lg font-semibold">{formatCurrencySummary(revenueDataset.revenueTotals)}</p>
          </article>
          <article className="rounded-xl border border-gray-200 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Dépenses</p>
            <p className="mt-2 text-lg font-semibold">{formatCurrencySummary(expenseDataset.expenseTotals)}</p>
          </article>
          <article className="rounded-xl border border-gray-200 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Dépôts (passif)</p>
            <p className="mt-2 text-lg font-semibold">{formatCurrencySummary(revenueDataset.depositLiabilityTotals)}</p>
          </article>
          <article className="rounded-xl border border-gray-200 p-4">
            <p className="text-xs uppercase tracking-[0.16em] text-gray-400">Net</p>
            <p className="mt-2 text-lg font-semibold">{formatCurrencySummary(netTotals)}</p>
          </article>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Lecture mensuelle</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-[0.14em] text-gray-400">
                <tr>
                  <th className="pb-3">Mois</th>
                  <th className="pb-3">Revenus</th>
                  <th className="pb-3">Dépenses</th>
                  <th className="pb-3">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {monthlyNet.map((month) => (
                  <tr key={month.month}>
                    <td className="py-3">{month.label}</td>
                    <td className="py-3">{formatCurrencySummary(month.revenueTotals)}</td>
                    <td className="py-3">{formatCurrencySummary(month.expenseTotals)}</td>
                    <td className="py-3 font-medium">{formatCurrencySummary(month.netTotals)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Par propriété</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-[0.14em] text-gray-400">
                <tr>
                  <th className="pb-3">Portefeuille</th>
                  <th className="pb-3">Revenus</th>
                  <th className="pb-3">Dépenses</th>
                  <th className="pb-3">Net</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {propertySummary.map((property) => (
                  <tr key={property.propertyId ?? "general"}>
                    <td className="py-3">{property.propertyName}</td>
                    <td className="py-3">{formatCurrencySummary(property.revenueTotals)}</td>
                    <td className="py-3">{formatCurrencySummary(property.expenseTotals)}</td>
                    <td className="py-3 font-medium">{formatCurrencySummary(property.netTotals)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold">Détail des dépenses</h2>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-200 text-left text-xs uppercase tracking-[0.14em] text-gray-400">
                <tr>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Libellé</th>
                  <th className="pb-3">Propriété</th>
                  <th className="pb-3">Unité</th>
                  <th className="pb-3">Catégorie</th>
                  <th className="pb-3">Fournisseur</th>
                  <th className="pb-3">Payé à</th>
                  <th className="pb-3 text-right">Montant</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expenseDataset.ledger.map((expense) => (
                  <tr key={expense.expenseId}>
                    <td className="py-3">{expense.expenseDate}</td>
                    <td className="py-3">{expense.title}</td>
                    <td className="py-3">{expense.propertyName}</td>
                    <td className="py-3">{expense.unitLabel ?? "Toute la propriété"}</td>
                    <td className="py-3">{formatExpenseCategory(expense.category)}</td>
                    <td className="py-3">{expense.vendorName ?? "-"}</td>
                    <td className="py-3">{expense.payeeName ?? "-"}</td>
                    <td className="py-3 text-right font-medium">{expense.amount.toLocaleString("fr-FR")} {expense.currencyCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}