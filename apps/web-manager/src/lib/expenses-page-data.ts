import { createExpenseRepo, createRepositoryFromEnv } from "../app/api/shared";
import type { MembershipAuthSession } from "@hhousing/api-contracts";
import type {
  CurrencyTotal,
  ExpenseDataset,
  ExpenseLedgerEntry,
  FinanceFilters,
  FinanceMonthlyBucket,
  FinancePropertyOption,
  PropertyExpenseSummary
} from "./finance-reporting.types";
import { normalizeFinanceFilters } from "./finance-reporting";

const PAGE_LIMIT = 50;

function formatMonthLabel(month: string): string {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;

  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, monthIndex, 1)));
}

export type ExpensesPageData = ExpenseDataset & {
  nextCursor: string | null;
  editingExpense: ExpenseLedgerEntry | null;
};

/**
 * SQL-first expenses page loader — no portfolio dump, no payments, no JS aggregation.
 */
export async function loadExpensesPageData(
  session: MembershipAuthSession,
  searchParams: Record<string, string | string[] | undefined> | undefined
): Promise<ExpensesPageData> {
  const filters = normalizeFinanceFilters(searchParams);
  const cursorValue = searchParams?.cursor;
  const cursor = typeof cursorValue === "string" && cursorValue.length > 0 ? cursorValue : null;
  const editExpenseId =
    typeof searchParams?.editExpenseId === "string" ? searchParams.editExpenseId : null;

  const expenseRepo = createExpenseRepo();
  const propertyRepo = createRepositoryFromEnv();
  if (!propertyRepo.success) {
    throw new Error(propertyRepo.error);
  }

  const financeFilters = {
    organizationId: session.organizationId,
    from: filters.from,
    to: filters.to,
    propertyId: filters.propertyId
  };

  const [propertyOptions, propertyUnitOptions] = await Promise.all([
    propertyRepo.data.listPropertyOptions(session.organizationId),
    propertyRepo.data.listPropertyUnitOptions(session.organizationId)
  ]);
  const summary = await expenseRepo.sumExpenses(financeFilters);
  const page = await expenseRepo.listExpensesPage({
    ...financeFilters,
    limit: PAGE_LIMIT,
    cursor
  });
  const editingExpenseRecord = editExpenseId
    ? await expenseRepo.getExpenseById(editExpenseId, session.organizationId)
    : null;

  const ledger: ExpenseLedgerEntry[] = page.rows.map((row) => ({
    expenseId: row.expense.id,
    propertyId: row.expense.propertyId,
    propertyName: row.propertyName,
    unitId: row.expense.unitId,
    unitLabel: row.unitLabel,
    title: row.expense.title,
    category: row.expense.category,
    vendorName: row.expense.vendorName,
    payeeName: row.expense.payeeName,
    expenseDate: row.expense.expenseDate,
    currencyCode: row.expense.currencyCode,
    amount: row.expense.amount,
    note: row.expense.note
  }));

  const expenseTotals: CurrencyTotal[] = summary.totals;
  const propertyExpenses: PropertyExpenseSummary[] = summary.propertyExpenses;
  const monthlyExpenses: FinanceMonthlyBucket[] = summary.monthlyExpenses.map((item) => ({
    month: item.month,
    label: formatMonthLabel(item.month),
    totals: item.totals
  }));

  const typedPropertyOptions: FinancePropertyOption[] = propertyOptions;

  let editingExpense: ExpenseLedgerEntry | null = null;
  if (editingExpenseRecord) {
    const propertyName =
      propertyOptions.find((item) => item.id === editingExpenseRecord.propertyId)?.name ??
      "Organisation générale";
    const unitLabel =
      propertyUnitOptions
        .flatMap((item) => item.units.map((unit) => ({ ...unit, propertyId: item.propertyId })))
        .find((unit) => unit.id === editingExpenseRecord.unitId)?.label ?? null;

    editingExpense = {
      expenseId: editingExpenseRecord.id,
      propertyId: editingExpenseRecord.propertyId,
      propertyName,
      unitId: editingExpenseRecord.unitId,
      unitLabel,
      title: editingExpenseRecord.title,
      category: editingExpenseRecord.category,
      vendorName: editingExpenseRecord.vendorName,
      payeeName: editingExpenseRecord.payeeName,
      expenseDate: editingExpenseRecord.expenseDate,
      currencyCode: editingExpenseRecord.currencyCode,
      amount: editingExpenseRecord.amount,
      note: editingExpenseRecord.note
    };
  }

  return {
    filters,
    propertyOptions: typedPropertyOptions,
    propertyUnitOptions,
    expenseTotals,
    monthlyExpenses,
    propertyExpenses,
    ledger,
    recordedExpenseCount: summary.recordedExpenseCount,
    nextCursor: page.nextCursor,
    editingExpense
  };
}

export type { FinanceFilters };
