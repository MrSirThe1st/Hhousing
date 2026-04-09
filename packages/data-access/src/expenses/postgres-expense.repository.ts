import { Pool, type QueryResultRow } from "pg";
import type { ListExpensesFilter } from "@hhousing/api-contracts";
import type { Expense } from "@hhousing/domain";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env";
import type {
  CreateExpenseRecordInput,
  ExpenseRepository,
  UpdateExpenseRecordInput
} from "./expense-record.types";

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

export interface ExpenseQueryable {
  query<Row extends QueryResultRow>(
    text: string,
    values?: readonly unknown[]
  ): Promise<{ rows: Row[]; rowCount?: number | null }>;
}

const poolCache = new Map<string, Pool>();

function getOrCreatePool(connectionString: string): Pool {
  const existing = poolCache.get(connectionString);
  if (existing) return existing;
  const pool = new Pool({ connectionString, max: 5 });
  poolCache.set(connectionString, pool);
  return pool;
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

    async listExpenses(filter: ListExpensesFilter): Promise<Expense[]> {
      const conditions: string[] = ["organization_id = $1"];
      const values: unknown[] = [filter.organizationId];
      let index = 2;

      if (filter.propertyId !== undefined) {
        conditions.push(`property_id = $${index++}`);
        values.push(filter.propertyId);
      }

      if (filter.category !== undefined) {
        conditions.push(`category = $${index++}`);
        values.push(filter.category);
      }

      const result = await client.query<ExpenseRow>(
        `select
            id, organization_id, property_id, unit_id, title, category,
           vendor_name, payee_name, amount, currency_code, expense_date, note, created_at
         from expenses
         where ${conditions.join(" and ")}
         order by expense_date desc, created_at desc`,
        values
      );

      return result.rows.map(mapExpense);
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
    }
  };
}

export function createExpenseRepositoryFromEnv(env: DatabaseEnvSource): ExpenseRepository {
  const envResult = readDatabaseEnv(env);
  if (!envResult.success) {
    throw new Error(envResult.error);
  }

  const pool = getOrCreatePool(envResult.data.connectionString);
  return createPostgresExpenseRepository(pool);
}