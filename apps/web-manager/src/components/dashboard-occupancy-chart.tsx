"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { ChartData, ChartOptions } from "chart.js";
import { useTheme } from "../contexts/theme-context";
import "../lib/register-chart-js";

function DoughnutPlaceholder(): React.ReactElement {
  return <div className="h-40 w-40 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800" />;
}

const Doughnut = dynamic(() => import("react-chartjs-2").then((mod) => mod.Doughnut), {
  ssr: false,
  loading: DoughnutPlaceholder
});

type DashboardOccupancyChartProps = {
  occupiedUnits: number;
  units: number;
  occupancyRate: number;
};

export default function DashboardOccupancyChart({
  occupiedUnits,
  units,
  occupancyRate
}: DashboardOccupancyChartProps): React.ReactElement {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const vacantUnits = Math.max(0, units - occupiedUnits);

  const occupiedColor = "#0063fe";
  const vacantColor = isDark ? "#334155" : "#e2e8f0";
  const legendColor = isDark ? "#cbd5e1" : "#475569";

  const data = useMemo<ChartData<"doughnut">>(
    () => ({
      labels: ["Occupés", "Libres"],
      datasets: [
        {
          data: [occupiedUnits, vacantUnits],
          backgroundColor: [occupiedColor, vacantColor],
          borderWidth: 0,
          hoverOffset: 4
        }
      ]
    }),
    [occupiedUnits, vacantColor, vacantUnits]
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
              const value = context.parsed;
              const suffix = value === 1 ? "logement" : "logements";
              return `${value.toLocaleString("fr-FR")} ${suffix}`;
            }
          }
        }
      }
    }),
    [isDark, legendColor]
  );

  return (
    <section className="h-full rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0d1526]">
      <div>
        <h2 className="text-base font-semibold text-[#010a19] dark:text-white">Occupation</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {units === 0
            ? "Ajoutez des logements pour voir le taux d'occupation."
            : `${occupiedUnits.toLocaleString("fr-FR")} / ${units.toLocaleString("fr-FR")} logements occupés`}
        </p>
      </div>

      {units === 0 ? (
        <p className="mt-8 text-sm text-slate-500 dark:text-slate-400">
          Aucune donnée d&apos;occupation pour le moment.
        </p>
      ) : (
        <>
          <div
            className="relative mx-auto mt-4 h-40 w-40"
            role="img"
            aria-label={`Occupation ${occupancyRate} pour cent, ${occupiedUnits} logements occupés sur ${units}`}
          >
            <Doughnut data={data} options={options} />
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-2xl font-semibold tabular-nums text-[#010a19] dark:text-white">
                {occupancyRate}%
              </p>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Occupé
              </p>
            </div>
          </div>
          <ul className="mt-4 flex justify-center gap-5 text-xs font-medium text-slate-600 dark:text-slate-300">
            <li className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#0063fe]" aria-hidden="true" />
              Occupés · {occupiedUnits.toLocaleString("fr-FR")}
            </li>
            <li className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 rounded-full bg-slate-200 dark:bg-slate-600"
                aria-hidden="true"
              />
              Libres · {vacantUnits.toLocaleString("fr-FR")}
            </li>
          </ul>
        </>
      )}
    </section>
  );
}
