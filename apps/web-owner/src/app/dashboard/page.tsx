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

function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export default async function DashboardPage(): Promise<React.ReactElement> {
  const session = await getOwnerPortalSession();
  if (session === null) {
    return <div className="text-sm text-slate-500">Session owner introuvable.</div>;
  }

  const view = buildOwnerPortfolioView(await loadOwnerPortfolio(session));
  const occupancyRate = view.unitCount === 0 ? 0 : (view.occupiedUnitCount / view.unitCount) * 100;

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
          <p className="text-sm text-slate-500">Biens</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{view.propertyCount}</p>
          <p className="mt-2 text-sm text-slate-600">{view.unitCount} unite(s) suivie(s)</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
          <p className="text-sm text-slate-500">Occupation</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{formatPercent(occupancyRate)}</p>
          <p className="mt-2 text-sm text-slate-600">{view.occupiedUnitCount} unite(s) occupee(s)</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
          <p className="text-sm text-slate-500">Encaisse</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{formatCurrency(view.paidAmount, view.primaryCurrencyCode)}</p>
          <p className="mt-2 text-sm text-slate-600">Paiements marques payes</p>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-slate-50 px-5 py-5">
          <p className="text-sm text-slate-500">A suivre</p>
          <p className="mt-3 text-3xl font-semibold text-slate-950">{formatCurrency(view.pendingAmount + view.overdueAmount, view.primaryCurrencyCode)}</p>
          <p className="mt-2 text-sm text-slate-600">En attente + en retard</p>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-3xl border border-slate-200 bg-white px-5 py-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-950">Performance par bien</h2>
              <p className="mt-1 text-sm text-slate-500">Lecture seule du portefeuille propriétaire</p>
            </div>
          </div>
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-3 font-medium">Bien</th>
                  <th className="pb-3 font-medium">Occupation</th>
                  <th className="pb-3 font-medium">Encaisse</th>
                  <th className="pb-3 font-medium">A suivre</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {view.propertyRows.map((row) => (
                  <tr key={row.property.id}>
                    <td className="py-3">
                      <p className="font-medium text-slate-900">{row.property.name}</p>
                      <p className="text-xs text-slate-500">{row.property.city} • {row.units.length} unite(s)</p>
                    </td>
                    <td className="py-3 text-slate-700">{row.occupiedUnits}/{row.units.length}</td>
                    <td className="py-3 text-slate-700">{formatCurrency(row.paidAmount, view.primaryCurrencyCode)}</td>
                    <td className="py-3 text-slate-700">{formatCurrency(row.pendingAmount, view.primaryCurrencyCode)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white px-5 py-5">
          <h2 className="text-lg font-semibold text-slate-950">Derniers encaissements</h2>
          <div className="mt-5 space-y-3">
            {view.paymentRows.filter((row) => row.payment.status === "paid").slice(0, 5).map((row) => (
              <div key={row.payment.id} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium text-slate-900">{row.propertyName}</p>
                    <p className="mt-1 text-sm text-slate-500">{row.lease?.tenantFullName ?? "Locataire non resolu"}{row.unitNumber ? ` • Unite ${row.unitNumber}` : ""}</p>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">{formatCurrency(row.payment.amount, row.payment.currencyCode)}</p>
                </div>
                <p className="mt-2 text-xs text-slate-500">Paye le {row.payment.paidDate ?? row.payment.dueDate}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}