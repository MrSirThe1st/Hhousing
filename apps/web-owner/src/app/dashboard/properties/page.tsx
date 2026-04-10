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

export default async function OwnerPropertiesPage(): Promise<React.ReactElement> {
  const session = await getOwnerPortalSession();
  if (session === null) {
    return <div className="text-sm text-slate-500">Session owner introuvable.</div>;
  }

  const view = buildOwnerPortfolioView(await loadOwnerPortfolio(session));

  return (
    <div className="space-y-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Biens</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Portefeuille immobilier</h2>
            <p className="mt-2 max-w-3xl text-sm text-slate-600">
              Lecture consolidée par bien, avec occupation, baux actifs et encaissements liés à votre portefeuille owner.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {view.propertyCount} bien(s) • {view.unitCount} unité(s) • {view.activeLeaseCount} bail/baux actif(s)
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 font-medium">Bien</th>
                <th className="px-5 py-4 font-medium">Adresse</th>
                <th className="px-5 py-4 font-medium">Unités</th>
                <th className="px-5 py-4 font-medium">Baux actifs</th>
                <th className="px-5 py-4 font-medium">Encaisse</th>
                <th className="px-5 py-4 font-medium">À suivre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {view.propertyRows.map((row) => (
                <tr key={row.property.id}>
                  <td className="px-5 py-4 align-top">
                    <p className="font-medium text-slate-950">{row.property.name}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.property.managementContext === "managed" ? "Parc géré" : "Parc owné"}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{row.property.address}, {row.property.city}</td>
                  <td className="px-5 py-4 text-slate-600">{row.occupiedUnits}/{row.units.length} occupée(s)</td>
                  <td className="px-5 py-4 text-slate-600">{row.activeLeases}</td>
                  <td className="px-5 py-4 text-slate-600">{formatCurrency(row.paidAmount, view.primaryCurrencyCode)}</td>
                  <td className="px-5 py-4 text-slate-600">{formatCurrency(row.pendingAmount, view.primaryCurrencyCode)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}