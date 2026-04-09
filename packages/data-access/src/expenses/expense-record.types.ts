import type { ListExpensesFilter } from "@hhousing/api-contracts";
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

export interface ExpenseRepository {
  createExpense(input: CreateExpenseRecordInput): Promise<Expense>;
  getExpenseById(id: string, organizationId: string): Promise<Expense | null>;
  listExpenses(filter: ListExpensesFilter): Promise<Expense[]>;
  updateExpense(input: UpdateExpenseRecordInput): Promise<Expense | null>;
  deleteExpense(id: string, organizationId: string): Promise<boolean>;
}