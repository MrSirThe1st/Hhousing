"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import type { ChartData, ChartOptions } from "chart.js";
import { useTheme } from "../../contexts/theme-context";
import "../../lib/register-chart-js";
import DashboardOccupancyChart from "../dashboard-occupancy-chart";

function ChartPlaceholder({ className }: { className: string }): React.ReactElement {
  return <div className={`animate-pulse rounded-lg bg-slate-100 dark:bg-slate-800 ${className}`} />;
}

const Line = dynamic(() => import("react-chartjs-2").then((mod) => mod.Line), {
  ssr: false,
  loading: () => <ChartPlaceholder className="h-52" />
});

const Doughnut = dynamic(() => import("react-chartjs-2").then((mod) => mod.Doughnut), {
  ssr: false,
  loading: () => <ChartPlaceholder className="mx-auto h-40 w-40 rounded-full" />
});

export type OwnerMonthlyIncomePoint = {
  period: string;
  label: string;
  amount: number;
};

export type OwnerOverviewChartsProps = {
  occupiedUnits: number;
  units: number;
  occupancyRate: number;
  currencyCode: string;
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  monthlyIncome: OwnerMonthlyIncomePoint[];
  propertyIncome: Array<{ name: string; amount: number }>;
};

function formatMoney(amount: number, currencyCode: string): string {
  return `${amount.toLocaleString("fr-FR")} ${currencyCode}`.trim();
}

function buildLastMonths(
  monthlyIncome: OwnerMonthlyIncomePoint[],
  months: number
): OwnerMonthlyIncomePoint[] {
  const byPeriod = new Map(monthlyIncome.map((row) => [row.period, row]));
  const now = new Date();
  const rows: OwnerMonthlyIncomePoint[] = [];

  for (let offset = months - 1; offset >= 0; offset -= 1) {
    const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    const period = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    const existing = byPeriod.get(period);
    rows.push(
      existing ?? {
        period,
        label: new Intl.DateTimeFormat("fr-FR", { month: "short", year: "numeric" }).format(date),
        amount: 0
      }
    );
  }

  return rows;
}

