import { createExpenseRepo, createPaymentRepo, createRepositoryFromEnv } from "../app/api/shared";
import type { MembershipAuthSession } from "@hhousing/api-contracts";
import type {
  ExpenseDataset,
  ExpenseLedgerEntry,
  FinanceFilters,
  FinanceMonthlyBucket,
  RevenueDataset,
  RevenueLedgerEntry
} from "./finance-reporting.types";
import { normalizeFinanceFilters } from "./finance-reporting";

const PAGE_LIMIT = 50;
const MAX_EXPORT_PAGES = 20; // hard cap: 1000 ledger rows

function formatMonthLabel(month: string): string {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, monthIndex, 1)));
}

export async function loadFinanceExportDatasets(
  session: MembershipAuthSession,
  searchParams: Record<string, string | string[] | undefined> | undefined
): Promise<{ filters: FinanceFilters; revenueDataset: RevenueDataset; expenseDataset: ExpenseDataset }> {
  const filters = normalizeFinanceFilters(searchParams);
  const paymentRepo = createPaymentRepo();
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

  const [revenueSummary, expenseSummary, propertyOptions, propertyUnitOptions] = await Promise.all([
    paymentRepo.sumRevenuePayments(financeFilters),
    expenseRepo.sumExpenses(financeFilters),
    propertyRepo.data.listPropertyOptions(session.organizationId),
    propertyRepo.data.listPropertyUnitOptions(session.organizationId)
  ]);

  const revenueLedger: RevenueLedgerEntry[] = [];
  let revenueCursor: string | null = null;
  for (let pageIndex = 0; pageIndex < MAX_EXPORT_PAGES; pageIndex += 1) {
    const page = await paymentRepo.listRevenuePaymentsPage({
      ...financeFilters,
      limit: PAGE_LIMIT,
      cursor: revenueCursor
    });
    revenueLedger.push(...page.rows);
    revenueCursor = page.nextCursor;
    if (!revenueCursor) break;
  }

  const expenseLedger: ExpenseLedgerEntry[] = [];
  let expenseCursor: string | null = null;
  for (let pageIndex = 0; pageIndex < MAX_EXPORT_PAGES; pageIndex += 1) {
    const page = await expenseRepo.listExpensesPage({
      ...financeFilters,
      limit: PAGE_LIMIT,
      cursor: expenseCursor
    });
    expenseLedger.push(
      ...page.rows.map((row) => ({
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
      }))
    );
    expenseCursor = page.nextCursor;
    if (!expenseCursor) break;
  }

  const monthlyRevenue: FinanceMonthlyBucket[] = revenueSummary.monthlyRevenue.map((item) => ({
    month: item.month,
    label: formatMonthLabel(item.month),
    totals: item.totals
  }));
  const monthlyExpenses: FinanceMonthlyBucket[] = expenseSummary.monthlyExpenses.map((item) => ({
    month: item.month,
    label: formatMonthLabel(item.month),
    totals: item.totals
  }));

  const revenueDataset: RevenueDataset = {
    filters,
    propertyOptions,
    revenueTotals: revenueSummary.revenueTotals,
    depositLiabilityTotals: revenueSummary.depositLiabilityTotals,
    monthlyRevenue,
    propertyRevenue: revenueSummary.propertyRevenue,
    ledger: revenueLedger,
    recordedPaymentCount: revenueSummary.recordedPaymentCount,
    recordedDepositCount: revenueSummary.recordedDepositCount
  };

  const expenseDataset: ExpenseDataset = {
    filters,
    propertyOptions,
    propertyUnitOptions,
    expenseTotals: expenseSummary.totals,
    monthlyExpenses,
    propertyExpenses: expenseSummary.propertyExpenses,
    ledger: expenseLedger,
    recordedExpenseCount: expenseSummary.recordedExpenseCount
  };

  return { filters, revenueDataset, expenseDataset };
}
