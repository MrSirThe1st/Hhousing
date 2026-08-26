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
  if (status === "paid") return "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  if (status === "overdue") return "bg-rose-50 text-rose-700 ring-1 ring-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900";
  return "bg-amber-50 text-amber-700 ring-1 ring-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900";
}

export default async function OwnerPortalPaymentsPage(): Promise<React.ReactElement> {
  const session = await getOwnerPortalSession();
  if (session === null) {
    return <div className="text-sm text-slate-500">Session owner introuvable.</div>;
  }

  const view = buildOwnerPortfolioView(await loadOwnerPortfolio(session));

  const metrics = [
    { label: "Payé", value: formatCurrency(view.paidAmount, view.primaryCurrencyCode) },
    { label: "En attente", value: formatCurrency(view.pendingAmount, view.primaryCurrencyCode) },
    { label: "En retard", value: formatCurrency(view.overdueAmount, view.primaryCurrencyCode) }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19] dark:text-white">
          Paiements
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Suivi des encaissements rattachés à votre périmètre owner.
        </p>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
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
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-[#0d1526]">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
              <tr>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Bien</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Locataire</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Échéance</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Montant</th>
                <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wide">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {view.paymentRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-8 text-center text-sm text-slate-500">
                    Aucun paiement à afficher pour le moment
                  </td>
                </tr>
              ) : (
                view.paymentRows.map((row) => (
                  <tr key={row.payment.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-5 py-4 align-top">
                      <p className="font-semibold text-[#010a19] dark:text-white">{row.propertyName}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {row.unitNumber ? `Unité ${row.unitNumber}` : "Unité non résolue"}
                      </p>
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {row.lease?.tenantFullName ?? "Locataire non résolu"}
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {new Date(`${row.payment.dueDate}T12:00:00`).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="px-5 py-4 text-slate-600 dark:text-slate-300">
                      {formatCurrency(row.payment.amount, row.payment.currencyCode)}
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${statusClassName(row.payment.status)}`}
                      >
                        {formatStatus(row.payment.status)}
                      </span>
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
