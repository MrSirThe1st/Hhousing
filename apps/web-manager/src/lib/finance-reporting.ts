import type { AuthSession } from "@hhousing/api-contracts";
import { listExpenses, listPayments } from "../api";
import { createExpenseRepo, createPaymentRepo, createTeamFunctionsRepo } from "../app/api/shared";
import type { Expense, ExpenseCategory, Payment } from "@hhousing/domain";
import { filterExpensesByScope, filterPaymentsByScope, getScopedPortfolioData, type ScopedPortfolioData } from "./operator-scope-portfolio";
import { getNow } from "./time";
import type {
  CurrencyTotal,
  ExpenseDataset,
  ExpenseLedgerEntry,
  FinanceNetMonthlyBucket,
  FinanceFilters,
  FinanceMonthlyBucket,
  FinancePropertyOption,
  PropertyFinanceSummary,
  PropertyExpenseSummary,
  PropertyRevenueSummary,
  RevenueDataset,
  RevenueLedgerEntry
} from "./finance-reporting.types";

const GENERAL_EXPENSE_BUCKET_LABEL = "Organisation générale";

function isIsoDate(value: string | undefined): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function startOfMonthMonthsAgo(monthsAgo: number): string {
  const today = getNow();
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - monthsAgo, 1))
    .toISOString()
    .slice(0, 10);
}

function endOfCurrentMonth(): string {
  const today = getNow();
  return new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0))
    .toISOString()
    .slice(0, 10);
}

function addAmount(summary: Map<string, number>, currencyCode: string, amount: number): void {
  summary.set(currencyCode, (summary.get(currencyCode) ?? 0) + amount);
}

function toCurrencyTotals(summary: Map<string, number>): CurrencyTotal[] {
  return [...summary.entries()]
    .map(([currencyCode, amount]) => ({ currencyCode, amount }))
    .sort((left, right) => left.currencyCode.localeCompare(right.currencyCode, "fr"));
}