function OwnerMonthlyIncomeChart({
  monthlyIncome,
  currencyCode
}: {
  monthlyIncome: OwnerMonthlyIncomePoint[];
  currencyCode: string;
}): React.ReactElement {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [range, setRange] = useState<6 | 12>(6);
  const visible = useMemo(
    () => buildLastMonths(monthlyIncome, range),
    [monthlyIncome, range]
  );
  const hasData = visible.some((row) => row.amount > 0);

  const data = useMemo<ChartData<"line">>(
    () => ({
      labels: visible.map((row) => row.label.replace(/\./g, "")),
      datasets: [
        {
          label: "Encaissé",
          data: visible.map((row) => row.amount),
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
        }
      ]
    }),
    [isDark, visible]
  );

  const options = useMemo<ChartOptions<"line">>(() => {
    const gridColor = isDark ? "rgba(148, 163, 184, 0.16)" : "rgba(15, 23, 42, 0.08)";
    const tickColor = isDark ? "#94a3b8" : "#64748b";

    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? "#0d1526" : "#ffffff",
          titleColor: isDark ? "#f8fafc" : "#010a19",
          bodyColor: tickColor,
          borderColor: gridColor,
          borderWidth: 1,
          callbacks: {
            label(context) {
              return formatMoney(context.parsed.y ?? 0, currencyCode);
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: tickColor, font: { size: 11, weight: 500 }, maxRotation: 0 },
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
  }, [currencyCode, isDark]);

  return (
    <section className="h-full rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#010a19] dark:text-white">
            Encaissements mensuels
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Loyers marqués payés{currencyCode ? ` · ${currencyCode}` : ""}
          </p>
        </div>
        <div
          className="inline-flex shrink-0 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-900/40"
          role="tablist"
          aria-label="Période"
        >
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

      {!hasData ? (
        <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
          Pas encore assez de paiements payés pour tracer une tendance.
        </p>
      ) : (
        <div
          className="mt-4 h-52"
          role="img"
          aria-label={`Graphique des encaissements sur ${range} mois`}
        >
          <Line data={data} options={options} />
        </div>
      )}
    </section>
  );
}

function OwnerPaymentStatusChart({
  paidAmount,
  pendingAmount,
  overdueAmount,
  currencyCode
}: {
  paidAmount: number;
  pendingAmount: number;
  overdueAmount: number;
  currencyCode: string;
}): React.ReactElement {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const total = paidAmount + pendingAmount + overdueAmount;
  const legendColor = isDark ? "#cbd5e1" : "#475569";

  const slices = [
    { label: "Payé", amount: paidAmount, color: "#0063fe" },
    { label: "En attente", amount: pendingAmount, color: isDark ? "#f59e0b" : "#f59e0b" },
    { label: "En retard", amount: overdueAmount, color: "#f43f5e" }
  ];

  const data = useMemo<ChartData<"doughnut">>(
    () => ({
      labels: slices.map((slice) => slice.label),
      datasets: [
        {
          data: slices.map((slice) => slice.amount),
          backgroundColor: slices.map((slice) => slice.color),
          borderWidth: 0,
          hoverOffset: 4
        }
      ]
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- slices derived from amounts/theme
    [isDark, overdueAmount, paidAmount, pendingAmount]
  );

  const options = useMemo<ChartOptions<"doughnut">>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      cutout: "72%",
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? "#0d1526" : "#ffffff",
          titleColor: isDark ? "#f8fafc" : "#010a19",
          bodyColor: legendColor,
          borderColor: isDark ? "rgba(148, 163, 184, 0.16)" : "rgba(15, 23, 42, 0.08)",
          borderWidth: 1,
          displayColors: false,
          callbacks: {
            label(context) {
              return formatMoney(context.parsed, currencyCode);
            }
          }
        }
      }
    }),
    [currencyCode, isDark, legendColor]
  );

  return (
    <section className="h-full rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
      <div>
        <h2 className="text-base font-semibold text-[#010a19] dark:text-white">Statut des loyers</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Répartition des montants{currencyCode ? ` · ${currencyCode}` : ""}
        </p>
      </div>

      {total <= 0 ? (
        <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
          Aucun paiement à afficher pour le moment.
        </p>
      ) : (
        <>
          <div
            className="relative mx-auto mt-4 h-40 w-40"
            role="img"
            aria-label="Répartition payé, en attente et en retard"
          >
            <Doughnut data={data} options={options} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-sm font-semibold tabular-nums text-[#010a19] dark:text-white">
                {formatMoney(total, currencyCode)}
              </p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Total
              </p>
            </div>
          </div>
          <ul className="mt-4 space-y-2 text-xs font-medium text-slate-600 dark:text-slate-300">
            {slices.map((slice) => (
              <li key={slice.label} className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: slice.color }}
                    aria-hidden="true"
                  />
                  {slice.label}
                </span>
                <span className="tabular-nums text-[#010a19] dark:text-white">
                  {formatMoney(slice.amount, currencyCode)}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}

function OwnerPropertyIncomeList({
  propertyIncome,
  currencyCode
}: {
  propertyIncome: Array<{ name: string; amount: number }>;
  currencyCode: string;
}): React.ReactElement {
  const top = propertyIncome.slice(0, 5);
  const maxAmount = Math.max(...top.map((row) => row.amount), 1);

  return (
    <section className="h-full rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
      <div>
        <h2 className="text-base font-semibold text-[#010a19] dark:text-white">
          Top biens par encaissement
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Montants payés rattachés à chaque bien
        </p>
      </div>

      {top.length === 0 || top.every((row) => row.amount <= 0) ? (
        <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
          Aucun encaissement payé à comparer pour le moment.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {top.map((row) => {
            const width = Math.max(8, Math.round((row.amount / maxAmount) * 100));
            return (
              <li key={row.name}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <p className="min-w-0 truncate font-medium text-[#010a19] dark:text-white">
                    {row.name}
                  </p>
                  <p className="shrink-0 tabular-nums text-slate-600 dark:text-slate-300">
                    {formatMoney(row.amount, currencyCode)}
                  </p>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div
                    className="h-full rounded-full bg-[#0063fe]"
                    style={{ width: `${width}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export default function OwnerPortalOverviewCharts({
  occupiedUnits,
  units,
  occupancyRate,
  currencyCode,
  paidAmount,
  pendingAmount,
  overdueAmount,
  monthlyIncome,
  propertyIncome
}: OwnerOverviewChartsProps): React.ReactElement {
  return (
    <div className="space-y-3">
      <div className="grid gap-3 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <OwnerMonthlyIncomeChart monthlyIncome={monthlyIncome} currencyCode={currencyCode} />
        <DashboardOccupancyChart
          occupiedUnits={occupiedUnits}
          units={units}
          occupancyRate={occupancyRate}
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <OwnerPaymentStatusChart
          paidAmount={paidAmount}
          pendingAmount={pendingAmount}
          overdueAmount={overdueAmount}
          currencyCode={currencyCode}
        />
        <OwnerPropertyIncomeList propertyIncome={propertyIncome} currencyCode={currencyCode} />
      </div>
    </div>
  );
}
