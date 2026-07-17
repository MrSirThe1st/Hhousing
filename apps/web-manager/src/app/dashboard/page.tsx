import { redirect } from "next/navigation";
import Link from "next/link";
import DashboardTasksPanel from "../../components/dashboard-tasks-panel";
import ResponsiveTable from "../../components/responsive-table";
import { requireDashboardSectionAccess } from "../../lib/dashboard-access";
import { getOperatorScopeLabel, getServerOperatorContext } from "../../lib/operator-context";
import { getIndividualExperienceFeatures } from "../../lib/individual-experience";
import { createRepositoryFromEnv, createTenantLeaseRepo, createMaintenanceRepo } from "../api/shared";
import { buildDashboardWorkflowData } from "../../lib/dashboard-workflow";
import DashboardCalendar from "../../components/dashboard-calendar";
import { formatCurrencySummary, loadScopedFinanceData, subtractCurrencyTotals } from "../../lib/finance-reporting";
import type { AuthSession } from "@hhousing/api-contracts";
import type { Expense, MaintenanceRequest, Payment, PlatformExperience } from "@hhousing/domain";
import { getNow } from "../../lib/time";

type DashboardTab = "overview" | "tasks" | "calendar";

type DashboardPageProps = {
  searchParams?: Promise<{
    tab?: string;
    currency?: string;
  }>;
};

type DashboardMetrics = {
  propertyCount: number;
  unitCount: number;
  tenantCount: number;
  leaseCount: number;
  maintenanceCount: number;
  occupiedUnitCount: number;
  paidTotals: CurrencyTotal[];
  expenseTotals: CurrencyTotal[];
  netTotals: CurrencyTotal[];
  overdueTotals: CurrencyTotal[];
  pendingTotals: CurrencyTotal[];
  paidPaymentCount: number;
  overduePaymentCount: number;
  pendingPaymentCount: number;
  urgentMaintenanceCount: number;
  monthlyTrend: MonthlyFinanceTrend[];
  overdueRows: OverduePriorityRow[];
  dailyDigest: DailyDigest;
};

type CurrencyTotal = {
  currencyCode: string;
  amount: number;
};

type MonthlyFinanceTrend = {
  month: string;
  label: string;
  revenueTotals: CurrencyTotal[];
  expenseTotals: CurrencyTotal[];
  netTotals: CurrencyTotal[];
};

type OverduePriorityRow = {
  paymentId: string;
  tenantName: string;
  unitLabel: string;
  amount: number;
  currencyCode: string;
  daysLate: number;
  dueDate: string;
};

type DailyDigest = {
  urgentMaintenanceCount: number;
  overduePaymentCount: number;
  leasesEndingSoonCount: number;
  nextLeaseEndDate: string | null;
  mostOverdueDays: number;
};

function addAmount(summary: Map<string, number>, currencyCode: string, amount: number): void {
  summary.set(currencyCode, (summary.get(currencyCode) ?? 0) + amount);
}

function toCurrencyTotals(summary: Map<string, number>): CurrencyTotal[] {
  return [...summary.entries()]
    .map(([currencyCode, amount]) => ({ currencyCode, amount }))
    .sort((left, right) => left.currencyCode.localeCompare(right.currencyCode, "fr"));
}

