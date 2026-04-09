import type { Expense, ExpenseCategory } from "@hhousing/domain";

export type { ExpenseCategory } from "@hhousing/domain";

export interface CreateExpenseInput {
  organizationId: string;
  propertyId?: string | null;
  unitId?: string | null;
  title: string;
  category: ExpenseCategory;
  vendorName: string | null;
  payeeName: string | null;
  amount: number;
  currencyCode: string;
  expenseDate: string;
  note: string | null;
}

export type CreateExpenseOutput = Expense;

export interface UpdateExpenseInput {
  organizationId: string;
  propertyId?: string | null;
  unitId?: string | null;
  title: string;
  category: ExpenseCategory;
  vendorName: string | null;
  payeeName: string | null;
  amount: number;
  currencyCode: string;
  expenseDate: string;
  note: string | null;
}

export type UpdateExpenseOutput = Expense;

export interface DeleteExpenseOutput {
  success: true;
}

export interface ListExpensesFilter {
  organizationId: string;
  propertyId?: string;
  category?: ExpenseCategory;
}

export interface ListExpensesOutput {
  expenses: Expense[];
}