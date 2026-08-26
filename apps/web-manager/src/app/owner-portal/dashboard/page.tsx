import { getOwnerPortalSession } from "@/lib/owner-portal/server-session";
import { loadOwnerPortfolio } from "@/lib/owner-portal/owner-portfolio";
import { buildOwnerPortfolioView } from "@/lib/owner-portal/owner-portfolio-view";
import OwnerPortalOverviewCharts from "@/components/owner-portal/overview-charts";
import Link from "next/link";

function formatCurrency(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0
  }).format(amount);
}

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export default async function OwnerPortalDashboardPage(): Promise<React.ReactElement> {
  const session = await getOwnerPortalSession();
  if (session === null) {
    return <div className="text-sm text-slate-500">Session owner introuvable.</div>;
  }

  const view = buildOwnerPortfolioView(await loadOwnerPortfolio(session));
  const occupancyRate =
    view.unitCount === 0 ? 0 : Math.round((view.occupiedUnitCount / view.unitCount) * 100);
  const paidRows = view.paymentRows.filter((row) => row.payment.status === "paid");
  const propertyIncome = [...view.propertyRows]
    .map((row) => ({ name: row.property.name, amount: row.paidAmount }))
    .sort((left, right) => right.amount - left.amount);

  const metrics = [
    {
      label: "Biens",
      value: String(view.propertyCount),
      hint: `${view.unitCount} unité(s) suivie(s)`
    },
    {
      label: "Occupation",
      value: formatPercent(occupancyRate),
      hint: `${view.occupiedUnitCount} unité(s) occupée(s)`
    },
    {
      label: "Encaisse",
      value: formatCurrency(view.paidAmount, view.primaryCurrencyCode),
      hint: "Paiements marqués payés"
    },
    {
      label: "À suivre",
      value: formatCurrency(view.pendingAmount + view.overdueAmount, view.primaryCurrencyCode),
      hint: "En attente + en retard"
    }
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19] dark:text-white">
          Vue générale
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Synthèse de votre portefeuille owner.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-slate-200 bg-white px-5 py-5 dark:border-slate-800 dark:bg-[#0d1526]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {metric.label}
            </p>
            <p className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-[#010a19] dark:text-white">
              {metric.value}
            </p>
            <p className="mt-1.5 text-sm text-slate-600 dark:text-slate-400">{metric.hint}</p>
          </div>
        ))}
      </section>

      <OwnerPortalOverviewCharts
        occupiedUnits={view.occupiedUnitCount}
        units={view.unitCount}
        occupancyRate={occupancyRate}
        currencyCode={view.primaryCurrencyCode}
        paidAmount={view.paidAmount}
        pendingAmount={view.pendingAmount}
        overdueAmount={view.overdueAmount}
        monthlyIncome={view.monthlyIncomeRows}
        propertyIncome={propertyIncome}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0d1526]">
        <h2 className="text-lg font-semibold text-[#010a19] dark:text-white">Accès rapide</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Chaque bloc ouvre une page dédiée du portail.
        </p>

        <div className="mt-5 grid gap-3 md:grid-cols-3">
          <Link
            href="/owner-portal/dashboard/properties"
            className="rounded-lg border border-slate-200 px-4 py-4 transition hover:border-[#0063fe]/40 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60"
          >
            <p className="text-sm font-semibold text-[#010a19] dark:text-white">Biens</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Voir l&apos;occupation et la performance par bien.
            </p>
          </Link>
          <Link
            href="/owner-portal/dashboard/payments"
            className="rounded-lg border border-slate-200 px-4 py-4 transition hover:border-[#0063fe]/40 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60"
          >
            <p className="text-sm font-semibold text-[#010a19] dark:text-white">Paiements</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Consulter les paiements payés, en attente et en retard.
            </p>
          </Link>
          <Link
            href="/owner-portal/dashboard/reports"
            className="rounded-lg border border-slate-200 px-4 py-4 transition hover:border-[#0063fe]/40 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800/60"
          >
            <p className="text-sm font-semibold text-[#010a19] dark:text-white">Rapports</p>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
              Explorer les relevés et exporter vos données CSV.
            </p>
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0d1526]">
        <h2 className="text-lg font-semibold text-[#010a19] dark:text-white">Derniers encaissements</h2>
        <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
          {paidRows.slice(0, 5).map((row) => (
            <div
              key={row.payment.id}
              className="flex items-start justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
            >
              <div className="min-w-0">
                <p className="font-semibold text-[#010a19] dark:text-white">{row.propertyName}</p>
                <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
                  {row.lease?.tenantFullName ?? "Locataire non résolu"}
                  {row.unitNumber ? ` • Unité ${row.unitNumber}` : ""}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Payé le {row.payment.paidDate ?? row.payment.dueDate}
                </p>
              </div>
              <p className="shrink-0 text-sm font-semibold text-[#010a19] dark:text-white">
                {formatCurrency(row.payment.amount, row.payment.currencyCode)}
              </p>
            </div>
          ))}

          {paidRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 px-6 py-8 text-center dark:border-slate-700">
              <p className="text-sm text-slate-500">Aucun paiement payé pour le moment</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
