import { getOwnerPortalSession } from "@/lib/owner-portal/server-session";
import { loadOwnerPortfolio } from "@/lib/owner-portal/owner-portfolio";
import { buildOwnerPortfolioView } from "@/lib/owner-portal/owner-portfolio-view";

function formatCurrency(amount: number, currencyCode: string): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: currencyCode,
    maximumFractionDigits: 0
  }).format(amount);
}

export default async function OwnerPortalPropertiesPage(): Promise<React.ReactElement> {
  const session = await getOwnerPortalSession();
  if (session === null) {
    return <div className="text-sm text-slate-500">Session owner introuvable.</div>;
  }

  const view = buildOwnerPortfolioView(await loadOwnerPortfolio(session));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19] dark:text-white">
            Mes biens
          </h1>
          <p className="mt-1 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
            Lecture consolidée par bien, avec occupation, baux actifs et encaissements liés à votre
            portefeuille owner.
          </p>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {view.propertyCount} bien(s) • {view.unitCount} unité(s) • {view.activeLeaseCount}{" "}
          bail/baux actif(s)
        </p>
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0d1526]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Bien</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Adresse</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Logements</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Baux actifs</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Encaisse</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">À suivre</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {view.propertyRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-sm text-slate-500">
                    Aucun bien dans votre périmètre pour le moment
                  </td>
                </tr>
              ) : (
                view.propertyRows.map((row) => (
                  <tr key={row.property.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-4 align-top">
                      <p className="font-semibold text-[#010a19] dark:text-white">{row.property.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.property.managementContext === "managed" ? "Parc géré" : "Parc propriétaire"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {row.property.address}, {row.property.city}
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {row.occupiedUnits}/{row.units.length} occupée(s)
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">{row.activeLeases}</td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {formatCurrency(row.paidAmount, view.primaryCurrencyCode)}
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {formatCurrency(row.pendingAmount, view.primaryCurrencyCode)}
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
