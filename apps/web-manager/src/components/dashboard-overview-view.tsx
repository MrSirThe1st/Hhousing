import Link from "next/link";
import { Suspense } from "react";
import type { MembershipAuthSession } from "@hhousing/api-contracts";
import DashboardOccupancyChart from "./dashboard-occupancy-chart";
import DashboardTrendsSection from "./dashboard-trends-section";
import type { DashboardInitialData, DashboardWatchlistItem } from "../lib/dashboard-overview.types";
import { getNow } from "../lib/time";

type DashboardOverviewViewProps = {
  initial: DashboardInitialData;
  includeReports: boolean;
  financeMonthLabel: string;
  session: MembershipAuthSession;
  selectedCurrency: string;
};

function formatMoney(amount: number, currencyCode: string): string {
  return `${amount.toLocaleString("fr-FR")} ${currencyCode}`;
}

function watchlistMetaClass(kind: DashboardWatchlistItem["kind"]): string {
  if (kind === "overdue") {
    return "text-rose-700 dark:text-rose-300";
  }
  if (kind === "lease") {
    return "text-blue-700 dark:text-blue-300";
  }
  return "text-slate-600 dark:text-slate-300";
}

export function getFinanceMonthLabel(): string {
  return new Intl.DateTimeFormat("fr-FR", {
    month: "long",
    timeZone: "UTC"
  }).format(getNow()).toUpperCase();
}

function ChartSkeleton(): React.ReactElement {
  return (
    <div
      className="h-full min-h-72 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900/50"
      aria-hidden
    />
  );
}

export default function DashboardOverviewView({
  initial,
  includeReports,
  financeMonthLabel,
  session,
  selectedCurrency
}: DashboardOverviewViewProps): React.ReactElement {
  const { attention, finances, portfolio, watchlist } = initial;
  const hasAttentionSignal =
    attention.overdue.count > 0
    || attention.leasesEndingSoon.count > 0;

  return (
    <div className="space-y-6">
      {hasAttentionSignal ? (
        <div className="flex flex-wrap items-center gap-x-8 gap-y-3 border-b border-amber-200 pb-3 dark:border-amber-500/30">
          <div>
            <p className="text-xs uppercase tracking-wide text-amber-800 dark:text-amber-300">À surveiller</p>
            <p className="text-sm font-semibold text-[#010a19] dark:text-white">
              {attention.overdue.count} loyer{attention.overdue.count === 1 ? "" : "s"} en retard
              <span className="ml-2 font-medium text-rose-700 dark:text-rose-300">
                {formatMoney(attention.overdue.amount, attention.overdue.currencyCode)}
              </span>
            </p>
          </div>

          <div className="hidden h-6 w-px bg-amber-200 sm:block dark:bg-amber-500/30" />

          <div>
            <p className="text-xs uppercase tracking-wide text-amber-800 dark:text-amber-300">Échéances</p>
            <p className="text-sm font-semibold text-[#010a19] dark:text-white">
              {attention.leasesEndingSoon.count} dans 30 jours
            </p>
          </div>
        </div>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          Finances — {financeMonthLabel}
        </h2>
        <div className="flex flex-wrap items-center gap-8 border-b border-slate-200 pb-3 dark:border-slate-800">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Reçus</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-white">
              {formatMoney(finances.paid.amount, finances.paid.currencyCode)}
            </p>
          </div>

          <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />

          <div>
            <p className="text-xs uppercase tracking-wide text-rose-600 dark:text-rose-300">En retard</p>
            <p className="text-xl font-semibold text-rose-900 dark:text-rose-200">
              {formatMoney(finances.overdue.amount, finances.overdue.currencyCode)}
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="min-h-72 lg:col-span-2">
          <Suspense fallback={<ChartSkeleton />}>
            <DashboardTrendsSection session={session} selectedCurrency={selectedCurrency} />
          </Suspense>
        </div>
        <DashboardOccupancyChart
          occupiedUnits={portfolio.occupiedUnits}
          units={portfolio.units}
          occupancyRate={portfolio.occupancyRate}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          Mes biens
        </h2>
        <div className="flex flex-wrap items-end gap-x-8 gap-y-4 border-b border-slate-200 pb-3 dark:border-slate-800">
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Biens</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-white">{portfolio.properties}</p>
          </div>

          <div className="hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-700" />

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Logements</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-white">{portfolio.units}</p>
          </div>

          <div className="hidden h-6 w-px bg-slate-200 sm:block dark:bg-slate-700" />

          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Locataires</p>
            <p className="text-xl font-semibold text-slate-900 dark:text-white">{portfolio.tenants}</p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            Activité nécessitant votre attention
          </h2>
          <Link href="/dashboard/payments" className="text-xs font-semibold text-[#0063fe] hover:underline">
            Voir tout →
          </Link>
        </div>

        {watchlist.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Rien d&apos;urgent pour le moment.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-800 dark:bg-[#0d1526]">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                  <tr>
                    <th className="px-5 py-3 text-left">Élément</th>
                    <th className="px-5 py-3 text-left">Détail</th>
                    <th className="px-5 py-3 text-right">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {watchlist.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="px-5 py-4 align-middle">
                        <Link href={item.href} className="font-semibold text-[#010a19] hover:text-[#0063fe] dark:text-white">
                          {item.title}
                        </Link>
                      </td>
                      <td className="px-5 py-4 align-middle text-slate-500 dark:text-slate-400">{item.detail}</td>
                      <td className={`px-5 py-4 align-middle text-right font-semibold ${watchlistMetaClass(item.kind)}`}>
                        {item.meta}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {includeReports ? (
        <section className="flex flex-wrap gap-x-6 gap-y-2 border-t border-slate-200 pt-4 dark:border-slate-800">
          <Link href="/dashboard/revenues" className="text-sm font-medium text-[#010a19] hover:text-[#0063fe] dark:text-white">
            Revenus →
          </Link>
          <Link href="/dashboard/payments" className="text-sm font-medium text-[#010a19] hover:text-[#0063fe] dark:text-white">
            Paiements →
          </Link>
        </section>
      ) : null}
    </div>
  );
}
