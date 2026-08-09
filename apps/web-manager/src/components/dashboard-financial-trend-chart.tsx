import type { DashboardTrendBucket } from "../lib/dashboard-overview.types";

type DashboardFinancialTrendChartProps = {
  trend: DashboardTrendBucket[];
};

function amountFromTotals(totals: { amount: number }[]): number {
  return totals[0]?.amount ?? 0;
}

function buildPolyline(values: number[], width: number, height: number, padY: number): string {
  if (values.length === 0) {
    return "";
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = Math.max(max - min, 1);
  const stepX = values.length === 1 ? 0 : width / (values.length - 1);

  return values
    .map((value, index) => {
      const x = index * stepX;
      const y = padY + (height - padY * 2) * (1 - (value - min) / range);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

export default function DashboardFinancialTrendChart({
  trend
}: DashboardFinancialTrendChartProps): React.ReactElement {
  const width = 640;
  const height = 180;
  const padY = 16;

  const revenue = trend.map((bucket) => amountFromTotals(bucket.revenueTotals));
  const hasData = revenue.some((amount) => amount !== 0);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
      <div>
        <h2 className="text-base font-semibold text-[#010a19] dark:text-white">Évolution des loyers</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Loyers reçus sur les six derniers mois.
        </p>
      </div>

      {!hasData ? (
        <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">Pas encore assez de données pour tracer une tendance.</p>
      ) : (
        <>
          <div className="mt-4 flex flex-wrap gap-4 text-xs font-medium">
            <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <span className="h-2 w-2 rounded-full bg-emerald-500" /> Loyers
            </span>
          </div>

          <div className="mt-4 overflow-x-auto">
            <svg
              viewBox={`0 0 ${width} ${height}`}
              className="h-44 w-full min-w-80"
              role="img"
              aria-label="Graphique d'évolution des loyers reçus sur six mois"
            >
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                points={buildPolyline(revenue, width, height, padY)}
              />
            </svg>
          </div>

          <div className="mt-1 grid grid-cols-6 gap-1 text-center text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {trend.map((bucket) => (
              <span key={bucket.month} className="truncate">
                {bucket.label.replace(/\./g, "")}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
