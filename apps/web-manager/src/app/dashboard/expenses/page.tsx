import ExpenseCreateForm from "../../../components/expense-create-form";
import ExpensesLedgerTable from "../../../components/expenses-ledger-table";
import FinanceFilterForm from "../../../components/finance-filter-form";
import {
  buildFinanceQueryString,
  formatCurrencySummary
} from "../../../lib/finance-reporting";
import { loadExpensesPageData } from "../../../lib/expenses-page-data";
import ReadOnlyBanner from "../../../components/read-only-banner";
import { requireDashboardSectionAccess } from "../../../lib/dashboard-access";

type ExpensesPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ExpensesPage({ searchParams }: ExpensesPageProps): Promise<React.ReactElement> {
  const { session, access } = await requireDashboardSectionAccess("finances");

  const params = await searchParams;
  const dataset = await loadExpensesPageData(session, params);
  const baseQuery = buildFinanceQueryString(dataset.filters);
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
          expenseId={dataset.editingExpense?.expenseId}
          initialValues={dataset.editingExpense ? {
            propertyId: dataset.editingExpense.propertyId ?? "",
            unitId: dataset.editingExpense.unitId ?? "",
            title: dataset.editingExpense.title,
            category: dataset.editingExpense.category,
            vendorName: dataset.editingExpense.vendorName ?? "",
            payeeName: dataset.editingExpense.payeeName ?? "",
            amount: dataset.editingExpense.amount.toString(),
            currencyCode: dataset.editingExpense.currencyCode,
            expenseDate: dataset.editingExpense.expenseDate,
            note: dataset.editingExpense.note ?? ""
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

      <FinanceFilterForm
        actionPath="/dashboard/expenses"
        filters={dataset.filters}
        propertyOptions={dataset.propertyOptions}
      />

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
        <p className="mt-1 text-sm text-gray-500">
          Chaque dépense reflète une sortie d’argent déjà engagée.
        </p>

        {dataset.ledger.length === 0 ? (
          <p className="mt-5 text-sm text-gray-500">Aucune dépense enregistrée pour les filtres actifs.</p>
        ) : (
          <ExpensesLedgerTable
            entries={dataset.ledger.map((entry) => ({
              ...entry,
              editHref: `/dashboard/expenses?${buildFinanceQueryString(dataset.filters, { editExpenseId: entry.expenseId })}`
            }))}
            redirectHref={baseHref}
          />
        )}
      </section>
    </div>
    </>
  );
}