function formatMonthLabel(month: string): string {
  const year = Number(month.slice(0, 4));
  const monthIndex = Number(month.slice(5, 7)) - 1;

  return new Intl.DateTimeFormat("fr-FR", {
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(Date.UTC(year, monthIndex, 1)));
}

function getPropertyOptions(scopedPortfolio: ScopedPortfolioData): FinancePropertyOption[] {
  return scopedPortfolio.properties
    .map((item) => ({ id: item.property.id, name: item.property.name }))
    .sort((left, right) => left.name.localeCompare(right.name, "fr"));
}

function getPropertyUnitOptions(scopedPortfolio: ScopedPortfolioData): ExpenseDataset["propertyUnitOptions"] {
  return scopedPortfolio.properties
    .map((item) => ({
      propertyId: item.property.id,
      propertyName: item.property.name,
      units: item.units
        .map((unit) => ({ id: unit.id, label: unit.unitNumber }))
        .sort((left, right) => left.label.localeCompare(right.label, "fr"))
    }))
    .sort((left, right) => left.propertyName.localeCompare(right.propertyName, "fr"));
}

export function normalizeFinanceFilters(searchParams: Record<string, string | string[] | undefined> | undefined): FinanceFilters {
  const propertyValue = searchParams?.propertyId;
  const fromValue = searchParams?.from;
  const toValue = searchParams?.to;
  const propertyId = typeof propertyValue === "string" && propertyValue.trim().length > 0 ? propertyValue : null;
  const from = typeof fromValue === "string" && isIsoDate(fromValue) ? fromValue : startOfMonthMonthsAgo(5);
  const to = typeof toValue === "string" && isIsoDate(toValue) ? toValue : endOfCurrentMonth();

  if (from <= to) {
    return { propertyId, from, to };
  }

  return { propertyId, from: to, to: from };
}

export function formatCurrencySummary(totals: CurrencyTotal[]): string {
  if (totals.length === 0) {
    return "0";
  }

  return totals
    .map((item) => `${item.amount.toLocaleString("fr-FR")} ${item.currencyCode}`)
    .join(" • ");
}

export function formatExpenseCategory(category: ExpenseCategory): string {
  switch (category) {
    case "maintenance":
      return "Maintenance";
    case "utilities":
      return "Utilités";
    case "taxes":
      return "Taxes";
    case "insurance":
      return "Assurance";
    case "supplies":
      return "Fournitures";
    case "payroll":
      return "Paie";
    case "cleaning":
      return "Nettoyage";
    case "security":
      return "Sécurité";
    case "legal":
      return "Juridique";
    case "marketing":
      return "Marketing";
    case "admin":
      return "Administration";
    case "other":
      return "Autre";
    default:
      return category;
  }
}

export function buildFinanceQueryString(
  filters: FinanceFilters,
  extras?: Record<string, string | null | undefined>
): string {
  const params = new URLSearchParams();

  if (filters.propertyId) {
    params.set("propertyId", filters.propertyId);
  }

  params.set("from", filters.from);
  params.set("to", filters.to);

  if (extras) {
    for (const [key, value] of Object.entries(extras)) {
      if (typeof value === "string" && value.length > 0) {
        params.set(key, value);
      }
    }
  }

  return params.toString();
}

export function subtractCurrencyTotals(minuend: CurrencyTotal[], subtrahend: CurrencyTotal[]): CurrencyTotal[] {
  const result = new Map<string, number>();

  for (const item of minuend) {
    result.set(item.currencyCode, item.amount);
  }

  for (const item of subtrahend) {
    result.set(item.currencyCode, (result.get(item.currencyCode) ?? 0) - item.amount);
  }

  return toCurrencyTotals(result).filter((item) => item.amount !== 0);
}

function toTotalsMap(totals: CurrencyTotal[]): Map<string, number> {
  return new Map(totals.map((item) => [item.currencyCode, item.amount]));
}

export function buildMonthlyNetBuckets(
  revenueDataset: RevenueDataset,
  expenseDataset: ExpenseDataset
): FinanceNetMonthlyBucket[] {
  const monthKeys = new Set<string>([
    ...revenueDataset.monthlyRevenue.map((item) => item.month),
    ...expenseDataset.monthlyExpenses.map((item) => item.month)
  ]);

  return [...monthKeys]
    .sort((left, right) => left.localeCompare(right))
    .map((month) => {
      const revenue = revenueDataset.monthlyRevenue.find((item) => item.month === month);
      const expense = expenseDataset.monthlyExpenses.find((item) => item.month === month);

      return {
        month,
        label: formatMonthLabel(month),
        revenueTotals: revenue?.totals ?? [],
        expenseTotals: expense?.totals ?? [],
        netTotals: subtractCurrencyTotals(revenue?.totals ?? [], expense?.totals ?? [])
      };
    });
}

export function buildPropertyFinanceSummary(
  revenueDataset: RevenueDataset,
  expenseDataset: ExpenseDataset
): PropertyFinanceSummary[] {
  const propertyKeys = new Set<string>([
    ...revenueDataset.propertyRevenue.map((property) => property.propertyId),
    ...expenseDataset.propertyExpenses.map((property) => property.propertyId ?? "general")
  ]);

  return [...propertyKeys]
    .map((propertyKey) => {
      const revenue = revenueDataset.propertyRevenue.find((item) => item.propertyId === propertyKey);
      const expense = expenseDataset.propertyExpenses.find((item) => (item.propertyId ?? "general") === propertyKey);
      const propertyId = propertyKey === "general" ? null : propertyKey;

      return {
        propertyId,
        propertyName: revenue?.propertyName ?? expense?.propertyName ?? GENERAL_EXPENSE_BUCKET_LABEL,
        paymentCount: revenue?.paymentCount ?? 0,
        expenseCount: expense?.expenseCount ?? 0,
        revenueTotals: revenue?.totals ?? [],
        expenseTotals: expense?.totals ?? [],
        netTotals: subtractCurrencyTotals(revenue?.totals ?? [], expense?.totals ?? [])
      };
    })
    .sort((left, right) => left.propertyName.localeCompare(right.propertyName, "fr"));
}

function escapeCsvCell(value: string | number | null): string {
  if (value === null) {
    return "";
  }

  const text = String(value);
  if (!text.includes(",") && !text.includes("\n") && !text.includes("\"")) {
    return text;
  }

  return `"${text.replace(/\"/g, '""')}"`;
}

export function buildFinanceReportCsv(
  revenueDataset: RevenueDataset,
  expenseDataset: ExpenseDataset
): string {
  const lines: string[] = [
    [
      "section",
      "scope",
      "label",
      "metric",
      "currency",
      "amount",
      "count",
      "date",
      "unit",
      "category",
      "vendor",
      "payee",
      "note"
    ].join(",")
  ];

  const propertySummary = buildPropertyFinanceSummary(revenueDataset, expenseDataset);
  const monthlySummary = buildMonthlyNetBuckets(revenueDataset, expenseDataset);

  const summaryRows = [
    ["summary", "portfolio", "revenus", "total", formatCurrencySummary(revenueDataset.revenueTotals), "", "", "", "", "", "", "", ""],
    ["summary", "portfolio", "depots_passif", "total", formatCurrencySummary(revenueDataset.depositLiabilityTotals), "", "", "", "", "", "", "", ""],
    ["summary", "portfolio", "depenses", "total", formatCurrencySummary(expenseDataset.expenseTotals), "", "", "", "", "", "", "", ""],
    [
      "summary",
      "portfolio",
      "net",
      "total",
      formatCurrencySummary(subtractCurrencyTotals(revenueDataset.revenueTotals, expenseDataset.expenseTotals)),
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      ""
    ]
  ];

  for (const row of summaryRows) {
    lines.push(row.map((cell) => escapeCsvCell(cell)).join(","));
  }

  for (const month of monthlySummary) {
    const totalsByCurrency = new Set([
      ...toTotalsMap(month.revenueTotals).keys(),
      ...toTotalsMap(month.expenseTotals).keys(),
      ...toTotalsMap(month.netTotals).keys()
    ]);

    const revenueMap = toTotalsMap(month.revenueTotals);
    const expenseMap = toTotalsMap(month.expenseTotals);
    const netMap = toTotalsMap(month.netTotals);

    for (const currencyCode of totalsByCurrency) {
      lines.push([
        "monthly",
        month.month,
        month.label,
        "revenus",
        currencyCode,
        revenueMap.get(currencyCode) ?? 0,
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ].map((cell) => escapeCsvCell(cell)).join(","));
      lines.push([
        "monthly",
        month.month,
        month.label,
        "depenses",
        currencyCode,
        expenseMap.get(currencyCode) ?? 0,
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ].map((cell) => escapeCsvCell(cell)).join(","));
      lines.push([
        "monthly",
        month.month,
        month.label,
        "net",
        currencyCode,
        netMap.get(currencyCode) ?? 0,
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ].map((cell) => escapeCsvCell(cell)).join(","));
    }
  }

  for (const property of propertySummary) {
    const totalsByCurrency = new Set([
      ...toTotalsMap(property.revenueTotals).keys(),
      ...toTotalsMap(property.expenseTotals).keys(),
      ...toTotalsMap(property.netTotals).keys()
    ]);

    const revenueMap = toTotalsMap(property.revenueTotals);
    const expenseMap = toTotalsMap(property.expenseTotals);
    const netMap = toTotalsMap(property.netTotals);

    for (const currencyCode of totalsByCurrency) {
      lines.push([
        "property",
        property.propertyId ?? "general",
        property.propertyName,
        "revenus",
        currencyCode,
        revenueMap.get(currencyCode) ?? 0,
        property.paymentCount,
        "",
        "",
        "",
        "",
        "",
        ""
      ].map((cell) => escapeCsvCell(cell)).join(","));
      lines.push([
        "property",
        property.propertyId ?? "general",
        property.propertyName,
        "depenses",
        currencyCode,
        expenseMap.get(currencyCode) ?? 0,
        property.expenseCount,
        "",
        "",
        "",
        "",
        "",
        ""
      ].map((cell) => escapeCsvCell(cell)).join(","));
      lines.push([
        "property",
        property.propertyId ?? "general",
        property.propertyName,
        "net",
        currencyCode,
        netMap.get(currencyCode) ?? 0,
        "",
        "",
        "",
        "",
        "",
        "",
        ""
      ].map((cell) => escapeCsvCell(cell)).join(","));
    }
  }

  for (const payment of revenueDataset.ledger) {
    lines.push([
      "revenue_ledger",
      payment.propertyId ?? "unmapped",
      payment.propertyName,
      payment.paymentKind,
      payment.currencyCode,
      payment.amount,
      "",
      payment.paidDate,
      payment.unitNumber,
      "",
      "",
      payment.tenantName,
      payment.note
    ].map((cell) => escapeCsvCell(cell)).join(","));
  }

  for (const expense of expenseDataset.ledger) {
    lines.push([
      "expense_ledger",
      expense.propertyId ?? "general",
      expense.propertyName,
      expense.title,
      expense.currencyCode,
      expense.amount,
      "",
      expense.expenseDate,
      expense.unitLabel,
      expense.category,
      expense.vendorName,
      expense.payeeName,
      expense.note
    ].map((cell) => escapeCsvCell(cell)).join(","));
  }

  return lines.join("\n");
}

export async function loadScopedFinanceData(
  session: AuthSession
): Promise<{ payments: Payment[]; expenses: Expense[]; scopedPortfolio: ScopedPortfolioData }> {
  const paymentRepo = createPaymentRepo();
  const expenseRepo = createExpenseRepo();
  const teamFunctionsRepo = createTeamFunctionsRepo();
  const [paymentsResult, expensesResult, scopedPortfolio] = await Promise.all([
    listPayments(
      { session, organizationId: session.organizationId ?? "", leaseId: null, status: null },
      { repository: paymentRepo, teamFunctionsRepository: teamFunctionsRepo }
    ),
    listExpenses(
      { session, organizationId: session.organizationId ?? "", propertyId: null, category: null },
      { repository: expenseRepo, teamFunctionsRepository: teamFunctionsRepo }
    ),
    getScopedPortfolioData(session)
  ]);

  return {
    payments: paymentsResult.body.success
      ? filterPaymentsByScope(paymentsResult.body.data.payments, scopedPortfolio)
      : [],
    expenses: expensesResult.body.success
      ? filterExpensesByScope(expensesResult.body.data.expenses, scopedPortfolio)
      : [],
    scopedPortfolio
  };
}

export async function loadScopedPayments(session: AuthSession): Promise<{ payments: Payment[]; scopedPortfolio: ScopedPortfolioData }> {
  const data = await loadScopedFinanceData(session);
  return { payments: data.payments, scopedPortfolio: data.scopedPortfolio };
}

export function buildRevenueDataset(
  payments: Payment[],
  scopedPortfolio: ScopedPortfolioData,
  filters: FinanceFilters
): RevenueDataset {
  const propertyOptions = getPropertyOptions(scopedPortfolio);

  const propertyByUnitId = new Map(
    scopedPortfolio.properties.flatMap((item) => item.units.map((unit) => [unit.id, {
      propertyId: item.property.id,
      propertyName: item.property.name,
      unitNumber: unit.unitNumber
    }]))
  );
  const leaseById = new Map(scopedPortfolio.leases.map((lease) => [lease.id, lease]));

  const paidLedger: RevenueLedgerEntry[] = payments
    .filter((payment) => payment.status === "paid" && payment.paidDate !== null)
    .map((payment) => {
      const lease = leaseById.get(payment.leaseId);
      const propertyUnit = lease ? propertyByUnitId.get(lease.unitId) : undefined;

      return {
        paymentId: payment.id,
        propertyId: propertyUnit?.propertyId ?? null,
        propertyName: propertyUnit?.propertyName ?? "Portefeuille hors mapping",
        unitNumber: propertyUnit?.unitNumber ?? "-",
        tenantName: lease?.tenantFullName ?? `Locataire ${payment.tenantId}`,
        paidDate: payment.paidDate as string,
        dueDate: payment.dueDate,
        paymentKind: payment.paymentKind,
        currencyCode: payment.currencyCode,
        amount: payment.amount,
        note: payment.note
      };
    })
    .filter((entry) => entry.paidDate >= filters.from && entry.paidDate <= filters.to)
    .filter((entry) => filters.propertyId === null || entry.propertyId === filters.propertyId)
    .sort((left, right) => {
      if (left.paidDate === right.paidDate) {
        return right.amount - left.amount;
      }

      return right.paidDate.localeCompare(left.paidDate);
    });

  const depositLedger = paidLedger.filter((entry) => entry.paymentKind === "deposit");
  const ledger = paidLedger.filter((entry) => entry.paymentKind !== "deposit");

  const revenueSummary = new Map<string, number>();
  const depositLiabilitySummary = new Map<string, number>();
  const monthlySummary = new Map<string, Map<string, number>>();
  const propertySummary = new Map<string, { propertyId: string; propertyName: string; paymentCount: number; totals: Map<string, number> }>();

  for (const entry of ledger) {
    addAmount(revenueSummary, entry.currencyCode, entry.amount);

    const month = entry.paidDate.slice(0, 7);
    const monthSummary = monthlySummary.get(month) ?? new Map<string, number>();
    addAmount(monthSummary, entry.currencyCode, entry.amount);
    monthlySummary.set(month, monthSummary);

    if (entry.propertyId !== null) {
      const propertyEntry = propertySummary.get(entry.propertyId) ?? {
        propertyId: entry.propertyId,
        propertyName: entry.propertyName,
        paymentCount: 0,
        totals: new Map<string, number>()
      };
      propertyEntry.paymentCount += 1;
      addAmount(propertyEntry.totals, entry.currencyCode, entry.amount);
      propertySummary.set(entry.propertyId, propertyEntry);
    }
  }

  for (const entry of depositLedger) {
    addAmount(depositLiabilitySummary, entry.currencyCode, entry.amount);
  }

  const monthlyRevenue: FinanceMonthlyBucket[] = [...monthlySummary.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, summary]) => ({
      month,
      label: formatMonthLabel(month),
      totals: toCurrencyTotals(summary)
    }));

  const propertyRevenue: PropertyRevenueSummary[] = [...propertySummary.values()]
    .map((item) => ({
      propertyId: item.propertyId,
      propertyName: item.propertyName,
      paymentCount: item.paymentCount,
      totals: toCurrencyTotals(item.totals)
    }))
    .sort((left, right) => left.propertyName.localeCompare(right.propertyName, "fr"));

  return {
    filters,
    propertyOptions,
    revenueTotals: toCurrencyTotals(revenueSummary),
    depositLiabilityTotals: toCurrencyTotals(depositLiabilitySummary),
    monthlyRevenue,
    propertyRevenue,
    ledger,
    recordedPaymentCount: ledger.length,
    recordedDepositCount: depositLedger.length
  };
}

