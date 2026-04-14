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

function formatStatus(status: string): string {
  if (status === "paid") return "Payé";
  if (status === "pending") return "En attente";
  if (status === "overdue") return "En retard";
  return status;
}

function statusClassName(status: string): string {
  if (status === "paid") return "bg-emerald-100 text-emerald-700";
  if (status === "overdue") return "bg-rose-100 text-rose-700";
  return "bg-amber-100 text-amber-700";
}

export default async function OwnerPortalPaymentsPage(): Promise<React.ReactElement> {
  const session = await getOwnerPortalSession();
  if (session === null) {
    return <div className="text-sm text-slate-500">Session owner introuvable.</div>;
  }

  const view = buildOwnerPortfolioView(await loadOwnerPortfolio(session));

  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payé</p>
          <p className="mt-2.5 text-3xl font-semibold tracking-[-0.02em] text-[#010a19]">{formatCurrency(view.paidAmount, view.primaryCurrencyCode)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">En attente</p>
          <p className="mt-2.5 text-3xl font-semibold tracking-[-0.02em] text-[#010a19]">{formatCurrency(view.pendingAmount, view.primaryCurrencyCode)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">En retard</p>
          <p className="mt-2.5 text-3xl font-semibold tracking-[-0.02em] text-[#010a19]">{formatCurrency(view.overdueAmount, view.primaryCurrencyCode)}</p>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide">Bien</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide">Locataire</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide">Échéance</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide">Montant</th>
                <th className="px-5 py-4 text-xs font-semibold uppercase tracking-wide">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {view.paymentRows.map((row) => (
                <tr key={row.payment.id} className="transition hover:bg-slate-50">
                  <td className="px-5 py-4 align-top">
                    <p className="font-semibold text-[#010a19]">{row.propertyName}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.unitNumber ? `Unité ${row.unitNumber}` : "Unité non résolue"}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600">{row.lease?.tenantFullName ?? "Locataire non résolu"}</td>
                  <td className="px-5 py-4 text-slate-600">{new Date(`${row.payment.dueDate}T12:00:00`).toLocaleDateString("fr-FR")}</td>
                  <td className="px-5 py-4 text-slate-600">{formatCurrency(row.payment.amount, row.payment.currencyCode)}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${statusClassName(row.payment.status)}`}>
                      {formatStatus(row.payment.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
