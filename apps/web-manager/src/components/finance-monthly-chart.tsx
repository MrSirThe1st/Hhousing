"use client";

import { useMemo, useState } from "react";
import type { CurrencyTotal, FinanceMonthlyBucket } from "../lib/finance-reporting.types";

interface FinanceMonthlyChartProps {
  buckets: FinanceMonthlyBucket[];
  emptyLabel: string;
}

function listCurrencies(buckets: FinanceMonthlyBucket[]): string[] {
  const currencies = new Set<string>();
  for (const bucket of buckets) {
    for (const total of bucket.totals) {
      currencies.add(total.currencyCode);
    }
  }
  return [...currencies].sort((left, right) => left.localeCompare(right, "fr"));
}

function seriesTotal(buckets: FinanceMonthlyBucket[], currencyCode: string): number {
  return buckets.reduce((sum, bucket) => {
    const match = bucket.totals.find((item) => item.currencyCode === currencyCode);
    return sum + (match?.amount ?? 0);
  }, 0);
}

export default function FinanceMonthlyChart({ buckets, emptyLabel }: FinanceMonthlyChartProps): React.ReactElement {
  const currencies = useMemo(() => listCurrencies(buckets), [buckets]);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const activeCurrency = selectedCurrency && currencies.includes(selectedCurrency)
    ? selectedCurrency
    : currencies[0] ?? null;

  if (buckets.length === 0 || activeCurrency === null) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  const entries = buckets.map((bucket) => ({
    label: bucket.label,
    amount: bucket.totals.find((total: CurrencyTotal) => total.currencyCode === activeCurrency)?.amount ?? 0
  }));
  const maxAmount = Math.max(...entries.map((entry) => entry.amount), 1);
  const periodTotal = seriesTotal(buckets, activeCurrency);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[#010a19]">Décomposition mensuelle</h2>
          <p className="mt-1 text-sm text-slate-500">
            Une devise à la fois — total période{" "}
            <span className="font-medium tabular-nums text-slate-700">
              {periodTotal.toLocaleString("fr-FR")} {activeCurrency}
            </span>
          </p>
        </div>

        {currencies.length > 1 ? (
          <div className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-1" role="tablist" aria-label="Devise">
            {currencies.map((currencyCode) => {
              const isActive = currencyCode === activeCurrency;
              return (
                <button
                  key={currencyCode}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setSelectedCurrency(currencyCode)}
                  className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                    isActive
                      ? "bg-white text-[#0063fe] shadow-sm ring-1 ring-slate-200"
                      : "text-slate-600 hover:text-[#010a19]"
                  }`}
                >
                  {currencyCode}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{activeCurrency}</p>
        )}
      </div>

      <div className="mt-5 divide-y divide-slate-100 border-t border-slate-100">
        {entries.map((entry) => (
          <div key={entry.label} className="grid grid-cols-[5.5rem_1fr_auto] items-center gap-3 py-2.5">
            <span className="text-xs font-medium uppercase tracking-[0.12em] text-slate-400">{entry.label}</span>
            <div className="h-2.5 rounded-full bg-slate-100">
              <div
                className="h-2.5 rounded-full bg-[#0063fe]"
                style={{ width: `${Math.max((entry.amount / maxAmount) * 100, entry.amount > 0 ? 6 : 0)}%` }}
              />
            </div>
            <span className="min-w-[5.5rem] text-right text-sm font-medium tabular-nums text-[#010a19]">
              {entry.amount.toLocaleString("fr-FR")}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}
