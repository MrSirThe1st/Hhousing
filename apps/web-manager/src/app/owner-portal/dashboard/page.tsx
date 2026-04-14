import { getOwnerPortalSession } from "@/lib/owner-portal/server-session";
import { loadOwnerPortfolio } from "@/lib/owner-portal/owner-portfolio";
import { buildOwnerPortfolioView } from "@/lib/owner-portal/owner-portfolio-view";
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

      <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5">
        <h2 className="text-lg font-semibold text-slate-950">Acces rapide</h2>
        <p className="mt-1 text-sm text-slate-500">Chaque bloc ouvre une page dediee du portail.</p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Link
            href="/owner-portal/dashboard/properties"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-[#0063fe] hover:bg-white"
          >
            <p className="text-sm font-semibold text-slate-900">Biens</p>
            <p className="mt-1 text-sm text-slate-600">Voir l'occupation et la performance par bien.</p>
          </Link>
          <Link
            href="/owner-portal/dashboard/payments"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-[#0063fe] hover:bg-white"
          >
            <p className="text-sm font-semibold text-slate-900">Paiements</p>
            <p className="mt-1 text-sm text-slate-600">Consulter les paiements payes, en attente et en retard.</p>
          </Link>
          <Link
            href="/owner-portal/dashboard/reports"
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 transition hover:border-[#0063fe] hover:bg-white"
          >
            <p className="text-sm font-semibold text-slate-900">Rapports</p>
            <p className="mt-1 text-sm text-slate-600">Explorer les releves et exporter vos donnees CSV.</p>
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white px-5 py-5">
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

          {view.paymentRows.filter((row) => row.payment.status === "paid").length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 px-4 py-6 text-sm text-slate-500">
              Aucun paiement paye pour le moment.
            </p>
          ) : null}
        </div>
      </section>
    </div>
  );
}
