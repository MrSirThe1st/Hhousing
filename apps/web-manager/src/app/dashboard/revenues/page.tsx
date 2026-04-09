import { redirect } from "next/navigation";
import type { PaymentKind } from "@hhousing/domain";
import FinanceFilterForm from "../../../components/finance-filter-form";
import FinanceMonthlyChart from "../../../components/finance-monthly-chart";
import FinanceSummaryCards from "../../../components/finance-summary-cards";
import {
  buildRevenueDataset,
  formatCurrencySummary,
  loadScopedPayments,
  normalizeFinanceFilters
} from "../../../lib/finance-reporting";
import { getServerAuthSession } from "../../../lib/session";

type RevenuesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function formatPaymentKind(paymentKind: PaymentKind): string {
  switch (paymentKind) {
    case "rent":
      return "Loyer";
    case "deposit":
      return "Dépôt";
    case "prorated_rent":
      return "Prorata";
    case "fee":
      return "Frais";
    case "other":
      return "Autre";
    default:
      return paymentKind;
  }
}

export default async function RevenuesPage({ searchParams }: RevenuesPageProps): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const filters = normalizeFinanceFilters(params);
  const { payments, scopedPortfolio } = await loadScopedPayments(session);
  const dataset = buildRevenueDataset(payments, scopedPortfolio, filters);

  return (
    <div className="space-y-6 p-8">
      <section className="rounded-[28px] border border-gray-200 bg-[radial-gradient(circle_at_top_left,rgba(0,99,254,0.10),transparent_32%),linear-gradient(180deg,#ffffff_0%,#f4f8ff_100%)] p-6 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#0063fe]">Finance · Revenus</p>
        <h1 className="mt-2 text-3xl font-semibold text-[#010a19]">Revenus</h1>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-gray-600">
          Cette vue transforme les paiements déjà marqués comme payés en revenus comptabilisés. Elle reflète le loyer,
          les frais et autres encaissements rattachés aux baux dans votre portefeuille courant.
        </p>
      </section>

      <FinanceFilterForm actionPath="/dashboard/revenues" filters={dataset.filters} propertyOptions={dataset.propertyOptions} />

      <FinanceSummaryCards
        items={[
          {
            label: "Revenu encaissé",
            value: formatCurrencySummary(dataset.revenueTotals),
            hint: `Du ${dataset.filters.from} au ${dataset.filters.to}`
          },
          {
            label: "Encaissements",
            value: dataset.recordedPaymentCount.toLocaleString("fr-FR"),
            hint: "Paiements effectivement comptabilisés comme payés"
          },
          {
            label: "Propriétés actives",
            value: dataset.propertyRevenue.length.toLocaleString("fr-FR"),
            hint: "Au moins un revenu enregistré sur la période"
          },
          {
            label: "Filtre portefeuille",
            value: dataset.filters.propertyId ? "1 propriété" : "Tout le portefeuille",
            hint: "Basé sur la portée opérateur courante"
          }
        ]}
      />

      <FinanceMonthlyChart
        buckets={dataset.monthlyRevenue}
        emptyLabel="Aucun revenu encaissé sur cette période."
      />

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#010a19]">Par propriété</h2>
          <p className="mt-1 text-sm text-gray-500">Vue portefeuille des revenus déjà encaissés.</p>

          {dataset.propertyRevenue.length === 0 ? (
            <p className="mt-5 text-sm text-gray-500">Aucun revenu à afficher pour les filtres actifs.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {dataset.propertyRevenue.map((property) => (
                <div key={property.propertyId} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-[#010a19]">{property.propertyName}</p>
                      <p className="mt-1 text-sm text-gray-500">{property.paymentCount} encaissement(s)</p>
                    </div>
                    <p className="text-sm font-semibold text-[#010a19]">{formatCurrencySummary(property.totals)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>

        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#010a19]">Grand livre des revenus</h2>
          <p className="mt-1 text-sm text-gray-500">Un paiement payé devient un revenu ici. Rien n’est stocké en plus.</p>

          {dataset.ledger.length === 0 ? (
            <p className="mt-5 text-sm text-gray-500">Aucun revenu enregistré pour les filtres actifs.</p>
          ) : (
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="border-b border-gray-100 text-left text-xs uppercase tracking-[0.14em] text-gray-400">
                  <tr>
                    <th className="pb-3">Payé le</th>
                    <th className="pb-3">Propriété</th>
                    <th className="pb-3">Locataire</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3 text-right">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {dataset.ledger.map((entry) => (
                    <tr key={entry.paymentId}>
                      <td className="py-3 text-gray-600">{new Date(entry.paidDate).toLocaleDateString("fr-FR")}</td>
                      <td className="py-3">
                        <p className="font-medium text-[#010a19]">{entry.propertyName}</p>
                        <p className="text-xs text-gray-500">Unité {entry.unitNumber}</p>
                      </td>
                      <td className="py-3 text-gray-600">{entry.tenantName}</td>
                      <td className="py-3 text-gray-600">{formatPaymentKind(entry.paymentKind)}</td>
                      <td className="py-3 text-right font-semibold text-[#010a19]">
                        {entry.amount.toLocaleString("fr-FR")} {entry.currencyCode}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}