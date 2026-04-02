import { Pool, type QueryResultRow } from "pg";
import type { Payment } from "@hhousing/domain";
import type { ListPaymentsFilter } from "@hhousing/api-contracts";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env";
import type {
  CreatePaymentRecordInput,
  MarkPaymentPaidRecordInput,
  PaymentRepository
} from "./payment-record.types";

interface PaymentRow extends QueryResultRow {
  id: string;
  organization_id: string;
  lease_id: string;
  tenant_id: string;
  amount: string | number;
  currency_code: string;
  due_date: string | Date;
  paid_date: string | Date | null;
  status: "pending" | "paid" | "overdue" | "cancelled";
  note: string | null;
  charge_period: string | null;
  created_at: Date | string;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

function toIsoDate(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().substring(0, 10);
  }
  return value.substring(0, 10);
}

function mapPayment(row: PaymentRow): Payment {
  return {
    id: row.id,
    organizationId: row.organization_id,
    leaseId: row.lease_id,
    tenantId: row.tenant_id,
    amount: toNumber(row.amount),
    currencyCode: row.currency_code,
    dueDate: toIsoDate(row.due_date),
    paidDate: row.paid_date ? toIsoDate(row.paid_date) : null,
    status: row.status,
    note: row.note,
    chargePeriod: row.charge_period ?? null,
    createdAtIso: toIso(row.created_at)
  };
}

export interface PaymentQueryable {
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

export function createPostgresPaymentRepository(
  client: PaymentQueryable
): PaymentRepository {
  return {
    async createPayment(input: CreatePaymentRecordInput): Promise<Payment> {
      const result = await client.query<PaymentRow>(
        `insert into payments (
          id, organization_id, lease_id, tenant_id,
          amount, currency_code, due_date, note
        ) values ($1, $2, $3, $4, $5, $6, $7, $8)
        returning
          id, organization_id, lease_id, tenant_id,
          amount, currency_code, due_date, paid_date, status, note, charge_period, created_at`,
        [
          input.id,
          input.organizationId,
          input.leaseId,
          input.tenantId,
          input.amount,
          input.currencyCode,
          input.dueDate,
          input.note
        ]
      );
      return mapPayment(result.rows[0]);
    },

    async markPaymentPaid(input: MarkPaymentPaidRecordInput): Promise<Payment | null> {
      const result = await client.query<PaymentRow>(
        `update payments
         set status = 'paid', paid_date = $1
         where id = $2 and organization_id = $3 and status != 'cancelled'
         returning
           id, organization_id, lease_id, tenant_id,
           amount, currency_code, due_date, paid_date, status, note, charge_period, created_at`,
        [input.paidDate, input.paymentId, input.organizationId]
      );
      if (result.rows.length === 0) return null;
      return mapPayment(result.rows[0]);
    },

    async listPayments(filter: ListPaymentsFilter): Promise<Payment[]> {
      const conditions: string[] = ["organization_id = $1"];
      const values: unknown[] = [filter.organizationId];
      let idx = 2;

      if (filter.leaseId !== undefined) {
        conditions.push(`lease_id = $${idx++}`);
        values.push(filter.leaseId);
      }

      if (filter.status !== undefined) {
        conditions.push(`status = $${idx++}`);
        values.push(filter.status);
      }

      const where = conditions.join(" and ");
      const result = await client.query<PaymentRow>(
        `select
           id, organization_id, lease_id, tenant_id,
           amount, currency_code, due_date, paid_date, status, note, charge_period, created_at
         from payments
         where ${where}
         order by due_date desc`,
        values
      );
      return result.rows.map(mapPayment);
    },

    async listPaymentsByTenantAuthUserId(
      tenantAuthUserId: string,
      organizationId: string
    ): Promise<Payment[]> {
      const result = await client.query<PaymentRow>(
        `select
           p.id, p.organization_id, p.lease_id, p.tenant_id,
           p.amount, p.currency_code, p.due_date, p.paid_date, p.status, p.note, p.charge_period, p.created_at
         from payments p
         join tenants t on t.id = p.tenant_id
         where t.auth_user_id = $1 and p.organization_id = $2
         order by p.due_date desc
         limit 100`,
        [tenantAuthUserId, organizationId]
      );
      return result.rows.map(mapPayment);
    },

    async getPaymentById(paymentId: string, organizationId: string): Promise<Payment | null> {
      const result = await client.query<PaymentRow>(
        `select
           id, organization_id, lease_id, tenant_id,
           amount, currency_code, due_date, paid_date, status, note, charge_period, created_at
         from payments
         where id = $1 and organization_id = $2`,
        [paymentId, organizationId]
      );
      return result.rows[0] ? mapPayment(result.rows[0]) : null;
    },

    async updateOverduePayments(organizationId: string): Promise<number> {
      const result = await client.query(
        `update payments
         set status = 'overdue'
         where organization_id = $1
           and status = 'pending'
           and due_date < CURRENT_DATE`,
        [organizationId]
      );
      return result.rowCount ?? 0;
    },

    async generateMonthlyCharges(organizationId: string, period: string): Promise<number> {
      // due_date = first day of the period month
      const dueDate = `${period}-01`;
      const result = await client.query(
        `insert into payments (
           id, organization_id, lease_id, tenant_id,
           amount, currency_code, due_date, charge_period
         )
         select
           'pay_' || replace(gen_random_uuid()::text, '-', ''),
           l.organization_id,
           l.id,
           l.tenant_id,
           l.monthly_rent_amount,
           l.currency_code,
           $2::date,
           $3
         from leases l
         where l.organization_id = $1
           and l.status = 'active'
           and not exists (
             select 1 from payments p
             where p.lease_id = l.id and p.charge_period = $3
           )
         on conflict (lease_id, charge_period) where charge_period is not null do nothing`,
        [organizationId, dueDate, period]
      );
      return result.rowCount ?? 0;
    }
  };
}

export function createPaymentRepositoryFromEnv(env: DatabaseEnvSource): PaymentRepository {
  const envResult = readDatabaseEnv(env);
  if (!envResult.success) {
    throw new Error(envResult.error);
  }
  const pool = getOrCreatePool(envResult.data.connectionString);
  return createPostgresPaymentRepository(pool);
}
