import { getOwnerPortalSession } from "@/lib/server-session";
import { loadOwnerPortfolio } from "@/lib/owner-portfolio";
import { buildOwnerPortfolioView } from "@/lib/owner-portfolio-view";

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

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Rapports</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">Synthèse owner</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          Vue mensuelle des encaissements et lecture consolidée des indicateurs principaux du portefeuille.
        </p>
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
    </div>
  );
}