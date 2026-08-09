import { createPaymentRepo, createRepositoryFromEnv } from "../app/api/shared";
import type { MembershipAuthSession } from "@hhousing/api-contracts";
import type {
  CurrencyTotal,
  FinanceFilters,
  FinanceMonthlyBucket,
  FinancePropertyOption,
  PropertyRevenueSummary,
  RevenueDataset,
  RevenueLedgerEntry
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

export type RevenuesPageData = RevenueDataset & {
  nextCursor: string | null;
};

export async function loadRevenuesPageData(
  session: MembershipAuthSession,
  searchParams: Record<string, string | string[] | undefined> | undefined
): Promise<RevenuesPageData> {
  const filters = normalizeFinanceFilters(searchParams);
  const cursorValue = searchParams?.cursor;
  const cursor = typeof cursorValue === "string" && cursorValue.length > 0 ? cursorValue : null;

  const paymentRepo = createPaymentRepo();
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

  const propertyOptions = await propertyRepo.data.listPropertyOptions(session.organizationId);
  const summary = await paymentRepo.sumRevenuePayments(financeFilters);
  const page = await paymentRepo.listRevenuePaymentsPage({
    ...financeFilters,
    limit: PAGE_LIMIT,
    cursor
  });

  const monthlyRevenue: FinanceMonthlyBucket[] = summary.monthlyRevenue.map((item) => ({
    month: item.month,
    label: formatMonthLabel(item.month),
    totals: item.totals
  }));

  const propertyRevenue: PropertyRevenueSummary[] = summary.propertyRevenue;
  const ledger: RevenueLedgerEntry[] = page.rows;
  const typedPropertyOptions: FinancePropertyOption[] = propertyOptions;
  const revenueTotals: CurrencyTotal[] = summary.revenueTotals;
  const depositLiabilityTotals: CurrencyTotal[] = summary.depositLiabilityTotals;

  return {
    filters,
    propertyOptions: typedPropertyOptions,
    revenueTotals,
    depositLiabilityTotals,
    monthlyRevenue,
    propertyRevenue,
    ledger,
    recordedPaymentCount: summary.recordedPaymentCount,
    recordedDepositCount: summary.recordedDepositCount,
    nextCursor: page.nextCursor
  };
}
