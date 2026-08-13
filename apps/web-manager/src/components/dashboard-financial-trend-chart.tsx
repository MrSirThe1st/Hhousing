"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ChartData, ChartEvent, ChartOptions } from "chart.js";
import { useTheme } from "../contexts/theme-context";
import type { DashboardTrendBucket } from "../lib/dashboard-overview.types";
import "../lib/register-chart-js";

function LineChartPlaceholder(): React.ReactElement {
  return <div className="h-52 animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800" />;
}

const Line = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), {
  ssr: false,
  loading: LineChartPlaceholder
});

type TrendRange = 6 | 12;

type DashboardFinancialTrendChartProps = {
  trend: DashboardTrendBucket[];
};

function monthBounds(month: string): { from: string; to: string } {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  const from = new Date(Date.UTC(year, monthIndex, 1)).toISOString().slice(0, 10);
  const to = new Date(Date.UTC(year, monthIndex + 1, 0)).toISOString().slice(0, 10);
  return { from, to };
}

function formatExactAmount(amount: number, currencyCode: string): string {
  return `${amount.toLocaleString("fr-FR")} ${currencyCode}`.trim();
}

export default function DashboardFinancialTrendChart({
  trend
}: DashboardFinancialTrendChartProps): React.ReactElement {
  const router = useRouter();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [range, setRange] = useState<TrendRange>(6);

  const visibleTrend = useMemo(
    () => trend.slice(-range),
    [range, trend]
  );

  const currencyCode = visibleTrend[0]?.currencyCode ?? "";
  const hasData = visibleTrend.some(
    (bucket) => bucket.collectedAmount !== 0 || bucket.expectedAmount !== 0
  );

  const chart = useMemo(() => {
    const labels = visibleTrend.map((bucket) => bucket.label.replace(/\./g, ""));
    const collected = visibleTrend.map((bucket) => bucket.collectedAmount);
    const expected = visibleTrend.map((bucket) => bucket.expectedAmount);

    const data: ChartData<"line"> = {
      labels,
      datasets: [
        {
          label: "Encaissé",
          data: collected,
          borderColor: "#0063fe",
          backgroundColor: "rgba(0, 99, 254, 0.14)",
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 3,
          pointHoverRadius: 5,
          pointBackgroundColor: "#0063fe",
          pointBorderColor: isDark ? "#0d1526" : "#ffffff",
          pointBorderWidth: 2
        },
        {
          label: "Attendu",
          data: expected,
          borderColor: isDark ? "#94a3b8" : "#64748b",
          backgroundColor: "rgba(100, 116, 139, 0.08)",
          fill: true,
          tension: 0.35,
          borderWidth: 2,
          borderDash: [5, 4],
          pointRadius: 2,
          pointHoverRadius: 4,
          pointBackgroundColor: isDark ? "#94a3b8" : "#64748b",
          pointBorderColor: isDark ? "#0d1526" : "#ffffff",
          pointBorderWidth: 2
        }
      ]
    };

    return { data, months: visibleTrend.map((bucket) => bucket.month) };
  }, [isDark, visibleTrend]);

  const options = useMemo<ChartOptions<"line">>(() => {
    const gridColor = isDark ? "rgba(148, 163, 184, 0.16)" : "rgba(15, 23, 42, 0.08)";
    const tickColor = isDark ? "#94a3b8" : "#64748b";

    function openMonth(index: number): void {
      const month = chart.months[index];
      if (!month) {
        return;
      }
      const { from, to } = monthBounds(month);
      router.push(`/dashboard/revenues?from=${from}&to=${to}`);
    }

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      onHover(event, elements) {
        const native = event.native;
        if (native?.target instanceof HTMLElement) {
          native.target.style.cursor = elements.length > 0 ? "pointer" : "default";
        }
      },
      onClick(event: ChartEvent, elements, chartInstance) {
        const native = event.native;
        const points = native instanceof Event
          ? chartInstance.getElementsAtEventForMode(native, "index", { intersect: false }, true)
          : elements;
        const index = points[0]?.index;
        if (index == null) {
          return;
        }
        openMonth(index);
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? "#0d1526" : "#ffffff",
          titleColor: isDark ? "#f8fafc" : "#010a19",
          bodyColor: tickColor,
          borderColor: gridColor,
          borderWidth: 1,
          padding: 10,
          displayColors: true,
          boxWidth: 8,
          boxHeight: 8,
          boxPadding: 4,
          usePointStyle: true,
          callbacks: {
            label(context) {
              const value = context.parsed.y ?? 0;
              const series = context.dataset.label ?? "";
              return `${series} : ${formatExactAmount(value, currencyCode)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: tickColor,
            font: { size: 11, weight: 500 },
            maxRotation: 0
          },
          border: { display: false }
        },
        y: {
          beginAtZero: true,
          grid: { color: gridColor },
          ticks: {
            color: tickColor,
            font: { size: 11 },
            callback(value) {
              const amount = typeof value === "number" ? value : Number(value);
              return new Intl.NumberFormat("fr-FR", {
                notation: "compact",
                compactDisplay: "short",
                maximumFractionDigits: 1
              }).format(amount);
            }
          },
          border: { display: false }
        }
      }
    };
  }, [chart.months, currencyCode, isDark, router]);

  return (
    <section className="h-full rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#010a19] dark:text-white">Évolution des loyers</h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Encaissé vs attendu{currencyCode ? ` · ${currencyCode}` : ""}. Cliquez un mois pour le détail.
          </p>
        </div>
        <div className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900/40" role="tablist" aria-label="Période">
          {([6, 12] as const).map((months) => {
            const isActive = range === months;
            return (
              <button
                key={months}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setRange(months)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  isActive
                    ? "bg-white text-[#0063fe] shadow-sm ring-1 ring-slate-200 dark:bg-[#0d1526] dark:ring-slate-600"
                    : "text-slate-600 hover:text-[#010a19] dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                {months} mois
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium">
        <span className="inline-flex items-center gap-1.5 text-[#0063fe]">
          <span className="h-2 w-2 rounded-full bg-[#0063fe]" aria-hidden="true" /> Encaissé
        </span>
        <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <span className="h-2 w-2 rounded-full bg-slate-400" aria-hidden="true" /> Attendu
        </span>
      </div>

      {!hasData ? (
        <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
          Pas encore assez de données pour tracer une tendance.
        </p>
      ) : (
        <div
          className="mt-4 h-52"
          role="img"
          aria-label={`Graphique des loyers encaissés et attendus sur ${range} mois. Cliquez un mois pour ouvrir Revenus.`}
        >
          <Line data={chart.data} options={options} />
        </div>
      )}
    </section>
  );
}
