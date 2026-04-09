import type { CurrencyTotal, FinanceMonthlyBucket } from "../lib/finance-reporting.types";
import { formatCurrencySummary } from "../lib/finance-reporting";

interface FinanceMonthlyChartProps {
  buckets: FinanceMonthlyBucket[];
  emptyLabel: string;
}

function getCurrencySeries(buckets: FinanceMonthlyBucket[]): Array<{ currencyCode: string; entries: Array<{ label: string; amount: number; totals: CurrencyTotal[] }> }> {
  const currencies = new Set<string>();

  for (const bucket of buckets) {
    for (const total of bucket.totals) {
      currencies.add(total.currencyCode);
    }
  }

  return [...currencies]
    .sort((left, right) => left.localeCompare(right, "fr"))
    .map((currencyCode) => ({
      currencyCode,
      entries: buckets.map((bucket) => ({
        label: bucket.label,
        amount: bucket.totals.find((total) => total.currencyCode === currencyCode)?.amount ?? 0,
        totals: bucket.totals
      }))
    }));
}

export default function FinanceMonthlyChart({ buckets, emptyLabel }: FinanceMonthlyChartProps): React.ReactElement {
  const series = getCurrencySeries(buckets);

  if (buckets.length === 0 || series.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center text-sm text-gray-500 shadow-sm">
        {emptyLabel}
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[#010a19]">Décomposition mensuelle</h2>
          <p className="mt-1 text-sm text-gray-500">Affichage séparé par devise pour éviter les faux totaux multi-devise.</p>
        </div>
      </div>

      <div className="mt-5 space-y-6">
        {series.map((currency) => {
          const maxAmount = Math.max(...currency.entries.map((entry) => entry.amount), 1);

          return (
            <div key={currency.currencyCode}>
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-[#010a19]">{currency.currencyCode}</p>
                <p className="text-xs text-gray-500">
                  {formatCurrencySummary(
                    buckets.map((bucket) => bucket.totals.find((item) => item.currencyCode === currency.currencyCode)).filter(
                      (item): item is CurrencyTotal => item !== undefined
                    )
                  )}
                </p>
              </div>

              <div className="space-y-3">
                {currency.entries.map((entry) => (
                  <div key={`${currency.currencyCode}-${entry.label}`} className="grid grid-cols-[80px_1fr_auto] items-center gap-3">
                    <span className="text-xs font-medium uppercase tracking-[0.14em] text-gray-400">{entry.label}</span>
                    <div className="h-3 rounded-full bg-gray-100">
                      <div
                        className="h-3 rounded-full bg-[#0063fe]"
                        style={{ width: `${Math.max((entry.amount / maxAmount) * 100, entry.amount > 0 ? 6 : 0)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-[#010a19]">{entry.amount.toLocaleString("fr-FR")} {currency.currencyCode}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}