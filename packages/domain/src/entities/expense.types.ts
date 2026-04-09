export type ExpenseCategory =
  | "maintenance"
  | "utilities"
  | "taxes"
  | "insurance"
  | "supplies"
  | "payroll"
  | "cleaning"
  | "security"
  | "legal"
  | "marketing"
  | "admin"
  | "other";

export interface Expense {
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
  createdAtIso: string;
}