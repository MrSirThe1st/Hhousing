import { type QueryResultRow } from "pg";
import { getSharedPool } from "../pg-pool";
import type { Expense } from "@hhousing/domain";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env";
import type {
  CreateExpenseRecordInput,
  DashboardMonthlyTotalRow,
  ExpenseFinanceFilters,
  ExpenseRepository,
  ListExpensesPageInput,
  ListExpensesPageResult,
  SumExpensesResult,
  UpdateExpenseRecordInput
} from "./expense-record.types";

const MAX_PAGE_LIMIT = 50;
const GENERAL_EXPENSE_BUCKET_LABEL = "Organisation générale";

interface ExpenseRow extends QueryResultRow {
  id: string;
  organization_id: string;
  property_id: string | null;
  unit_id: string | null;
  title: string;
  category:
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
  vendor_name: string | null;
  payee_name: string | null;
  amount: string | number;
  currency_code: string;
  expense_date: string | Date;
  note: string | null;
  created_at: Date | string;
}

interface ExpenseLedgerRow extends ExpenseRow {
  property_name: string | null;
  unit_label: string | null;
}

function toNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toIsoDate(value: string | Date): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
}

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    organizationId: row.organization_id,
    propertyId: row.property_id,
    unitId: row.unit_id,
    title: row.title,
    category: row.category,
    vendorName: row.vendor_name,
    payeeName: row.payee_name,
    amount: toNumber(row.amount),
    currencyCode: row.currency_code,
    expenseDate: toIsoDate(row.expense_date),
    note: row.note,
    createdAtIso: toIso(row.created_at)
  };
}

function clampLimit(limit: number | undefined): number {
  if (typeof limit !== "number" || !Number.isFinite(limit) || limit <= 0) {
    return MAX_PAGE_LIMIT;
  }
  return Math.min(Math.floor(limit), MAX_PAGE_LIMIT);
}

function buildExpenseFilterClause(
  filters: ExpenseFinanceFilters,
  startIndex = 1
): { conditions: string[]; values: unknown[]; nextIndex: number } {
  const conditions: string[] = [`e.organization_id = $${startIndex}`];
  const values: unknown[] = [filters.organizationId];
  let index = startIndex + 1;

  conditions.push(`e.expense_date >= $${index++}::date`);
  values.push(filters.from);

  conditions.push(`e.expense_date <= $${index++}::date`);
  values.push(filters.to);

  if (filters.propertyId) {
    conditions.push(`e.property_id = $${index++}`);
    values.push(filters.propertyId);
  }

  if (filters.category) {
    conditions.push(`e.category = $${index++}`);
    values.push(filters.category);
  }

  return { conditions, values, nextIndex: index };
}

function parseCursor(cursor: string | null | undefined): { expenseDate: string; id: string } | null {
  if (!cursor) {
    return null;
  }
  const separator = cursor.indexOf("|");
  if (separator <= 0 || separator === cursor.length - 1) {
    return null;
  }
  const expenseDate = cursor.slice(0, separator);
  const id = cursor.slice(separator + 1);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expenseDate) || id.length === 0) {
    return null;
  }
  return { expenseDate, id };
}

export interface ExpenseQueryable {
  query<Row extends QueryResultRow>(
    text: string,
    values?: readonly unknown[]
  ): Promise<{ rows: Row[]; rowCount?: number | null }>;
}

