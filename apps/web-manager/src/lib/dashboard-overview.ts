import type { MembershipAuthSession } from "@hhousing/api-contracts";
import {
  createPaymentRepo,
  createRepositoryFromEnv,
  createTenantLeaseRepo
} from "../app/api/shared";
import { getNow } from "./time";
import type {
  DashboardCurrencyTotal,
  DashboardInitialData,
  DashboardTrendBucket,
  DashboardWatchlistItem,
  LoadDashboardOverviewOptions
} from "./dashboard-overview.types";

const WATCHLIST_LIMIT = 8;
const LEASE_ENDING_SOON_DAYS = 30;
const TREND_MONTHS = 6;

function zeroTotal(currencyCode: string): DashboardCurrencyTotal {
  return { currencyCode, amount: 0 };
}

function emptyInitial(selectedCurrency: string): DashboardInitialData {
  return {
    attention: {
      overdue: { count: 0, amount: 0, currencyCode: selectedCurrency },
      leasesEndingSoon: { count: 0, nextEndDate: null }
    },
    finances: {
      paid: zeroTotal(selectedCurrency),
      overdue: zeroTotal(selectedCurrency)
    },
    portfolio: {
      properties: 0,
      units: 0,
      tenants: 0,
      occupiedUnits: 0,
      occupancyRate: 0
    },
    watchlist: []
  };
}

function getTodayUtcIsoDate(): string {
  const now = getNow();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

function getCurrentMonthBounds(): { monthStart: string; monthEndExclusive: string } {
  const now = getNow();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEndExclusive = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return {
    monthStart: monthStart.toISOString().slice(0, 10),
    monthEndExclusive: monthEndExclusive.toISOString().slice(0, 10)
  };
}

function getTrendFromDate(): string {
  const now = getNow();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (TREND_MONTHS - 1), 1));
  return from.toISOString().slice(0, 10);
}

function getRecentMonthKeys(count: number): string[] {
  const now = getNow();
  const monthKeys: string[] = [];

  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const monthDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    monthKeys.push(monthDate.toISOString().slice(0, 7));
  }

  return monthKeys;
}

function formatTrendMonthLabel(month: string): string {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;

  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, monthIndex, 1)));
}

function formatIsoDate(isoDate: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(`${isoDate}T00:00:00Z`));
}

function formatMoney(amount: number, currencyCode: string): string {
  return `${amount.toLocaleString("fr-FR")} ${currencyCode}`;
}

function getDayDiff(fromIsoDate: string, toIsoDate: string): number {
  const from = new Date(`${fromIsoDate}T00:00:00Z`);
  const to = new Date(`${toIsoDate}T00:00:00Z`);
  return Math.floor((to.getTime() - from.getTime()) / 86400000);
}

function buildWatchlist(input: {
  payments: Array<{
    id: string;
    status: "overdue" | "pending";
    amount: number;
    currencyCode: string;
    dueDate: string;
    tenantName: string;
    unitLabel: string;
  }>;
  leasesEndingSoon: Array<{ id: string; tenantFullName: string; endDate: string; daysUntil: number }>;
  todayIsoDate: string;
}): DashboardWatchlistItem[] {
  const items: Array<DashboardWatchlistItem & { rank: number }> = [];

  for (const payment of input.payments) {
    if (payment.status === "overdue") {
      const daysLate = Math.max(0, getDayDiff(payment.dueDate, input.todayIsoDate));
      items.push({
        id: `overdue:${payment.id}`,
        kind: "overdue",
        title: `Loyer en retard — ${payment.unitLabel}`,
        detail: payment.tenantName,
        meta: formatMoney(payment.amount, payment.currencyCode),
        href: "/dashboard/payments",
        rank: 1000 + daysLate
      });
      continue;
    }

    items.push({
      id: `pending:${payment.id}`,
      kind: "pending",
      title: `Loyer en attente — ${payment.unitLabel}`,
      detail: payment.tenantName,
      meta: formatMoney(payment.amount, payment.currencyCode),
      href: "/dashboard/payments",
      rank: 400
    });
  }

  for (const lease of input.leasesEndingSoon) {
    items.push({
      id: `lease:${lease.id}`,
      kind: "lease",
      title: `Contrat — ${lease.tenantFullName}`,
      detail: `Fin le ${formatIsoDate(lease.endDate)}`,
      meta: `${lease.daysUntil} jour${lease.daysUntil === 1 ? "" : "s"}`,
      href: `/dashboard/leases/${lease.id}`,
      rank: 600 - lease.daysUntil
    });
  }

  return items
    .sort((left, right) => right.rank - left.rank)
    .slice(0, WATCHLIST_LIMIT)
    .map(({ rank: _rank, ...item }) => item);
}

