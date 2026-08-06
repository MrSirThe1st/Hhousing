import ExpenseCreateForm from "../../../components/expense-create-form";
import ExpensesLedgerTable from "../../../components/expenses-ledger-table";
import {
  buildExpenseDataset,
  buildFinanceQueryString,
  formatCurrencySummary,
  loadScopedFinanceData,
  normalizeFinanceFilters
} from "../../../lib/finance-reporting";
import ReadOnlyBanner from "../../../components/read-only-banner";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";

type ExpensesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExpensesPage({ searchParams }: ExpensesPageProps): Promise<React.ReactElement> {
  const { session, access } = await requireDashboardSectionAccess("finances");

  const params = await searchParams;
  const filters = normalizeFinanceFilters(params);
  const { expenses, scopedPortfolio } = await loadScopedFinanceData(session);
  const dataset = buildExpenseDataset(expenses, scopedPortfolio, filters);
  const editExpenseId = typeof params?.editExpenseId === "string" ? params.editExpenseId : null;
  const editingExpense = editExpenseId ? expenses.find((expense) => expense.id === editExpenseId) ?? null : null;
  const baseQuery = buildFinanceQueryString(filters);
  const baseHref = baseQuery.length > 0 ? `/dashboard/expenses?${baseQuery}` : "/dashboard/expenses";

  return (
    <>
      {!access.financesWritable && <ReadOnlyBanner />}
      <div id="expenses-container" className="space-y-6 p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">Dépenses</h1>
          <p className="mt-2 text-sm text-slate-500">
            Dépenses saisies manuellement, rattachées à une propriété ou au niveau organisation.
          </p>
        </div>
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
          displayMode="modal"
        />
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

      <section>
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
          <ExpensesLedgerTable
            entries={dataset.ledger.map((entry) => ({
              ...entry,
              editHref: `/dashboard/expenses?${buildFinanceQueryString(filters, { editExpenseId: entry.expenseId })}`
            }))}
            redirectHref={baseHref}
          />
        )}
      </section>
    </div>
    </>
  );
}