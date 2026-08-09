import Link from "next/link";
import { Suspense } from "react";
import type { MembershipAuthSession } from "@hhousing/api-contracts";
import DashboardOccupancyBar from "./dashboard-occupancy-bar";
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
      className="h-55 animate-pulse rounded-2xl border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900/50"
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
    <div className="space-y-8">
      {hasAttentionSignal ? (
        <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10">
          <div className="flex items-center gap-2">
            <span className="text-amber-700 dark:text-amber-300" aria-hidden>
              ⚠
            </span>
            <h2 className="text-sm font-semibold uppercase tracking-wide text-amber-900 dark:text-amber-200">
              À surveiller
            </h2>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-[#010a19] dark:text-white">
                {attention.overdue.count} loyer{attention.overdue.count === 1 ? "" : "s"} en retard
              </p>
              <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">
                {formatMoney(attention.overdue.amount, attention.overdue.currencyCode)}
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-[#010a19] dark:text-white">
                {attention.leasesEndingSoon.count} échéance{attention.leasesEndingSoon.count === 1 ? "" : "s"}
              </p>
              <p className="mt-1 text-sm text-blue-800 dark:text-blue-300">dans 30 jours</p>
            </div>
          </div>
        </section>
      ) : null}

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          Finances — {financeMonthLabel}
        </h2>
        <div className="grid gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-sm dark:border-slate-800 dark:bg-slate-800 sm:grid-cols-2">
          <div className="bg-white px-4 py-4 dark:bg-[#0d1526]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Reçus</p>
            <p className="mt-1 text-xl font-semibold tracking-[-0.02em] text-[#010a19] dark:text-white">
              {formatMoney(finances.paid.amount, finances.paid.currencyCode)}
            </p>
          </div>
          <div className="bg-white px-4 py-4 dark:bg-[#0d1526]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-300">En retard</p>
            <p className="mt-1 text-xl font-semibold tracking-[-0.02em] text-rose-900 dark:text-rose-200">
              {formatMoney(finances.overdue.amount, finances.overdue.currencyCode)}
            </p>
          </div>
        </div>
      </section>

      <Suspense fallback={<ChartSkeleton />}>
        <DashboardTrendsSection session={session} selectedCurrency={selectedCurrency} />
      </Suspense>

      <section className="space-y-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
          Mes biens
        </h2>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0d1526]">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div>
              <p className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19] dark:text-white">
                {portfolio.properties}
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Biens</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19] dark:text-white">
                {portfolio.units}
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Logements</p>
            </div>
            <div>
              <p className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19] dark:text-white">
                {portfolio.tenants}
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Locataires</p>
            </div>
            <DashboardOccupancyBar
              occupiedUnits={portfolio.occupiedUnits}
              units={portfolio.units}
              occupancyRate={portfolio.occupancyRate}
            />
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
          <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            Rien d&apos;urgent pour le moment.
          </div>
        ) : (
          <ul className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0d1526]">
            {watchlist.map((item) => (
              <li key={item.id} className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
                <Link
                  href={item.href}
                  className="flex items-start justify-between gap-4 px-4 py-3.5 transition hover:bg-slate-50 dark:hover:bg-slate-900/40"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#010a19] dark:text-white">{item.title}</p>
                    <p className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">{item.detail}</p>
                  </div>
                  <p className={`shrink-0 text-sm font-semibold ${watchlistMetaClass(item.kind)}`}>{item.meta}</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {includeReports ? (
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
            Accès rapide
          </h2>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/dashboard/revenues" className="text-sm font-medium text-[#010a19] hover:text-[#0063fe] dark:text-white">
              Revenus →
            </Link>
            <Link href="/dashboard/payments" className="text-sm font-medium text-[#010a19] hover:text-[#0063fe] dark:text-white">
              Paiements →
            </Link>
          </div>
        </section>
      ) : null}
    </div>
  );
}