/**
 * Fast first-paint dashboard payload: one SQL query per domain, no full table dumps.
 * V1: no expenses, tasks, or messaging on this path.
 */
export async function loadDashboardInitial(
  session: MembershipAuthSession,
  options: LoadDashboardOverviewOptions
): Promise<DashboardInitialData> {
  const { selectedCurrency } = options;
  const propertyRepo = createRepositoryFromEnv();

  if (!propertyRepo.success) {
    return emptyInitial(selectedCurrency);
  }

  const { monthStart, monthEndExclusive } = getCurrentMonthBounds();
  const todayIsoDate = getTodayUtcIsoDate();
  const paymentRepo = createPaymentRepo();
  const leaseRepo = createTenantLeaseRepo();

  try {
    // Two waves to avoid opening too many cold pooler connections at once.
    // Wave 1: KPI cards (must succeed for a useful first paint).
    const [paymentFinance, portfolioCounts, leaseSnapshot] = await Promise.all([
      paymentRepo.getDashboardPaymentFinanceSnapshot(
        session.organizationId,
        selectedCurrency,
        monthStart,
        monthEndExclusive
      ),
      propertyRepo.data.getPortfolioCounts(session.organizationId),
      leaseRepo.getDashboardLeaseSnapshot(
        session.organizationId,
        todayIsoDate,
        LEASE_ENDING_SOON_DAYS,
        WATCHLIST_LIMIT
      )
    ]);

    // Wave 2: secondary widgets (best-effort).
    const watchlistPayments = await paymentRepo
      .listDashboardWatchlistPayments(session.organizationId, selectedCurrency, WATCHLIST_LIMIT)
      .catch((error) => {
        console.error("Dashboard watchlist failed", error);
        return [] as Awaited<ReturnType<typeof paymentRepo.listDashboardWatchlistPayments>>;
      });

    const paid = { currencyCode: selectedCurrency, amount: paymentFinance.paidAmount };
    const overdue = { currencyCode: selectedCurrency, amount: paymentFinance.overdueAmount };
    const occupancyRate =
      portfolioCounts.unitCount > 0
        ? Math.round((portfolioCounts.occupiedUnitCount / portfolioCounts.unitCount) * 100)
        : 0;

    return {
      attention: {
        overdue: {
          count: paymentFinance.overdueCount,
          amount: paymentFinance.overdueAmount,
          currencyCode: selectedCurrency
        },
        leasesEndingSoon: {
          count: leaseSnapshot.endingSoonCount,
          nextEndDate: leaseSnapshot.nextEndDate
        }
      },
      finances: { paid, overdue },
      portfolio: {
        properties: portfolioCounts.propertyCount,
        units: portfolioCounts.unitCount,
        tenants: leaseSnapshot.activeTenantCount,
        occupiedUnits: portfolioCounts.occupiedUnitCount,
        occupancyRate
      },
      watchlist: buildWatchlist({
        payments: watchlistPayments,
        leasesEndingSoon: leaseSnapshot.endingSoon,
        todayIsoDate
      })
    };
  } catch (error) {
    console.error("Failed to load dashboard initial data", error);
    return emptyInitial(selectedCurrency);
  }
}

/**
 * Deferred 6-month trend series. SQL-aggregated with a hard date window.
 * V1: revenue-only (expenses deferred — do not fetch or fabricate $0 series).
 */
export async function loadDashboardTrends(
  session: MembershipAuthSession,
  selectedCurrency: string
): Promise<DashboardTrendBucket[]> {
  const fromDate = getTrendFromDate();
  const monthKeys = getRecentMonthKeys(TREND_MONTHS);

  try {
    const paidByMonth = await createPaymentRepo().sumPaidPaymentsByMonth(
      session.organizationId,
      selectedCurrency,
      fromDate
    );

    const revenueMap = new Map(paidByMonth.map((row) => [row.month, row.amount]));

    return monthKeys.map((month) => {
      const revenue = revenueMap.get(month) ?? 0;
      return {
        month,
        label: formatTrendMonthLabel(month),
        revenueTotals: [{ currencyCode: selectedCurrency, amount: revenue }]
      };
    });
  } catch (error) {
    console.error("Failed to load dashboard trends", error);
    return monthKeys.map((month) => ({
      month,
      label: formatTrendMonthLabel(month),
      revenueTotals: [zeroTotal(selectedCurrency)]
    }));
  }
}