export function buildExpenseDataset(
  expenses: Expense[],
  scopedPortfolio: ScopedPortfolioData,
  filters: FinanceFilters
): ExpenseDataset {
  const propertyOptions = getPropertyOptions(scopedPortfolio);
  const propertyUnitOptions = getPropertyUnitOptions(scopedPortfolio);
  const propertyById = new Map(scopedPortfolio.properties.map((item) => [item.property.id, item.property.name]));
  const unitById = new Map(
    scopedPortfolio.properties.flatMap((item) => item.units.map((unit) => [unit.id, unit.unitNumber]))
  );

  const ledger: ExpenseLedgerEntry[] = expenses
    .map((expense) => ({
      expenseId: expense.id,
      propertyId: expense.propertyId,
      propertyName: expense.propertyId ? propertyById.get(expense.propertyId) ?? GENERAL_EXPENSE_BUCKET_LABEL : GENERAL_EXPENSE_BUCKET_LABEL,
      unitId: expense.unitId,
      unitLabel: expense.unitId ? unitById.get(expense.unitId) ?? expense.unitId : null,
      title: expense.title,
      category: expense.category,
      vendorName: expense.vendorName,
      payeeName: expense.payeeName,
      expenseDate: expense.expenseDate,
      currencyCode: expense.currencyCode,
      amount: expense.amount,
      note: expense.note
    }))
    .filter((entry) => entry.expenseDate >= filters.from && entry.expenseDate <= filters.to)
    .filter((entry) => filters.propertyId === null || entry.propertyId === filters.propertyId)
    .sort((left, right) => {
      if (left.expenseDate === right.expenseDate) {
        return right.amount - left.amount;
      }

      return right.expenseDate.localeCompare(left.expenseDate);
    });

  const expenseSummary = new Map<string, number>();
  const monthlySummary = new Map<string, Map<string, number>>();
  const propertySummary = new Map<string, { propertyId: string | null; propertyName: string; expenseCount: number; totals: Map<string, number> }>();

  for (const entry of ledger) {
    addAmount(expenseSummary, entry.currencyCode, entry.amount);

    const month = entry.expenseDate.slice(0, 7);
    const monthSummary = monthlySummary.get(month) ?? new Map<string, number>();
    addAmount(monthSummary, entry.currencyCode, entry.amount);
    monthlySummary.set(month, monthSummary);

    const propertyKey = entry.propertyId ?? "general";
    const propertyEntry = propertySummary.get(propertyKey) ?? {
      propertyId: entry.propertyId,
      propertyName: entry.propertyName,
      expenseCount: 0,
      totals: new Map<string, number>()
    };
    propertyEntry.expenseCount += 1;
    addAmount(propertyEntry.totals, entry.currencyCode, entry.amount);
    propertySummary.set(propertyKey, propertyEntry);
  }

  const monthlyExpenses: FinanceMonthlyBucket[] = [...monthlySummary.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([month, summary]) => ({
      month,
      label: formatMonthLabel(month),
      totals: toCurrencyTotals(summary)
    }));

  const propertyExpenses: PropertyExpenseSummary[] = [...propertySummary.values()]
    .map((item) => ({
      propertyId: item.propertyId,
      propertyName: item.propertyName,
      expenseCount: item.expenseCount,
      totals: toCurrencyTotals(item.totals)
    }))
    .sort((left, right) => left.propertyName.localeCompare(right.propertyName, "fr"));

  return {
    filters,
    propertyOptions,
    propertyUnitOptions,
    expenseTotals: toCurrencyTotals(expenseSummary),
    monthlyExpenses,
    propertyExpenses,
    ledger,
    recordedExpenseCount: ledger.length
  };
}