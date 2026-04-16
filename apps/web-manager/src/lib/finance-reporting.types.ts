import type { ExpenseCategory, PaymentKind } from "@hhousing/domain";

export interface FinanceFilters {
  propertyId: string | null;
  from: string;
  to: string;
}

export interface FinancePropertyOption {
  id: string;
  name: string;
}

export interface CurrencyTotal {
  currencyCode: string;
  amount: number;
}

export interface FinanceMonthlyBucket {
  month: string;
  label: string;
  totals: CurrencyTotal[];
}

export interface RevenueLedgerEntry {
  paymentId: string;
  propertyId: string | null;
  propertyName: string;
  unitNumber: string;
  tenantName: string;
  paidDate: string;
  dueDate: string;
  paymentKind: PaymentKind;
  currencyCode: string;
  amount: number;
  note: string | null;
}

export interface PropertyRevenueSummary {
  propertyId: string;
  propertyName: string;
  paymentCount: number;
  totals: CurrencyTotal[];
}

export interface RevenueDataset {
  filters: FinanceFilters;
  propertyOptions: FinancePropertyOption[];
  revenueTotals: CurrencyTotal[];
  depositLiabilityTotals: CurrencyTotal[];
  monthlyRevenue: FinanceMonthlyBucket[];
  propertyRevenue: PropertyRevenueSummary[];
  ledger: RevenueLedgerEntry[];
  recordedPaymentCount: number;
  recordedDepositCount: number;
}

export interface ExpenseLedgerEntry {
  expenseId: string;
  propertyId: string | null;
  propertyName: string;
  unitId: string | null;
  unitLabel: string | null;
  title: string;
  category: ExpenseCategory;
  vendorName: string | null;
  payeeName: string | null;
  expenseDate: string;
  currencyCode: string;
  amount: number;
  note: string | null;
}

export interface PropertyExpenseSummary {
  propertyId: string | null;
  propertyName: string;
  expenseCount: number;
  totals: CurrencyTotal[];
}

export interface ExpenseDataset {
  filters: FinanceFilters;
  propertyOptions: FinancePropertyOption[];
  propertyUnitOptions: Array<{ propertyId: string; propertyName: string; units: Array<{ id: string; label: string }> }>;
  expenseTotals: CurrencyTotal[];
  monthlyExpenses: FinanceMonthlyBucket[];
  propertyExpenses: PropertyExpenseSummary[];
  ledger: ExpenseLedgerEntry[];
  recordedExpenseCount: number;
}

export interface FinanceNetMonthlyBucket {
  month: string;
  label: string;
  revenueTotals: CurrencyTotal[];
  expenseTotals: CurrencyTotal[];
  netTotals: CurrencyTotal[];
}

export interface PropertyFinanceSummary {
  propertyId: string | null;
  propertyName: string;
  paymentCount: number;
  expenseCount: number;
  revenueTotals: CurrencyTotal[];
  expenseTotals: CurrencyTotal[];
  netTotals: CurrencyTotal[];
}