export function createPostgresExpenseRepository(client: ExpenseQueryable): ExpenseRepository {
  return {
    async createExpense(input: CreateExpenseRecordInput): Promise<Expense> {
      const result = await client.query<ExpenseRow>(
        `insert into expenses (
           id, organization_id, property_id, unit_id, title, category,
           vendor_name, payee_name, amount, currency_code, expense_date, note
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         returning
           id, organization_id, property_id, unit_id, title, category,
           vendor_name, payee_name, amount, currency_code, expense_date, note, created_at`,
        [
          input.id,
          input.organizationId,
          input.propertyId,
          input.unitId,
          input.title,
          input.category,
          input.vendorName,
          input.payeeName,
          input.amount,
          input.currencyCode,
          input.expenseDate,
          input.note
        ]
      );

      return mapExpense(result.rows[0]);
    },

    async getExpenseById(id: string, organizationId: string): Promise<Expense | null> {
      const result = await client.query<ExpenseRow>(
        `select
            id, organization_id, property_id, unit_id, title, category,
           vendor_name, payee_name, amount, currency_code, expense_date, note, created_at
         from expenses
         where id = $1 and organization_id = $2
         limit 1`,
        [id, organizationId]
      );

      return result.rows[0] ? mapExpense(result.rows[0]) : null;
    },

    async listExpenses(filter): Promise<Expense[]> {
      const page = await this.listExpensesPage({
        organizationId: filter.organizationId,
        from: filter.from ?? "1970-01-01",
        to: filter.to ?? "2999-12-31",
        propertyId: filter.propertyId ?? null,
        category: filter.category,
        limit: clampLimit(filter.limit),
        cursor: null
      });
      return page.rows.map((row) => row.expense);
    },

    async listExpensesPage(input: ListExpensesPageInput): Promise<ListExpensesPageResult> {
      const limit = clampLimit(input.limit);
      const { conditions, values, nextIndex } = buildExpenseFilterClause(input);
      let index = nextIndex;
      const cursor = parseCursor(input.cursor ?? null);

      if (cursor) {
        conditions.push(
          `(e.expense_date, e.id) < ($${index++}::date, $${index++})`
        );
        values.push(cursor.expenseDate, cursor.id);
      }

      values.push(limit + 1);
      const limitParam = `$${index}`;

      const result = await client.query<ExpenseLedgerRow>(
        `select
           e.id, e.organization_id, e.property_id, e.unit_id, e.title, e.category,
           e.vendor_name, e.payee_name, e.amount, e.currency_code, e.expense_date, e.note, e.created_at,
           coalesce(p.name, $$${GENERAL_EXPENSE_BUCKET_LABEL}$$) as property_name,
           u.unit_number as unit_label
         from expenses e
         left join properties p on p.id = e.property_id
         left join units u on u.id = e.unit_id
         where ${conditions.join(" and ")}
         order by e.expense_date desc, e.id desc
         limit ${limitParam}`,
        values
      );

      const hasMore = result.rows.length > limit;
      const sliced = hasMore ? result.rows.slice(0, limit) : result.rows;
      const last = sliced[sliced.length - 1];
      const nextCursor =
        hasMore && last
          ? `${toIsoDate(last.expense_date)}|${last.id}`
          : null;

      return {
        rows: sliced.map((row) => ({
          expense: mapExpense(row),
          propertyName: row.property_name ?? GENERAL_EXPENSE_BUCKET_LABEL,
          unitLabel: row.unit_label
        })),
        nextCursor
      };
    },

    async sumExpenses(filters: ExpenseFinanceFilters): Promise<SumExpensesResult> {
      const { conditions, values } = buildExpenseFilterClause(filters);
      const where = conditions.join(" and ");

      // Sequential: avoid opening 3 pool connections at once.
      const totalsResult = await client.query<{
        currency_code: string;
        amount: string | number;
        expense_count: string | number;
      }>(
        `select
           e.currency_code,
           coalesce(sum(e.amount), 0) as amount,
           count(*)::int as expense_count
         from expenses e
         where ${where}
         group by e.currency_code
         order by e.currency_code`,
        values
      );
      const propertyResult = await client.query<{
        property_id: string | null;
        property_name: string | null;
        currency_code: string;
        amount: string | number;
        expense_count: string | number;
      }>(
        `select
           e.property_id,
           coalesce(p.name, '${GENERAL_EXPENSE_BUCKET_LABEL}') as property_name,
           e.currency_code,
           coalesce(sum(e.amount), 0) as amount,
           count(*)::int as expense_count
         from expenses e
         left join properties p on p.id = e.property_id
         where ${where}
         group by e.property_id, p.name, e.currency_code
         order by coalesce(p.name, '${GENERAL_EXPENSE_BUCKET_LABEL}')`,
        values
      );
      const monthlyResult = await client.query<{
        month: string;
        currency_code: string;
        amount: string | number;
      }>(
        `select
           to_char(date_trunc('month', e.expense_date), 'YYYY-MM') as month,
           e.currency_code,
           coalesce(sum(e.amount), 0) as amount
         from expenses e
         where ${where}
         group by date_trunc('month', e.expense_date), e.currency_code
         order by date_trunc('month', e.expense_date), e.currency_code`,
        values
      );

      const totals = totalsResult.rows.map((row) => ({
        currencyCode: row.currency_code,
        amount: toNumber(row.amount)
      }));

      const recordedExpenseCount = totalsResult.rows.reduce(
        (sum, row) => sum + toNumber(row.expense_count),
        0
      );

      const propertyMap = new Map<
        string,
        {
          propertyId: string | null;
          propertyName: string;
          expenseCount: number;
          totals: Map<string, number>;
        }
      >();

      for (const row of propertyResult.rows) {
        const key = row.property_id ?? "general";
        const entry = propertyMap.get(key) ?? {
          propertyId: row.property_id,
          propertyName: row.property_name ?? GENERAL_EXPENSE_BUCKET_LABEL,
          expenseCount: 0,
          totals: new Map<string, number>()
        };
        entry.expenseCount += toNumber(row.expense_count);
        entry.totals.set(
          row.currency_code,
          (entry.totals.get(row.currency_code) ?? 0) + toNumber(row.amount)
        );
        propertyMap.set(key, entry);
      }

      const propertyExpenses = [...propertyMap.values()].map((entry) => ({
        propertyId: entry.propertyId,
        propertyName: entry.propertyName,
        expenseCount: entry.expenseCount,
        totals: [...entry.totals.entries()]
          .map(([currencyCode, amount]) => ({ currencyCode, amount }))
          .sort((left, right) => left.currencyCode.localeCompare(right.currencyCode, "fr"))
      }));

      const monthlyMap = new Map<string, Map<string, number>>();
      for (const row of monthlyResult.rows) {
        const month = row.month.slice(0, 7);
        const monthTotals = monthlyMap.get(month) ?? new Map<string, number>();
        monthTotals.set(
          row.currency_code,
          (monthTotals.get(row.currency_code) ?? 0) + toNumber(row.amount)
        );
        monthlyMap.set(month, monthTotals);
      }

      const monthlyExpenses = [...monthlyMap.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([month, summary]) => ({
          month,
          totals: [...summary.entries()]
            .map(([currencyCode, amount]) => ({ currencyCode, amount }))
            .sort((left, right) => left.currencyCode.localeCompare(right.currencyCode, "fr"))
        }));

      return {
        totals,
        recordedExpenseCount,
        propertyExpenses,
        monthlyExpenses
      };
    },

    async updateExpense(input: UpdateExpenseRecordInput): Promise<Expense | null> {
      const result = await client.query<ExpenseRow>(
        `update expenses
         set
           property_id = $3,
           unit_id = $4,
           title = $5,
           category = $6,
           vendor_name = $7,
           payee_name = $8,
           amount = $9,
           currency_code = $10,
           expense_date = $11,
           note = $12
         where id = $1 and organization_id = $2
         returning
           id, organization_id, property_id, unit_id, title, category,
           vendor_name, payee_name, amount, currency_code, expense_date, note, created_at`,
        [
          input.id,
          input.organizationId,
          input.propertyId,
          input.unitId,
          input.title,
          input.category,
          input.vendorName,
          input.payeeName,
          input.amount,
          input.currencyCode,
          input.expenseDate,
          input.note
        ]
      );

      return result.rows[0] ? mapExpense(result.rows[0]) : null;
    },

    async deleteExpense(id: string, organizationId: string): Promise<boolean> {
      const result = await client.query(
        `delete from expenses
         where id = $1 and organization_id = $2`,
        [id, organizationId]
      );

      return (result.rowCount ?? 0) > 0;
    },

    async getDashboardExpenseMonthSum(
      organizationId: string,
      currencyCode: string,
      monthStart: string,
      monthEndExclusive: string
    ): Promise<number> {
      const result = await client.query<{ amount: string | number | null }>(
        `select coalesce(sum(amount), 0) as amount
         from expenses
         where organization_id = $1
           and currency_code = $2
           and expense_date >= $3::date
           and expense_date < $4::date`,
        [organizationId, currencyCode, monthStart, monthEndExclusive]
      );

      return toNumber(result.rows[0]?.amount ?? 0);
    },

    async sumExpensesByMonth(
      organizationId: string,
      currencyCode: string,
      fromDate: string
    ): Promise<DashboardMonthlyTotalRow[]> {
      const result = await client.query<{
        month: string | Date;
        amount: string | number;
      }>(
        `select
           to_char(date_trunc('month', expense_date), 'YYYY-MM') as month,
           coalesce(sum(amount), 0) as amount
         from expenses
         where organization_id = $1
           and currency_code = $2
           and expense_date >= $3::date
         group by date_trunc('month', expense_date)
         order by date_trunc('month', expense_date)`,
        [organizationId, currencyCode, fromDate]
      );

      return result.rows.map((row) => ({
        month:
          typeof row.month === "string"
            ? row.month.slice(0, 7)
            : toIsoDate(row.month).slice(0, 7),
        amount: toNumber(row.amount)
      }));
    }
  };
}

export function createExpenseRepositoryFromEnv(env: DatabaseEnvSource): ExpenseRepository {
  const envResult = readDatabaseEnv(env);
  if (!envResult.success) {
    throw new Error(envResult.error);
  }

  const pool = getSharedPool(envResult.data.connectionString);
  return createPostgresExpenseRepository(pool);
}
