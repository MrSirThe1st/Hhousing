import { getOwnerPortalSession } from "@/lib/server-session";
import { loadOwnerPortfolio } from "@/lib/owner-portfolio";
import { buildOwnerPortfolioView } from "@/lib/owner-portfolio-view";
import {
  buildOwnerStatementRows,
  buildOwnerStatementSummary,
  type OwnerStatementRow
} from "@/lib/owner-reporting";

function formatCurrency(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0
  }).format(amount);
}

export default async function OwnerReportsPage(): Promise<React.ReactElement> {
  const session = await getOwnerPortalSession();
  if (session === null) {
    return <div className="text-sm text-slate-500">Session owner introuvable.</div>;
  }

  const view = buildOwnerPortfolioView(await loadOwnerPortfolio(session));
  const allStatementRows = buildOwnerStatementRows(view, null);
  const statementSummary = buildOwnerStatementSummary(allStatementRows);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Rapports</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">Synthèse owner</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Vue mensuelle des encaissements et lecture consolidée des indicateurs principaux du portefeuille.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="/api/reports/export"
            className="rounded-full border border-[#0063fe] px-4 py-2 text-sm font-semibold text-[#0063fe] transition hover:bg-[#0063fe] hover:text-white"
          >
            Exporter relevé global (CSV)
          </a>
          {view.monthlyIncomeRows.map((row) => (
            <a
              key={row.period}
              href={`/api/reports/export?period=${row.period}`}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:text-slate-900"
            >
              Export {row.period}
            </a>
          ))}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Biens couverts</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{view.propertyCount}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Baux actifs</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{view.activeLeaseCount}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Encaisse cumulé</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{formatCurrency(view.paidAmount, view.primaryCurrencyCode)}</p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total relevé</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{formatCurrency(statementSummary.totalAmount, view.primaryCurrencyCode)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Payé</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{formatCurrency(statementSummary.paidAmount, view.primaryCurrencyCode)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">En attente</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{formatCurrency(statementSummary.pendingAmount, view.primaryCurrencyCode)}</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">En retard</p>
          <p className="mt-3 text-2xl font-semibold text-slate-950">{formatCurrency(statementSummary.overdueAmount, view.primaryCurrencyCode)}</p>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-slate-950">Historique mensuel</h3>
            <p className="mt-1 text-sm text-slate-500">Basé sur les paiements marqués payés.</p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {view.monthlyIncomeRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 px-5 py-8 text-sm text-slate-500">
              Aucun encaissement payé n'est encore disponible pour générer ce rapport.
            </div>
          ) : (
            view.monthlyIncomeRows.map((row) => (
              <div key={row.period} className="rounded-2xl border border-slate-200 px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-950">{row.label}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">{row.period}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-950">{formatCurrency(row.amount, view.primaryCurrencyCode)}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-lg font-semibold text-slate-950">Relevé détaillé</h3>
          <p className="mt-1 text-sm text-slate-500">Paiements rattachés à votre périmètre owner.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Période</th>
                <th className="px-5 py-4 font-medium">Bien</th>
                <th className="px-5 py-4 font-medium">Locataire</th>
                <th className="px-5 py-4 font-medium">Échéance</th>
                <th className="px-5 py-4 font-medium">Statut</th>
                <th className="px-5 py-4 font-medium">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allStatementRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-sm text-slate-500">
                    Aucun paiement à afficher pour le moment.
                  </td>
                </tr>
              ) : (
                allStatementRows.map((row) => (
                  <tr key={row.paymentId}>
                    <td className="px-5 py-4 text-slate-600">{row.period}</td>
                    <td className="px-5 py-4 text-slate-600">{row.propertyName}{row.unitNumber ? ` · Unité ${row.unitNumber}` : ""}</td>
                    <td className="px-5 py-4 text-slate-600">{row.tenantName}</td>
                    <td className="px-5 py-4 text-slate-600">{new Date(`${row.dueDate}T12:00:00`).toLocaleDateString("fr-FR")}</td>
                    <td className="px-5 py-4 text-slate-600">{formatRowStatus(row)}</td>
                    <td className="px-5 py-4 text-slate-600">{formatCurrency(row.amount, row.currencyCode)}</td>
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

function formatRowStatus(row: OwnerStatementRow): string {
  if (row.status === "paid") {
    return "Payé";
  }
  if (row.status === "overdue") {
    return "En retard";
  }
  if (row.status === "cancelled") {
    return "Annulé";
  }
  return "En attente";
}