function filterCurrencyTotals(totals: CurrencyTotal[], currency: string): CurrencyTotal[] {
  const match = totals.find((t) => t.currencyCode === currency);
  return match ? [match] : [{ currencyCode: currency, amount: 0 }];
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

function buildMonthlyTrend(payments: Payment[], expenses: Expense[], selectedCurrency: string): MonthlyFinanceTrend[] {
  const monthKeys = getRecentMonthKeys(6);
  const monthKeySet = new Set(monthKeys);
  const revenueByMonth = new Map<string, Map<string, number>>();
  const expenseByMonth = new Map<string, Map<string, number>>();

  for (const payment of payments) {
    if (payment.status !== "paid" || payment.paidDate === null) {
      continue;
    }

    const month = payment.paidDate.slice(0, 7);
    if (!monthKeySet.has(month)) {
      continue;
    }

    const summary = revenueByMonth.get(month) ?? new Map<string, number>();
    addAmount(summary, payment.currencyCode, payment.amount);
    revenueByMonth.set(month, summary);
  }

  for (const expense of expenses) {
    const month = expense.expenseDate.slice(0, 7);
    if (!monthKeySet.has(month)) {
      continue;
    }

    const summary = expenseByMonth.get(month) ?? new Map<string, number>();
    addAmount(summary, expense.currencyCode, expense.amount);
    expenseByMonth.set(month, summary);
  }

  return monthKeys.map((month) => {
    const revenueTotals = filterCurrencyTotals(toCurrencyTotals(revenueByMonth.get(month) ?? new Map<string, number>()), selectedCurrency);
    const expenseTotals = filterCurrencyTotals(toCurrencyTotals(expenseByMonth.get(month) ?? new Map<string, number>()), selectedCurrency);

    return {
      month,
      label: formatTrendMonthLabel(month),
      revenueTotals,
      expenseTotals,
      netTotals: filterCurrencyTotals(subtractCurrencyTotals(revenueTotals, expenseTotals), selectedCurrency)
    };
  });
}

function parseUtcDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

function getTodayUtcDate(): Date {
  const now = getNow();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function getDayDiff(from: Date, to: Date): number {
  return Math.floor((to.getTime() - from.getTime()) / 86400000);
}

function formatIsoDate(isoDate: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(parseUtcDate(isoDate));
}

function buildOverdueRows(
  payments: Payment[],
  leases: Array<{ id: string; unitId: string; tenantId: string; tenantFullName: string }>,
  unitLabelsById: Map<string, string>
): OverduePriorityRow[] {
  const leaseById = new Map(leases.map((lease) => [lease.id, lease]));
  const today = getTodayUtcDate();

  return payments
    .filter((payment) => payment.status === "overdue")
    .map((payment) => {
      const lease = leaseById.get(payment.leaseId);
      const dueDate = parseUtcDate(payment.dueDate);
      const daysLate = Math.max(0, getDayDiff(dueDate, today));

      return {
        paymentId: payment.id,
        tenantName: lease?.tenantFullName ?? `Locataire ${payment.tenantId}`,
        unitLabel: lease ? (unitLabelsById.get(lease.unitId) ?? lease.unitId) : "Unité inconnue",
        amount: payment.amount,
        currencyCode: payment.currencyCode,
        daysLate,
        dueDate: payment.dueDate
      };
    })
    .sort((left, right) => {
      if (right.daysLate !== left.daysLate) {
        return right.daysLate - left.daysLate;
      }

      return right.amount - left.amount;
    })
    .slice(0, 8);
}

function getLeasesEndingSoon(
  leases: Array<{ status: string; endDate: string | null }>,
  windowDays: number
): { count: number; nearestEndDate: string | null } {
  const today = getTodayUtcDate();
  let count = 0;
  let nearest: string | null = null;

  for (const lease of leases) {
    if (lease.status !== "active" || lease.endDate === null) {
      continue;
    }

    const endDate = parseUtcDate(lease.endDate);
    const daysUntil = getDayDiff(today, endDate);
    if (daysUntil < 0 || daysUntil > windowDays) {
      continue;
    }

    count += 1;
    if (nearest === null || lease.endDate < nearest) {
      nearest = lease.endDate;
    }
  }

  return { count, nearestEndDate: nearest };
}

function getUrgentMaintenanceOpenCount(requests: MaintenanceRequest[]): number {
  return requests.filter(
    (request) => (request.status === "open" || request.status === "in_progress") && request.priority === "urgent"
  ).length;
}

function getDashboardTab(tab: string | undefined, allowTasksCalendar: boolean): DashboardTab {
  if (!allowTasksCalendar && (tab === "tasks" || tab === "calendar")) {
    return "overview";
  }

  if (tab === "tasks" || tab === "calendar") {
    return tab;
  }

  return "overview";
}

function getVariantHeader(experience: PlatformExperience): { title: string; subtitle: string } {
  if (experience === "individual") {
    return {
      title: "Compte personnel",
      subtitle: "Gestion simplifiée de vos biens"
    };
  }

  return {
    title: "Compte agence",
    subtitle: "Locations, équipe et tous vos biens"
  };
}

async function fetchDashboardMetrics(
  session: AuthSession,
  selectedCurrency: string
): Promise<DashboardMetrics> {
  const propertyRepo = createRepositoryFromEnv();
  const tenantLeaseRepo = createTenantLeaseRepo();
  const maintenanceRepo = createMaintenanceRepo();

  if (!propertyRepo.success) {
    return {
      propertyCount: 0,
      unitCount: 0,
      tenantCount: 0,
      leaseCount: 0,
      maintenanceCount: 0,
      occupiedUnitCount: 0,
      paidTotals: [],
      expenseTotals: [],
      netTotals: [],
      overdueTotals: [],
      pendingTotals: [],
      paidPaymentCount: 0,
      overduePaymentCount: 0,
      pendingPaymentCount: 0,
      urgentMaintenanceCount: 0,
      monthlyTrend: [],
      overdueRows: [],
      dailyDigest: {
        urgentMaintenanceCount: 0,
        overduePaymentCount: 0,
        leasesEndingSoonCount: 0,
        nextLeaseEndDate: null,
        mostOverdueDays: 0
      }
    };
  }

  try {
    const [properties, leases, maintenanceRequests, financeData] = await Promise.all([
      propertyRepo.data.listPropertiesWithUnits(session.organizationId),
      tenantLeaseRepo.listLeasesByOrganization(session.organizationId),
      maintenanceRepo.listMaintenanceRequests({ organizationId: session.organizationId, unitId: undefined, status: undefined }),
      loadScopedFinanceData(session)
    ]);

    const filteredPayments = financeData.payments.filter((payment) => payment.currencyCode === selectedCurrency);
    const filteredExpenses = financeData.expenses.filter((expense) => expense.currencyCode === selectedCurrency);

    const unitCount = properties.reduce((sum, prop) => sum + prop.units.length, 0);
    const unitIds = new Set(properties.flatMap((property) => property.units.map((unit) => unit.id)));
    const occupiedUnitCount = properties.reduce(
      (sum, property) => sum + property.units.filter((unit) => unit.status === "occupied").length,
      0
    );
    const scopedLeases = leases.filter((lease) => unitIds.has(lease.unitId));
    const tenantIds = new Set(scopedLeases.map((lease) => lease.tenantId));
    const scopedMaintenance = maintenanceRequests.filter((request) => unitIds.has(request.unitId));
    const unitLabelsById = new Map(
      properties.flatMap((property) =>
        property.units.map((unit) => [unit.id, `${unit.unitNumber} · ${property.property.name}`])
      )
    );
    const paidSummary = new Map<string, number>();
    const expenseSummary = new Map<string, number>();
    const overdueSummary = new Map<string, number>();
    const pendingSummary = new Map<string, number>();

    let paidPaymentCount = 0;
    let overduePaymentCount = 0;
    let pendingPaymentCount = 0;

    for (const payment of filteredPayments) {
      if (payment.status === "paid") {
        paidPaymentCount += 1;
        addAmount(paidSummary, payment.currencyCode, payment.amount);
      }

      if (payment.status === "overdue") {
        overduePaymentCount += 1;
        addAmount(overdueSummary, payment.currencyCode, payment.amount);
      }

      if (payment.status === "pending") {
        pendingPaymentCount += 1;
        addAmount(pendingSummary, payment.currencyCode, payment.amount);
      }
    }

    for (const expense of filteredExpenses) {
      addAmount(expenseSummary, expense.currencyCode, expense.amount);
    }

    const paidTotals = filterCurrencyTotals(toCurrencyTotals(paidSummary), selectedCurrency);
    const expenseTotals = filterCurrencyTotals(toCurrencyTotals(expenseSummary), selectedCurrency);
    const overdueTotals = filterCurrencyTotals(toCurrencyTotals(overdueSummary), selectedCurrency);
    const pendingTotals = filterCurrencyTotals(toCurrencyTotals(pendingSummary), selectedCurrency);
    const monthlyTrend = buildMonthlyTrend(filteredPayments, filteredExpenses, selectedCurrency);
    const overdueRows = buildOverdueRows(filteredPayments, scopedLeases, unitLabelsById);
    const leasesEndingSoon = getLeasesEndingSoon(scopedLeases, 30);
    const urgentMaintenanceCount = getUrgentMaintenanceOpenCount(scopedMaintenance);
    const mostOverdueDays = overdueRows.reduce((maxDays, row) => Math.max(maxDays, row.daysLate), 0);

    return {
      propertyCount: properties.length,
      unitCount,
      tenantCount: tenantIds.size,
      leaseCount: scopedLeases.length,
      maintenanceCount: scopedMaintenance.filter(
        (request) => request.status === "open" || request.status === "in_progress"
      ).length,
      occupiedUnitCount,
      paidTotals,
      expenseTotals,
      netTotals: filterCurrencyTotals(subtractCurrencyTotals(paidTotals, expenseTotals), selectedCurrency),
      overdueTotals,
      pendingTotals,
      paidPaymentCount,
      overduePaymentCount,
      pendingPaymentCount,
      urgentMaintenanceCount,
      monthlyTrend,
      overdueRows,
      dailyDigest: {
        urgentMaintenanceCount,
        overduePaymentCount,
        leasesEndingSoonCount: leasesEndingSoon.count,
        nextLeaseEndDate: leasesEndingSoon.nearestEndDate,
        mostOverdueDays
      }
    };
  } catch {
    return {
      propertyCount: 0,
      unitCount: 0,
      tenantCount: 0,
      leaseCount: 0,
      maintenanceCount: 0,
      occupiedUnitCount: 0,
      paidTotals: [],
      expenseTotals: [],
      netTotals: [],
      overdueTotals: [],
      pendingTotals: [],
      paidPaymentCount: 0,
      overduePaymentCount: 0,
      pendingPaymentCount: 0,
      urgentMaintenanceCount: 0,
      monthlyTrend: [],
      overdueRows: [],
      dailyDigest: {
        urgentMaintenanceCount: 0,
        overduePaymentCount: 0,
        leasesEndingSoonCount: 0,
        nextLeaseEndDate: null,
        mostOverdueDays: 0
      }
    };
  }
}

function getStats(
  experience: PlatformExperience,
  scopeLabel: string,
  metrics: DashboardMetrics
): Array<{ label: string; value: string }> {
  const occupancyRate = metrics.unitCount > 0
    ? Math.round((metrics.occupiedUnitCount / metrics.unitCount) * 100)
    : 0;

  if (experience === "individual") {
    return [
      { label: `Biens (${scopeLabel})`, value: metrics.propertyCount.toString() },
      { label: "Logements", value: metrics.unitCount.toString() },
      { label: "Logements occupés", value: `${occupancyRate}%` },
      { label: "Locataires actifs", value: metrics.tenantCount.toString() },
      { label: "Contrats actifs", value: metrics.leaseCount.toString() }
    ];
  }

  return [
    { label: `Biens (${scopeLabel})`, value: metrics.propertyCount.toString() },
    { label: `Logements (${scopeLabel})`, value: metrics.unitCount.toString() },
    { label: "Locataires actifs", value: metrics.tenantCount.toString() },
    { label: "Contrats actifs", value: metrics.leaseCount.toString() },
    { label: "Logements occupés", value: `${occupancyRate}%` },
    { label: "Réparations en cours", value: metrics.maintenanceCount.toString() }
  ];
}

function getCollectionRate(metrics: DashboardMetrics): number {
  const totalTracked = metrics.paidPaymentCount + metrics.pendingPaymentCount + metrics.overduePaymentCount;
  if (totalTracked === 0) {
    return 0;
  }

  return Math.round((metrics.paidPaymentCount / totalTracked) * 100);
}

export default async function DashboardPage({ searchParams }: DashboardPageProps): Promise<React.ReactElement> {
  const { session } = await requireDashboardSectionAccess("dashboard");  const params = await searchParams;
  const operatorContext = await getServerOperatorContext(session);
  const individualFeatures = getIndividualExperienceFeatures(operatorContext.experience);
  const activeTab = getDashboardTab(params?.tab, individualFeatures.dashboardTasksCalendar);
  const selectedCurrency = params?.currency === "CDF" || params?.currency === "FC" ? "CDF" : "USD";

  const scopeLabel = getOperatorScopeLabel();
  const header = getVariantHeader(operatorContext.experience);

  const metrics = activeTab === "overview"
    ? await fetchDashboardMetrics(session, selectedCurrency)
    : {
      propertyCount: 0,
      unitCount: 0,
      tenantCount: 0,
      leaseCount: 0,
      maintenanceCount: 0,
      occupiedUnitCount: 0,
      paidTotals: [],
      expenseTotals: [],
      netTotals: [],
      overdueTotals: [],
      pendingTotals: [],
      paidPaymentCount: 0,
      overduePaymentCount: 0,
      pendingPaymentCount: 0,
      urgentMaintenanceCount: 0,
      monthlyTrend: [],
      overdueRows: [],
      dailyDigest: {
        urgentMaintenanceCount: 0,
        overduePaymentCount: 0,
        leasesEndingSoonCount: 0,
        nextLeaseEndDate: null,
        mostOverdueDays: 0
      }
    };
  const stats = getStats(operatorContext.experience, scopeLabel, metrics);
  const workflowData = activeTab === "overview" ? null : await buildDashboardWorkflowData(session);
  const collectionRate = getCollectionRate(metrics);

  const hasNoData = metrics.propertyCount === 0;

  const getTabHref = (tabId: DashboardTab) => {
    const query = new URLSearchParams();
    if (tabId !== "overview") {
      query.set("tab", tabId);
    }
    if (selectedCurrency !== "USD") {
      query.set("currency", selectedCurrency);
    }
    const queryString = query.toString();
    return queryString ? `/dashboard?${queryString}` : "/dashboard";
  };

  const getCurrencyHref = (currencyCode: string) => {
    const query = new URLSearchParams();
    if (activeTab !== "overview") {
      query.set("tab", activeTab);
    }
    if (currencyCode !== "USD") {
      query.set("currency", currencyCode);
    }
    const queryString = query.toString();
    return queryString ? `/dashboard?${queryString}` : "/dashboard";
  };

  return (
    <div className="space-y-6 p-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">{header.title}</h1>
          <p className="mt-1 text-sm text-slate-600">{header.subtitle}</p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div id="dashboard-tabs" className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
          {(individualFeatures.dashboardTasksCalendar
            ? (["overview", "tasks", "calendar"] as DashboardTab[])
            : (["overview"] as DashboardTab[])
          ).map((tabId) => {
            const label = tabId === "overview" ? "Vue d'ensemble" : tabId === "tasks" ? "Tâches" : "Calendrier";
            return (
              <Link
                key={tabId}
                href={getTabHref(tabId)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === tabId
                    ? "bg-[#0063fe] text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {activeTab === "overview" && (
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
            <span className="px-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Devise :</span>
            <Link
              href={getCurrencyHref("USD")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                selectedCurrency === "USD"
                  ? "bg-[#0063fe] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              USD
            </Link>
            <Link
              href={getCurrencyHref("CDF")}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                selectedCurrency === "CDF"
                  ? "bg-[#0063fe] text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              CDF
            </Link>
          </div>
        )}
      </div>
      {activeTab === "overview" ? (
        <>
          {hasNoData ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 py-12 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <svg className="h-8 w-8 text-[#0063fe]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-[#010a19]">Configurez votre espace</h2>
              <p className="mt-2 text-sm text-slate-500">
                Suivez l&apos;assistant : premier bien, locataire, puis bail.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href="/onboarding"
                  className="inline-flex items-center gap-2 rounded-lg bg-[#0063fe] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#0052d4]"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                  Continuer la configuration
                </Link>
              </div>
            </div>
          ) : (
            <>
              <section id="financial-overview" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-3">
                  <div>
                    <h2 className="text-base font-semibold text-[#010a19]">Argent du mois</h2>
                    <p className="mt-1 text-xs text-slate-500">Loyers reçus, dépenses, reste et retards à suivre.</p>
                  </div>
                  <div className="text-xs text-slate-500">Portée: {scopeLabel}</div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Loyers reçus</p>
                    <p className="mt-1 text-lg font-semibold text-[#010a19]">{formatCurrencySummary(metrics.paidTotals)}</p>
                    <p className="mt-1 text-xs text-slate-500">{metrics.paidPaymentCount} paiement(s) payés</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Dépenses</p>
                    <p className="mt-1 text-lg font-semibold text-[#010a19]">{formatCurrencySummary(metrics.expenseTotals)}</p>
                    <p className="mt-1 text-xs text-slate-500">Charges enregistrées</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reste après dépenses</p>
                    <p className="mt-1 text-lg font-semibold text-[#010a19]">{formatCurrencySummary(metrics.netTotals)}</p>
                    <p className="mt-1 text-xs text-slate-500">Loyers - dépenses</p>
                  </div>

                  <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">Loyers en retard</p>
                    <p className="mt-1 text-lg font-semibold text-rose-900">{formatCurrencySummary(metrics.overdueTotals)}</p>
                    <p className="mt-1 text-xs text-rose-700">{metrics.overduePaymentCount} paiement(s) en retard</p>
                  </div>
                </div>

                <div className="mt-5 border-t border-slate-200 pt-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold text-[#010a19]">Qui n&apos;a pas payé</h3>
                    <Link href="/dashboard/payments" className="text-xs font-medium text-[#0063fe] hover:underline">
                      Voir tous les paiements
                    </Link>
                  </div>

                  {metrics.overdueRows.length === 0 ? (
                    <p className="text-sm text-slate-500">Aucun paiement en retard pour le moment.</p>
                  ) : (
                    <ResponsiveTable<OverduePriorityRow>
                      paginate={false}
                      keyExtractor={(row) => row.paymentId}
                      data={metrics.overdueRows}
                      columns={[
                        {
                          header: "Locataire",
                          render: (row) => (
                            <div>
                              <p className="font-medium text-[#010a19]">{row.tenantName}</p>
                              <p className="text-xs text-slate-500">Échéance: {formatIsoDate(row.dueDate)}</p>
                            </div>
                          )
                        },
                        {
                          header: "Logement",
                          render: (row) => <span className="text-slate-700">{row.unitLabel}</span>
                        },
                        {
                          header: "Montant",
                          className: "text-right",
                          render: (row) => (
                            <span className="font-medium text-[#010a19]">
                              {row.amount.toLocaleString("fr-FR")} {row.currencyCode}
                            </span>
                          )
                        },
                        {
                          header: "Jours retard",
                          className: "text-right",
                          render: (row) => (
                            <span className="inline-flex rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800">
                              {row.daysLate} j
                            </span>
                          )
                        }
                      ]}
                      renderMobileCard={(row) => (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold text-[#010a19]">{row.tenantName}</p>
                            <span className="inline-flex rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
                              {row.daysLate} j
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 flex justify-between">
                            <span>Logement: {row.unitLabel}</span>
                            <span>Échéance: {formatIsoDate(row.dueDate)}</span>
                          </div>
                          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                            <span className="text-xs text-slate-400">Montant</span>
                            <span className="font-semibold text-rose-600">
                              {row.amount.toLocaleString("fr-FR")} {row.currencyCode}
                            </span>
                          </div>
                        </div>
                      )}
                    />
                  )}
                </div>
              </section>

              <section id="operational-overview" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-end justify-between gap-4 border-b border-slate-200 pb-3">
                  <div>
                    <h2 className="text-base font-semibold text-[#010a19]">Activité des locations</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {individualFeatures.maintenanceDashboardWidgets
                        ? "Occupation, contrats, réparations et collecte."
                        : "Occupation, contrats et collecte."}
                    </p>
                  </div>
                  {individualFeatures.financeReportsWidgets ? (
                    <Link href="/dashboard/reports" className="text-sm font-medium text-[#0063fe] hover:underline">
                      Ouvrir les rapports
                    </Link>
                  ) : null}
                </div>

                <div className="mt-4 overflow-x-auto pb-1">
                  <div className="grid min-w-215 grid-cols-6 gap-2">
                    {metrics.monthlyTrend.map((bucket) => (
                      <article key={bucket.month} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{bucket.label}</p>
                        <div className="mt-2 space-y-1 text-[11px] leading-4">
                          <p className="text-emerald-700">Loyers: {formatCurrencySummary(bucket.revenueTotals)}</p>
                          <p className="text-slate-600">Dép: {formatCurrencySummary(bucket.expenseTotals)}</p>
                          <p className="font-semibold text-[#010a19]">Reste: {formatCurrencySummary(bucket.netTotals)}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {stats.map((stat) => (
                    <div key={stat.label} className="rounded-lg border border-slate-200 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{stat.label}</p>
                      <p className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-[#010a19]">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className={`mt-5 grid gap-3 border-t border-slate-200 pt-4 ${individualFeatures.maintenanceDashboardWidgets ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                  <div className="rounded-lg border border-slate-200 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Loyers à encaisser</p>
                    <p className="mt-1 text-xl font-semibold text-[#010a19]">{formatCurrencySummary(metrics.pendingTotals)}</p>
                    <p className="mt-1 text-xs text-slate-500">{metrics.pendingPaymentCount} paiement(s) en attente</p>
                  </div>

                  <div className="rounded-lg border border-slate-200 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">% de loyers payés</p>
                    <p className="mt-1 text-xl font-semibold text-[#010a19]">{collectionRate}%</p>
                    <p className="mt-1 text-xs text-slate-500">Part des paiements soldés</p>
                  </div>

                  {individualFeatures.maintenanceDashboardWidgets ? (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Réparations urgentes</p>
                    <p className="mt-1 text-xl font-semibold text-amber-900">{metrics.urgentMaintenanceCount}</p>
                    <p className="mt-1 text-xs text-amber-700">Ticket(s) urgents ouverts/en cours</p>
                  </div>
                  ) : null}
                </div>

                <div className="mt-5 border-t border-slate-200 pt-4">
                  <h3 className="text-sm font-semibold text-[#010a19]">À traiter aujourd&apos;hui</h3>
                  <p className="mt-1 text-xs text-slate-500">Les points urgents de vos locations.</p>
                  <div className={`mt-3 grid gap-3 ${individualFeatures.maintenanceDashboardWidgets ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
                    {individualFeatures.maintenanceDashboardWidgets ? (
                    <article className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-amber-700">Réparations urgentes</p>
                      <p className="mt-1 text-xl font-semibold text-amber-900">{metrics.dailyDigest.urgentMaintenanceCount}</p>
                      <Link href="/dashboard/maintenance" className="mt-2 inline-block text-xs font-medium text-amber-800 hover:underline">
                        Voir les réparations
                      </Link>
                    </article>
                    ) : null}

                    <article className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-rose-700">Loyers en retard</p>
                      <p className="mt-1 text-xl font-semibold text-rose-900">{metrics.dailyDigest.overduePaymentCount}</p>
                      <p className="mt-1 text-xs text-rose-700">Max retard: {metrics.dailyDigest.mostOverdueDays} jour(s)</p>
                      <Link href="/dashboard/payments" className="mt-2 inline-block text-xs font-medium text-rose-800 hover:underline">
                        Lancer les relances
                      </Link>
                    </article>

                    <article className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-700">Contrats bientôt finis (30j)</p>
                      <p className="mt-1 text-xl font-semibold text-blue-900">{metrics.dailyDigest.leasesEndingSoonCount}</p>
                      <p className="mt-1 text-xs text-blue-700">
                        {metrics.dailyDigest.nextLeaseEndDate
                          ? `Prochaine fin: ${formatIsoDate(metrics.dailyDigest.nextLeaseEndDate)}`
                          : "Aucune fin de contrat imminente"}
                      </p>
                      <Link href="/dashboard/leases" className="mt-2 inline-block text-xs font-medium text-blue-800 hover:underline">
                        Préparer les renouvellements
                      </Link>
                    </article>
                  </div>
                </div>
              </section>

              {individualFeatures.financeReportsWidgets ? (
              <section id="quick-reports" className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="text-base font-semibold text-[#010a19]">Rapports rapides</h2>
                <p className="mt-1 text-xs text-slate-500">Accédez aux détails pour agir tout de suite.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Link href="/dashboard/revenues" className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-[#010a19] transition hover:border-[#0063fe] hover:text-[#0063fe]">
                    Loyers détaillés
                  </Link>
                  <Link href="/dashboard/expenses" className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-[#010a19] transition hover:border-[#0063fe] hover:text-[#0063fe]">
                    Dépenses détaillées
                  </Link>
                  <Link href="/dashboard/payments" className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-[#010a19] transition hover:border-[#0063fe] hover:text-[#0063fe]">
                    Paiements et relances
                  </Link>
                  <Link href="/dashboard/maintenance" className="rounded-lg border border-slate-200 px-4 py-3 text-sm font-medium text-[#010a19] transition hover:border-[#0063fe] hover:text-[#0063fe]">
                    File des réparations
                  </Link>
                </div>
              </section>
              ) : null}
            </>
          )}
        </>
      ) : activeTab === "calendar" ? (
        workflowData ? (
          <DashboardCalendar
            organizationId={session.organizationId}
            currentUserId={session.userId}
            entries={workflowData.calendarEntries}
            relatedOptions={workflowData.relatedOptions}
            scopeLabel={scopeLabel}
          />
        ) : null
      ) : (
        workflowData ? (
          <DashboardTasksPanel
            organizationId={session.organizationId}
            currentUserId={session.userId}
            tasks={workflowData.tasks}
            relatedOptions={workflowData.relatedOptions}
          />
        ) : null
      )}
    </div>
  );
}
