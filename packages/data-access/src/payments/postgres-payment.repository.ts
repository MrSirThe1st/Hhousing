import { Pool, type QueryResultRow } from "pg";
import type { Payment, PropertyManagementContext } from "@hhousing/domain";
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
  payment_kind: "rent" | "deposit" | "prorated_rent" | "fee" | "other";
  billing_frequency: "one_time" | "monthly" | "quarterly" | "annually";
  source_lease_charge_template_id: string | null;
  is_initial_charge: boolean;
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
    paymentKind: row.payment_kind,
    billingFrequency: row.billing_frequency,
    sourceLeaseChargeTemplateId: row.source_lease_charge_template_id,
    isInitialCharge: row.is_initial_charge,
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
          amount, currency_code, due_date, note,
          payment_kind, billing_frequency, source_lease_charge_template_id, is_initial_charge
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        returning
          id, organization_id, lease_id, tenant_id,
          amount, currency_code, due_date, paid_date, status, note,
          payment_kind, billing_frequency, source_lease_charge_template_id, is_initial_charge,
          charge_period, created_at`,
        [
          input.id,
          input.organizationId,
          input.leaseId,
          input.tenantId,
          input.amount,
          input.currencyCode,
          input.dueDate,
          input.note,
          input.paymentKind,
          input.billingFrequency,
          input.sourceLeaseChargeTemplateId,
          input.isInitialCharge
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
           amount, currency_code, due_date, paid_date, status, note,
           payment_kind, billing_frequency, source_lease_charge_template_id, is_initial_charge,
           charge_period, created_at`,
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
            amount, currency_code, due_date, paid_date, status, note,
            payment_kind, billing_frequency, source_lease_charge_template_id, is_initial_charge,
            charge_period, created_at
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
            p.amount, p.currency_code, p.due_date, p.paid_date, p.status, p.note,
            p.payment_kind, p.billing_frequency, p.source_lease_charge_template_id, p.is_initial_charge,
            p.charge_period, p.created_at
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
            amount, currency_code, due_date, paid_date, status, note,
            payment_kind, billing_frequency, source_lease_charge_template_id, is_initial_charge,
            charge_period, created_at
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

    async generateMonthlyCharges(
      organizationId: string,
      period: string,
      managementContext?: PropertyManagementContext
    ): Promise<number> {
      const managementContextClause = managementContext ? "and p.management_context = $3" : "";
      const values: readonly unknown[] = managementContext
        ? [organizationId, period, managementContext]
        : [organizationId, period];

      const result = await client.query(
        `with period_bounds as (
           select
             to_date($2 || '-01', 'YYYY-MM-DD') as period_start,
             (date_trunc('month', to_date($2 || '-01', 'YYYY-MM-DD')) + interval '1 month - 1 day')::date as period_end,
             extract(day from (date_trunc('month', to_date($2 || '-01', 'YYYY-MM-DD')) + interval '1 month - 1 day'))::int as period_last_day,
             (
               extract(year from to_date($2 || '-01', 'YYYY-MM-DD'))::int * 12
               + extract(month from to_date($2 || '-01', 'YYYY-MM-DD'))::int
             ) as period_month_index
         ), recurring_rent as (
           select
             'pay_' || replace(gen_random_uuid()::text, '-', '') as id,
             l.organization_id,
             l.id as lease_id,
             l.tenant_id,
             l.monthly_rent_amount as amount,
             l.currency_code,
             make_date(
               extract(year from pb.period_start)::int,
               extract(month from pb.period_start)::int,
               least(l.due_day_of_month, pb.period_last_day)
             ) as due_date,
             ('Loyer ' || to_char(pb.period_start, 'MM/YYYY'))::text as note,
             'rent'::text as payment_kind,
             l.payment_frequency::text as billing_frequency,
             null::text as source_lease_charge_template_id,
             false as is_initial_charge,
             $2::text as charge_period
           from leases l
           join units u on u.id = l.unit_id
           join properties p on p.id = u.property_id
           cross join period_bounds pb
           where l.organization_id = $1
             and l.status = 'active'
             ${managementContextClause}
             and l.payment_start_date <= pb.period_end
             and (l.end_date is null or l.end_date >= pb.period_start)
             and (
               l.payment_frequency = 'monthly'
               or (
                 l.payment_frequency = 'quarterly'
                 and mod(
                   pb.period_month_index - (
                     extract(year from l.payment_start_date)::int * 12
                     + extract(month from l.payment_start_date)::int
                   ),
                   3
                 ) = 0
               )
               or (
                 l.payment_frequency = 'annually'
                 and mod(
                   pb.period_month_index - (
                     extract(year from l.payment_start_date)::int * 12
                     + extract(month from l.payment_start_date)::int
                   ),
                   12
                 ) = 0
               )
             )
             and not exists (
               select 1
               from payments existing
               where existing.lease_id = l.id
                 and existing.charge_period = $2
                 and coalesce(existing.source_lease_charge_template_id, '') = ''
             )
         ), recurring_templates as (
           select
             'pay_' || replace(gen_random_uuid()::text, '-', '') as id,
             l.organization_id,
             l.id as lease_id,
             l.tenant_id,
             ct.amount,
             ct.currency_code,
             make_date(
               extract(year from pb.period_start)::int,
               extract(month from pb.period_start)::int,
               least(extract(day from ct.start_date)::int, pb.period_last_day)
             ) as due_date,
             ct.label as note,
             ct.charge_type::text as payment_kind,
             ct.frequency::text as billing_frequency,
             ct.id as source_lease_charge_template_id,
             false as is_initial_charge,
             $2::text as charge_period
           from leases l
           join lease_charge_templates ct on ct.lease_id = l.id and ct.organization_id = l.organization_id
           join units u on u.id = l.unit_id
           join properties p on p.id = u.property_id
           cross join period_bounds pb
           where l.organization_id = $1
             and l.status = 'active'
             ${managementContextClause}
             and ct.frequency != 'one_time'
             and ct.start_date <= pb.period_end
             and (ct.end_date is null or ct.end_date >= pb.period_start)
             and (
               ct.frequency = 'monthly'
               or (
                 ct.frequency = 'quarterly'
                 and mod(
                   pb.period_month_index - (
                     extract(year from ct.start_date)::int * 12
                     + extract(month from ct.start_date)::int
                   ),
                   3
                 ) = 0
               )
               or (
                 ct.frequency = 'annually'
                 and mod(
                   pb.period_month_index - (
                     extract(year from ct.start_date)::int * 12
                     + extract(month from ct.start_date)::int
                   ),
                   12
                 ) = 0
               )
             )
             and not exists (
               select 1
               from payments existing
               where existing.lease_id = l.id
                 and existing.charge_period = $2
                 and coalesce(existing.source_lease_charge_template_id, '') = ct.id
             )
         )
         insert into payments (
           id, organization_id, lease_id, tenant_id,
           amount, currency_code, due_date, note,
           payment_kind, billing_frequency, source_lease_charge_template_id,
           is_initial_charge, charge_period
         )
         select
           id, organization_id, lease_id, tenant_id,
           amount, currency_code, due_date, note,
           payment_kind::text,
           billing_frequency::text,
           source_lease_charge_template_id,
           is_initial_charge,
           charge_period
         from recurring_rent
         union all
         select
           id, organization_id, lease_id, tenant_id,
           amount, currency_code, due_date, note,
           payment_kind::text,
           billing_frequency::text,
           source_lease_charge_template_id,
           is_initial_charge,
           charge_period
         from recurring_templates`,
        values
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
