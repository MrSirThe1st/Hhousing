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
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Biens</p>
          <p className="mt-2.5 text-3xl font-semibold tracking-[-0.02em] text-[#010a19]">{view.propertyCount}</p>
          <p className="mt-2 text-sm text-slate-600">{view.unitCount} unité(s) suivie(s)</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Occupation</p>
          <p className="mt-2.5 text-3xl font-semibold tracking-[-0.02em] text-[#010a19]">{formatPercent(occupancyRate)}</p>
          <p className="mt-2 text-sm text-slate-600">{view.occupiedUnitCount} unité(s) occupée(s)</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Encaisse</p>
          <p className="mt-2.5 text-3xl font-semibold tracking-[-0.02em] text-[#010a19]">{formatCurrency(view.paidAmount, view.primaryCurrencyCode)}</p>
          <p className="mt-2 text-sm text-slate-600">Paiements marqués payés</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">À suivre</p>
          <p className="mt-2.5 text-3xl font-semibold tracking-[-0.02em] text-[#010a19]">{formatCurrency(view.pendingAmount + view.overdueAmount, view.primaryCurrencyCode)}</p>
          <p className="mt-2 text-sm text-slate-600">En attente + en retard</p>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#010a19]">Accès rapide</h2>
        <p className="mt-1 text-sm text-slate-500">Chaque bloc ouvre une page dédiée du portail.</p>

        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <Link
            href="/owner-portal/dashboard/properties"
            className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-[#0063fe] hover:shadow-sm"
          >
            <p className="text-sm font-semibold text-[#010a19]">Biens</p>
            <p className="mt-1 text-sm text-slate-600">Voir l'occupation et la performance par bien.</p>
          </Link>
          <Link
            href="/owner-portal/dashboard/payments"
            className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-[#0063fe] hover:shadow-sm"
          >
            <p className="text-sm font-semibold text-[#010a19]">Paiements</p>
            <p className="mt-1 text-sm text-slate-600">Consulter les paiements payés, en attente et en retard.</p>
          </Link>
          <Link
            href="/owner-portal/dashboard/reports"
            className="rounded-lg border border-slate-200 bg-slate-50 p-4 transition hover:border-[#0063fe] hover:shadow-sm"
          >
            <p className="text-sm font-semibold text-[#010a19]">Rapports</p>
            <p className="mt-1 text-sm text-slate-600">Explorer les relevés et exporter vos données CSV.</p>
          </Link>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-[#010a19]">Derniers encaissements</h2>
        <div className="mt-5 space-y-3">
          {view.paymentRows.filter((row) => row.payment.status === "paid").slice(0, 5).map((row) => (
            <div key={row.payment.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-[#010a19]">{row.propertyName}</p>
                  <p className="mt-1 text-sm text-slate-600">{row.lease?.tenantFullName ?? "Locataire non résolu"}{row.unitNumber ? ` • Unité ${row.unitNumber}` : ""}</p>
                </div>
                <p className="text-sm font-semibold text-[#010a19]">{formatCurrency(row.payment.amount, row.payment.currencyCode)}</p>
              </div>
              <p className="mt-2 text-xs text-slate-500">Payé le {row.payment.paidDate ?? row.payment.dueDate}</p>
            </div>
          ))}

          {view.paymentRows.filter((row) => row.payment.status === "paid").length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 px-6 py-8 text-center">
              <p className="text-sm text-slate-500">Aucun paiement payé pour le moment</p>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
