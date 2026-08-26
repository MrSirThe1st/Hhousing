import { getOwnerPortalSession } from "@/lib/owner-portal/server-session";
import { loadOwnerPortfolio } from "@/lib/owner-portal/owner-portfolio";
import { buildOwnerPortfolioView } from "@/lib/owner-portal/owner-portfolio-view";
import {
  buildOwnerStatementRows,
  buildOwnerStatementSummary,
  type OwnerStatementRow
} from "@/lib/owner-portal/owner-reporting";
import { redirectIfV1FeatureDeferred } from "@/lib/v1-deferred-feature-guard";

function formatCurrency(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0
  }).format(amount);
}

function formatRowStatus(row: OwnerStatementRow): string {
  if (row.status === "paid") return "Payé";
  if (row.status === "overdue") return "En retard";
  if (row.status === "cancelled") return "Annulé";
  return "En attente";
}

export default async function OwnerPortalReportsPage(): Promise<React.ReactElement> {
  redirectIfV1FeatureDeferred("reports", "/owner-portal/dashboard");

  const session = await getOwnerPortalSession();
  if (session === null) {
    return <div className="text-sm text-slate-500">Session owner introuvable.</div>;
  }

  const view = buildOwnerPortfolioView(await loadOwnerPortfolio(session));
  const allStatementRows = buildOwnerStatementRows(view, null);
  const statementSummary = buildOwnerStatementSummary(allStatementRows);

  const topMetrics = [
    { label: "Biens couverts", value: String(view.propertyCount) },
    { label: "Baux actifs", value: String(view.activeLeaseCount) },
    {
      label: "Encaisse cumulé",
      value: formatCurrency(view.paidAmount, view.primaryCurrencyCode)
    }
  ];

  const statementMetrics = [
    {
      label: "Total relevé",
      value: formatCurrency(statementSummary.totalAmount, view.primaryCurrencyCode)
    },
    {
      label: "Payé",
      value: formatCurrency(statementSummary.paidAmount, view.primaryCurrencyCode)
    },
    {
      label: "En attente",
      value: formatCurrency(statementSummary.pendingAmount, view.primaryCurrencyCode)
    },
    {
      label: "En retard",
      value: formatCurrency(statementSummary.overdueAmount, view.primaryCurrencyCode)
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19] dark:text-white">
            Rapports
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
            Vue mensuelle des encaissements et lecture consolidée des indicateurs du portefeuille.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/owner-portal/reports/export"
            className="rounded-lg bg-[#0063fe] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
          >
            Exporter relevé global (CSV)
          </a>
          {view.monthlyIncomeRows.map((row) => (
            <a
              key={row.period}
              href={`/api/owner-portal/reports/export?period=${row.period}`}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800/60"
            >
              Export {row.period}
            </a>
          ))}
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        {topMetrics.map((metric) => (
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
          </div>
        ))}
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        {statementMetrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-xl border border-slate-200 bg-white px-5 py-5 dark:border-slate-800 dark:bg-[#0d1526]"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {metric.label}
            </p>
            <p className="mt-2 text-xl font-semibold tracking-[-0.02em] text-[#010a19] dark:text-white">
              {metric.value}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-[#0d1526]">
        <h2 className="text-lg font-semibold text-[#010a19] dark:text-white">Historique mensuel</h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Basé sur les paiements marqués payés.
        </p>

        <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
          {view.monthlyIncomeRows.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 px-6 py-8 text-center dark:border-slate-700">
              <p className="text-sm text-slate-500">
                Aucun encaissement payé n&apos;est encore disponible pour générer ce rapport
              </p>
            </div>
          ) : (
            view.monthlyIncomeRows.map((row) => (
              <div
                key={row.period}
                className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-semibold text-[#010a19] dark:text-white">{row.label}</p>
                  <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                    {row.period}
                  </p>
                </div>
                <p className="text-sm font-semibold text-[#010a19] dark:text-white">
                  {formatCurrency(row.amount, view.primaryCurrencyCode)}
                </p>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0d1526]">
        <div className="border-b border-slate-200 px-6 py-5 dark:border-slate-800">
          <h2 className="text-lg font-semibold text-[#010a19] dark:text-white">Relevé détaillé</h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Paiements rattachés à votre périmètre owner.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Période</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Bien</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Locataire</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Échéance</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Statut</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {allStatementRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-500">
                    Aucun paiement à afficher pour le moment
                  </td>
                </tr>
              ) : (
                allStatementRows.map((row) => (
                  <tr key={row.paymentId} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{row.period}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {row.propertyName}
                      {row.unitNumber ? ` · Logement ${row.unitNumber}` : ""}
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{row.tenantName}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {new Date(`${row.dueDate}T12:00:00`).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {formatRowStatus(row)}
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {formatCurrency(row.amount, row.currencyCode)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
