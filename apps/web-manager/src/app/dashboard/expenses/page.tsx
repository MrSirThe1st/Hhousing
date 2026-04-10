import Link from "next/link";
import { redirect } from "next/navigation";
import ExpenseDeleteButton from "../../../components/expense-delete-button";
import ExpenseCreateForm from "../../../components/expense-create-form";
import {
  buildExpenseDataset,
  buildFinanceQueryString,
  formatCurrencySummary,
  formatExpenseCategory,
  loadScopedFinanceData,
  normalizeFinanceFilters
} from "../../../lib/finance-reporting";
import FinanceSummaryCards from "../../../components/finance-summary-cards";
import { getServerAuthSession } from "../../../lib/session";

type ExpensesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExpensesPage({ searchParams }: ExpensesPageProps): Promise<React.ReactElement> {
  const session = await getServerAuthSession();
  if (!session) redirect("/login");

  const params = await searchParams;
  const filters = normalizeFinanceFilters(params);
  const { expenses, scopedPortfolio } = await loadScopedFinanceData(session);
  const dataset = buildExpenseDataset(expenses, scopedPortfolio, filters);
  const editExpenseId = typeof params?.editExpenseId === "string" ? params.editExpenseId : null;
  const editingExpense = editExpenseId ? expenses.find((expense) => expense.id === editExpenseId) ?? null : null;
  const baseQuery = buildFinanceQueryString(filters);
  const baseHref = baseQuery.length > 0 ? `/dashboard/expenses?${baseQuery}` : "/dashboard/expenses";

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">Dépenses</h1>
          <p className="mt-2 text-sm text-slate-500">
            Dépenses saisies manuellement, rattachées à une propriété ou au niveau organisation.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-8 border-b border-slate-200 pb-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Dépenses</p>
          <p className="text-xl font-semibold text-slate-900">{formatCurrencySummary(dataset.expenseTotals)}</p>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Lignes</p>
          <p className="text-xl font-semibold text-slate-900">{dataset.recordedExpenseCount.toLocaleString("fr-FR")}</p>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Propriétés</p>
          <p className="text-xl font-semibold text-slate-900">{dataset.propertyExpenses.filter((item) => item.propertyId !== null).length.toLocaleString("fr-FR")}</p>
        </div>

        <div className="h-6 w-px bg-slate-200" />

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">Charges générales</p>
          <p className="text-xl font-semibold text-slate-900">{dataset.propertyExpenses.some((item) => item.propertyId === null) ? "Oui" : "Non"}</p>
        </div>
      </div>

      <form action="/dashboard/expenses" className="flex flex-col gap-4 border-b border-slate-200 pb-4 lg:flex-row lg:items-end">
        <label className="block flex-1 text-sm">
          <span className="mb-1.5 block font-medium text-slate-700">Propriété</span>
          <select name="propertyId" defaultValue={dataset.filters.propertyId ?? ""} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15">
            <option value="">Toutes les propriétés</option>
            {dataset.propertyOptions.map((property) => (
              <option key={property.id} value={property.id}>{property.name}</option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-slate-700">Du</span>
          <input type="date" name="from" defaultValue={dataset.filters.from} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15" />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-slate-700">Au</span>
          <input type="date" name="to" defaultValue={dataset.filters.to} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-[#0063fe] focus:ring-2 focus:ring-[#0063fe]/15" />
        </label>

        <button type="submit" className="rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4]">Appliquer</button>
      </form>

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <ExpenseCreateForm
          organizationId={session.organizationId}
          propertyOptions={dataset.propertyOptions}
          propertyUnitOptions={dataset.propertyUnitOptions}
          expenseId={editingExpense?.id}
          initialValues={editingExpense ? {
            propertyId: editingExpense.propertyId ?? "",
            unitId: editingExpense.unitId ?? "",
            title: editingExpense.title,
            category: editingExpense.category,
            vendorName: editingExpense.vendorName ?? "",
            payeeName: editingExpense.payeeName ?? "",
            amount: editingExpense.amount.toString(),
            currencyCode: editingExpense.currencyCode,
            expenseDate: editingExpense.expenseDate,
            note: editingExpense.note ?? ""
          } : null}
          cancelHref={baseHref}
        />

        <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-[#010a19]">Par propriété</h2>
          <p className="mt-1 text-sm text-gray-500">Vue agrégée des dépenses sur le portefeuille courant.</p>

          {dataset.propertyExpenses.length === 0 ? (
            <p className="mt-5 text-sm text-gray-500">Aucune dépense à afficher pour les filtres actifs.</p>
          ) : (
            <div className="mt-5 space-y-3">
              {dataset.propertyExpenses.map((property) => (
                <div key={property.propertyId ?? "general"} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-[#010a19]">{property.propertyName}</p>
                      <p className="mt-1 text-sm text-gray-500">{property.expenseCount} dépense(s)</p>
                    </div>
                    <p className="text-sm font-semibold text-[#010a19]">{formatCurrencySummary(property.totals)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </article>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-semibold text-[#010a19]">Journal des dépenses</h2>
        <p className="mt-1 text-sm text-gray-500">Chaque dépense reflète une sortie d’argent déjà engagée.</p>

        {dataset.ledger.length === 0 ? (
          <p className="mt-5 text-sm text-gray-500">Aucune dépense enregistrée pour les filtres actifs.</p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="border-b border-gray-100 text-left text-xs uppercase tracking-[0.14em] text-gray-400">
                <tr>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Libellé</th>
                  <th className="pb-3">Propriété</th>
                  <th className="pb-3">Unité</th>
                  <th className="pb-3">Catégorie</th>
                  <th className="pb-3 text-right">Montant</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dataset.ledger.map((entry) => (
                  <tr key={entry.expenseId}>
                    <td className="py-3 text-gray-600">{new Date(entry.expenseDate).toLocaleDateString("fr-FR")}</td>
                    <td className="py-3">
                      <p className="font-medium text-[#010a19]">{entry.title}</p>
                      {entry.vendorName ? <p className="text-xs text-gray-500">Fournisseur: {entry.vendorName}</p> : null}
                      {entry.payeeName ? <p className="text-xs text-gray-500">Payé à: {entry.payeeName}</p> : null}
                      {entry.note ? <p className="text-xs text-gray-500">{entry.note}</p> : null}
                    </td>
                    <td className="py-3 text-gray-600">{entry.propertyName}</td>
                    <td className="py-3 text-gray-600">{entry.unitLabel ?? "Toute la propriété"}</td>
                    <td className="py-3 text-gray-600">{formatExpenseCategory(entry.category)}</td>
                    <td className="py-3 text-right font-semibold text-[#010a19]">{entry.amount.toLocaleString("fr-FR")} {entry.currencyCode}</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/dashboard/expenses?${buildFinanceQueryString(filters, { editExpenseId: entry.expenseId })}`}
                          className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
                        >
                          Modifier
                        </Link>
                        <ExpenseDeleteButton expenseId={entry.expenseId} redirectHref={baseHref} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}