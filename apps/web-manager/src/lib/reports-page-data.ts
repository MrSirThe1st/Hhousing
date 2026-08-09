import { createExpenseRepo, createPaymentRepo, createRepositoryFromEnv } from "../app/api/shared";
import type { MembershipAuthSession } from "@hhousing/api-contracts";
import type {
  CurrencyTotal,
  ExpenseDataset,
  FinanceFilters,
  FinanceMonthlyBucket,
  FinancePropertyOption,
  PropertyExpenseSummary,
  PropertyFinanceSummary,
  PropertyRevenueSummary,
  RevenueDataset
} from "./finance-reporting.types";
import { normalizeFinanceFilters, subtractCurrencyTotals } from "./finance-reporting";

function formatMonthLabel(month: string): string {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;
  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, monthIndex, 1)));
}

export type ReportsPageData = {
  filters: FinanceFilters;
  propertyOptions: FinancePropertyOption[];
  revenueDataset: Pick<
    RevenueDataset,
    "revenueTotals" | "depositLiabilityTotals" | "monthlyRevenue" | "propertyRevenue"
  >;
  expenseDataset: Pick<
    ExpenseDataset,
    "expenseTotals" | "monthlyExpenses" | "propertyExpenses"
  >;
  netTotals: CurrencyTotal[];
  propertySummary: PropertyFinanceSummary[];
};

export async function loadReportsPageData(
  session: MembershipAuthSession,
  searchParams: Record<string, string | string[] | undefined> | undefined
): Promise<ReportsPageData> {
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

  // Sequential heavy aggregates to keep peak pool usage low (layout already holds connections).
  const propertyOptions = await propertyRepo.data.listPropertyOptions(session.organizationId);
  const revenueSummary = await paymentRepo.sumRevenuePayments(financeFilters);
  const expenseSummary = await expenseRepo.sumExpenses(financeFilters);

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

  const propertyRevenue: PropertyRevenueSummary[] = revenueSummary.propertyRevenue;
  const propertyExpenses: PropertyExpenseSummary[] = expenseSummary.propertyExpenses;

  const propertyKeys = new Set<string>([
    ...propertyRevenue.map((property) => property.propertyId),
    ...propertyExpenses.map((property) => property.propertyId ?? "general")
  ]);

  const propertySummary: PropertyFinanceSummary[] = [...propertyKeys]
    .map((propertyKey) => {
      const revenue = propertyRevenue.find((item) => item.propertyId === propertyKey);
      const expense = propertyExpenses.find((item) => (item.propertyId ?? "general") === propertyKey);
      const propertyId = propertyKey === "general" ? null : propertyKey;
      return {
        propertyId,
        propertyName: revenue?.propertyName ?? expense?.propertyName ?? "Organisation générale",
        paymentCount: revenue?.paymentCount ?? 0,
        expenseCount: expense?.expenseCount ?? 0,
        revenueTotals: revenue?.totals ?? [],
        expenseTotals: expense?.totals ?? [],
        netTotals: subtractCurrencyTotals(revenue?.totals ?? [], expense?.totals ?? [])
      };
    })
    .sort((left, right) => left.propertyName.localeCompare(right.propertyName, "fr"));

  return {
    filters,
    propertyOptions,
    revenueDataset: {
      revenueTotals: revenueSummary.revenueTotals,
      depositLiabilityTotals: revenueSummary.depositLiabilityTotals,
      monthlyRevenue,
      propertyRevenue
    },
    expenseDataset: {
      expenseTotals: expenseSummary.totals,
      monthlyExpenses,
      propertyExpenses
    },
    netTotals: subtractCurrencyTotals(revenueSummary.revenueTotals, expenseSummary.totals),
    propertySummary
  };
}
