export type DashboardCurrencyTotal = {
  currencyCode: string;
  amount: number;
};

export type DashboardTrendBucket = {
  month: string;
  label: string;
  revenueTotals: DashboardCurrencyTotal[];
};

export type DashboardWatchlistKind = "overdue" | "lease" | "pending";

export type DashboardWatchlistItem = {
  id: string;
  kind: DashboardWatchlistKind;
  title: string;
  detail: string;
  meta: string;
  href: string;
};

export type DashboardInitialData = {
  attention: {
    overdue: {
      count: number;
      amount: number;
      currencyCode: string;
    };
    leasesEndingSoon: {
      count: number;
      nextEndDate: string | null;
    };
  };
  finances: {
    paid: DashboardCurrencyTotal;
    overdue: DashboardCurrencyTotal;
  };
  portfolio: {
    properties: number;
    units: number;
    tenants: number;
    occupiedUnits: number;
    occupancyRate: number;
  };
  watchlist: DashboardWatchlistItem[];
};

/** @deprecated Use DashboardInitialData + separate trends */
export type DashboardOverview = DashboardInitialData & {
  trend: DashboardTrendBucket[];
};

export type LoadDashboardOverviewOptions = {
  selectedCurrency: string;
};
