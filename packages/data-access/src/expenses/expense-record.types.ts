import type { Expense, ExpenseCategory } from "@hhousing/domain";

export interface CreateExpenseRecordInput {
  id: string;
  organizationId: string;
  propertyId: string | null;
  unitId: string | null;
  title: string;
  category: ExpenseCategory;
  vendorName: string | null;
  payeeName: string | null;
  amount: number;
  currencyCode: string;
  expenseDate: string;
  note: string | null;
}

export interface UpdateExpenseRecordInput {
  id: string;
  organizationId: string;
  propertyId: string | null;
  unitId: string | null;
  title: string;
  category: ExpenseCategory;
  vendorName: string | null;
  payeeName: string | null;
  amount: number;
  currencyCode: string;
  expenseDate: string;
  note: string | null;
}

export interface DashboardMonthlyTotalRow {
  month: string;
  amount: number;
}

export interface ExpenseFinanceFilters {
  organizationId: string;
  from: string;
  to: string;
  propertyId?: string | null;
  category?: ExpenseCategory;
}

export interface ExpenseCurrencyTotal {
  currencyCode: string;
  amount: number;
}

export interface ExpensePropertyAggregate {
  propertyId: string | null;
  propertyName: string;
  expenseCount: number;
  totals: ExpenseCurrencyTotal[];
}

export interface ExpenseMonthlyAggregate {
  month: string;
  totals: ExpenseCurrencyTotal[];
}

export interface SumExpensesResult {
  totals: ExpenseCurrencyTotal[];
  recordedExpenseCount: number;
  propertyExpenses: ExpensePropertyAggregate[];
  monthlyExpenses: ExpenseMonthlyAggregate[];
}

export interface ExpenseLedgerPageRow {
  expense: Expense;
  propertyName: string;
  unitLabel: string | null;
}

export interface ListExpensesPageInput extends ExpenseFinanceFilters {
  limit: number;
  /** Keyset cursor: `${expenseDate}|${id}` from previous page last row */
  cursor?: string | null;
}

export interface ListExpensesPageResult {
  rows: ExpenseLedgerPageRow[];
  nextCursor: string | null;
}

export interface ExpenseRepository {
  createExpense(input: CreateExpenseRecordInput): Promise<Expense>;
  getExpenseById(id: string, organizationId: string): Promise<Expense | null>;
  /**
   * @deprecated Prefer listExpensesPage. Kept for API compatibility; always capped.
   */
  listExpenses(filter: {
    organizationId: string;
    propertyId?: string;
    category?: ExpenseCategory;
    from?: string;
    to?: string;
    limit?: number;
  }): Promise<Expense[]>;
  listExpensesPage(input: ListExpensesPageInput): Promise<ListExpensesPageResult>;
  sumExpenses(filters: ExpenseFinanceFilters): Promise<SumExpensesResult>;
  updateExpense(input: UpdateExpenseRecordInput): Promise<Expense | null>;
  deleteExpense(id: string, organizationId: string): Promise<boolean>;
  getDashboardExpenseMonthSum(
    organizationId: string,
    currencyCode: string,
    monthStart: string,
    monthEndExclusive: string
  ): Promise<number>;
  sumExpensesByMonth(
    organizationId: string,
    currencyCode: string,
    fromDate: string
  ): Promise<DashboardMonthlyTotalRow[]>;
}
