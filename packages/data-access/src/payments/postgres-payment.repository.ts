import { Pool, type QueryResultRow } from "pg";
import { getSharedPool } from "../pg-pool";
import type { Payment, PropertyManagementContext } from "@hhousing/domain";
import type { ListPaymentsFilter } from "@hhousing/api-contracts";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env";
import type {
  CreatePaymentRecordInput,
  DashboardMonthlyTotalRow,
  DashboardPaymentFinanceSnapshot,
  DashboardWatchlistPaymentRow,
  ListPaymentsPageInput,
  ListPaymentsPageResult,
  ListRevenuePaymentsPageInput,
  ListRevenuePaymentsPageResult,
  MarkPaymentPaidRecordInput,
  PaymentFinanceFilters,
  PaymentRepository,
  PaymentStatusCounts,
  SumRevenuePaymentsResult
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


export function createPostgresPaymentRepository(
  client: PaymentQueryable
): PaymentRepository {
  const repository: PaymentRepository = {
    async createPayment(input: CreatePaymentRecordInput): Promise<Payment> {
      const status = input.status ?? "pending";
      const paidDate = input.paidDate ?? null;
      const result = await client.query<PaymentRow>(
        `insert into payments (
          id, organization_id, lease_id, tenant_id,
          amount, currency_code, due_date, note,
          payment_kind, billing_frequency, source_lease_charge_template_id, is_initial_charge,
          status, paid_date
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
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
          input.isInitialCharge,
          status,
          paidDate
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

    async listPayments(filter: ListPaymentsFilter & { limit?: number }): Promise<Payment[]> {
      const page = await repository.listPaymentsPage({
        organizationId: filter.organizationId,
        leaseId: filter.leaseId ?? null,
        status: filter.status ?? null,
        limit: typeof filter.limit === "number" ? filter.limit : 50,
        cursor: null
      });
      return page.payments;
    },

    async listPaymentsPage(input: ListPaymentsPageInput): Promise<ListPaymentsPageResult> {
      const limit = Math.min(Math.max(1, Math.floor(input.limit || 50)), 50);
      const conditions: string[] = ["organization_id = $1"];
      const values: unknown[] = [input.organizationId];
      let idx = 2;

      if (input.leaseId) {
        conditions.push(`lease_id = $${idx++}`);
        values.push(input.leaseId);
      }

      if (input.status) {
        conditions.push(`status = $${idx++}`);
        values.push(input.status);
      }

      if (input.cursor) {
        const [dueDate, id] = input.cursor.split("|");
        if (dueDate && id) {
          conditions.push(`(due_date, id) < ($${idx++}::date, $${idx++})`);
          values.push(dueDate, id);
        }
      }

      values.push(limit + 1);
      const result = await client.query<PaymentRow>(
        `select
           id, organization_id, lease_id, tenant_id,
            amount, currency_code, due_date, paid_date, status, note,
            payment_kind, billing_frequency, source_lease_charge_template_id, is_initial_charge,
            charge_period, created_at
         from payments
         where ${conditions.join(" and ")}
         order by due_date desc, id desc
         limit $${idx}`,
        values
      );

      const hasMore = result.rows.length > limit;
      const rows = hasMore ? result.rows.slice(0, limit) : result.rows;
      const last = rows[rows.length - 1];
      return {
        payments: rows.map(mapPayment),
        nextCursor: hasMore && last ? `${toIsoDate(last.due_date)}|${last.id}` : null
      };
    },

    async getPaymentStatusCounts(organizationId: string): Promise<PaymentStatusCounts> {
      const result = await client.query<{
        total: string | number;
        pending: string | number;
        paid: string | number;
        overdue: string | number;
        cancelled: string | number;
      }>(
        `select
           count(*)::int as total,
           count(*) filter (where status = 'pending')::int as pending,
           count(*) filter (where status = 'paid')::int as paid,
           count(*) filter (where status = 'overdue')::int as overdue,
           count(*) filter (where status = 'cancelled')::int as cancelled
         from payments
         where organization_id = $1`,
        [organizationId]
      );
      const row = result.rows[0];
      return {
        total: Number(row?.total ?? 0),
        pending: Number(row?.pending ?? 0),
        paid: Number(row?.paid ?? 0),
        overdue: Number(row?.overdue ?? 0),
        cancelled: Number(row?.cancelled ?? 0)
      };
    },

    async listPaymentsByOrganizationAndLeaseIds(
      organizationId: string,
      leaseIds: string[]
    ): Promise<Payment[]> {
      if (leaseIds.length === 0) {
        return [];
      }

      const result = await client.query<PaymentRow>(
        `select
           id, organization_id, lease_id, tenant_id,
           amount, currency_code, due_date, paid_date, status, note,
           payment_kind, billing_frequency, source_lease_charge_template_id, is_initial_charge,
           charge_period, created_at
         from payments
         where organization_id = $1
           and lease_id = any($2::text[])
         order by due_date desc`,
        [organizationId, leaseIds]
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

    async listOrganizationsWithActiveRecurringCharges(): Promise<string[]> {
      const result = await client.query<{ organization_id: string }>(
        `select distinct organization_id
         from leases
         where status = 'active'
         order by organization_id asc`
      );

      return result.rows.map((row) => row.organization_id);
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
      void managementContext;
      const managementContextClause = "";
      const values: readonly unknown[] = [organizationId, period];

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
    },

    async getDashboardPaymentFinanceSnapshot(
      organizationId: string,
      currencyCode: string,
      monthStart: string,
      monthEndExclusive: string
    ): Promise<DashboardPaymentFinanceSnapshot> {
      const result = await client.query<{
        paid_amount: string | number | null;
        overdue_amount: string | number | null;
        overdue_count: string | number | null;
      }>(
        `select
           coalesce(sum(case
             when status = 'paid'
              and paid_date is not null
              and paid_date >= $3::date
              and paid_date < $4::date
             then amount
           end), 0) as paid_amount,
           coalesce(sum(case when status = 'overdue' then amount end), 0) as overdue_amount,
           count(*) filter (where status = 'overdue') as overdue_count
         from payments
         where organization_id = $1
           and currency_code = $2`,
        [organizationId, currencyCode, monthStart, monthEndExclusive]
      );

      const row = result.rows[0];
      return {
        paidAmount: toNumber(row?.paid_amount ?? 0),
        overdueAmount: toNumber(row?.overdue_amount ?? 0),
        overdueCount: toNumber(row?.overdue_count ?? 0)
      };
    },

    async listDashboardWatchlistPayments(
      organizationId: string,
      currencyCode: string,
      limit: number
    ): Promise<DashboardWatchlistPaymentRow[]> {
      const result = await client.query<{
        id: string;
        status: "overdue" | "pending";
        amount: string | number;
        currency_code: string;
        due_date: string | Date;
        tenant_name: string;
        unit_number: string;
        property_name: string;
      }>(
        `select
           p.id,
           p.status,
           p.amount,
           p.currency_code,
           p.due_date,
           t.full_name as tenant_name,
           u.unit_number,
           prop.name as property_name
         from payments p
         join leases l on l.id = p.lease_id
         join tenants t on t.id = p.tenant_id
         join units u on u.id = l.unit_id
         join properties prop on prop.id = u.property_id
         where p.organization_id = $1
           and p.currency_code = $2
           and p.status in ('overdue', 'pending')
         order by
           case p.status when 'overdue' then 0 else 1 end,
           p.due_date asc
         limit $3`,
        [organizationId, currencyCode, limit]
      );

      return result.rows.map((row) => ({
        id: row.id,
        status: row.status,
        amount: toNumber(row.amount),
        currencyCode: row.currency_code,
        dueDate: toIsoDate(row.due_date),
        tenantName: row.tenant_name,
        unitLabel: `${row.unit_number} · ${row.property_name}`
      }));
    },

    async sumPaidPaymentsByMonth(
      organizationId: string,
      currencyCode: string,
      fromDate: string
    ): Promise<DashboardMonthlyTotalRow[]> {
      const result = await client.query<{
        month: string | Date;
        amount: string | number;
      }>(
        `select
           to_char(date_trunc('month', paid_date), 'YYYY-MM') as month,
           coalesce(sum(amount), 0) as amount
         from payments
         where organization_id = $1
           and currency_code = $2
           and status = 'paid'
           and paid_date is not null
           and paid_date >= $3::date
         group by date_trunc('month', paid_date)
         order by date_trunc('month', paid_date)`,
        [organizationId, currencyCode, fromDate]
      );

      return result.rows.map((row) => ({
        month: typeof row.month === "string" ? row.month.slice(0, 7) : toIsoDate(row.month).slice(0, 7),
        amount: toNumber(row.amount)
      }));
    },


    async sumRevenuePayments(filters: PaymentFinanceFilters): Promise<SumRevenuePaymentsResult> {
      const conditions = [
        "p.organization_id = $1",
        "p.status = 'paid'",
        "p.paid_date is not null",
        "p.paid_date >= $2::date",
        "p.paid_date <= $3::date"
      ];
      const values: unknown[] = [filters.organizationId, filters.from, filters.to];
      let idx = 4;
      if (filters.propertyId) {
        conditions.push(`pr.id = $${idx++}`);
        values.push(filters.propertyId);
      }
      const where = conditions.join(" and ");
      const join = `from payments p
         join leases l on l.id = p.lease_id
         join units u on u.id = l.unit_id
         join properties pr on pr.id = u.property_id`;

      // Sequential queries: each pool.query() checks out a connection.
      // Promise.all here previously opened 4 connections and timed out on PgBouncer.
      const revenueResult = await client.query<{ currency_code: string; amount: string | number; payment_count: string | number }>(
        `select p.currency_code, coalesce(sum(p.amount),0) as amount, count(*)::int as payment_count
         ${join}
         where ${where} and p.payment_kind <> 'deposit'
         group by p.currency_code order by p.currency_code`,
        values
      );
      const depositResult = await client.query<{ currency_code: string; amount: string | number; payment_count: string | number }>(
        `select p.currency_code, coalesce(sum(p.amount),0) as amount, count(*)::int as payment_count
         ${join}
         where ${where} and p.payment_kind = 'deposit'
         group by p.currency_code order by p.currency_code`,
        values
      );
      const propertyResult = await client.query<{ property_id: string; property_name: string; currency_code: string; amount: string | number; payment_count: string | number }>(
        `select pr.id as property_id, pr.name as property_name, p.currency_code,
                coalesce(sum(p.amount),0) as amount, count(*)::int as payment_count
         ${join}
         where ${where} and p.payment_kind <> 'deposit'
         group by pr.id, pr.name, p.currency_code
         order by pr.name`,
        values
      );
      const monthlyResult = await client.query<{ month: string; currency_code: string; amount: string | number }>(
        `select to_char(date_trunc('month', p.paid_date), 'YYYY-MM') as month,
                p.currency_code, coalesce(sum(p.amount),0) as amount
         ${join}
         where ${where} and p.payment_kind <> 'deposit'
         group by date_trunc('month', p.paid_date), p.currency_code
         order by date_trunc('month', p.paid_date), p.currency_code`,
        values
      );

      const toTotals = (rows: Array<{ currency_code: string; amount: string | number }>) =>
        rows.map((row) => ({ currencyCode: row.currency_code, amount: toNumber(row.amount) }));

      const propertyMap = new Map<string, { propertyId: string; propertyName: string; paymentCount: number; totals: Map<string, number> }>();
      for (const row of propertyResult.rows) {
        const entry = propertyMap.get(row.property_id) ?? {
          propertyId: row.property_id,
          propertyName: row.property_name,
          paymentCount: 0,
          totals: new Map<string, number>()
        };
        entry.paymentCount += toNumber(row.payment_count);
        entry.totals.set(row.currency_code, (entry.totals.get(row.currency_code) ?? 0) + toNumber(row.amount));
        propertyMap.set(row.property_id, entry);
      }

      const monthlyMap = new Map<string, Map<string, number>>();
      for (const row of monthlyResult.rows) {
        const month = row.month.slice(0, 7);
        const totals = monthlyMap.get(month) ?? new Map<string, number>();
        totals.set(row.currency_code, (totals.get(row.currency_code) ?? 0) + toNumber(row.amount));
        monthlyMap.set(month, totals);
      }

      return {
        revenueTotals: toTotals(revenueResult.rows),
        depositLiabilityTotals: toTotals(depositResult.rows),
        recordedPaymentCount: revenueResult.rows.reduce((s, r) => s + toNumber(r.payment_count), 0),
        recordedDepositCount: depositResult.rows.reduce((s, r) => s + toNumber(r.payment_count), 0),
        propertyRevenue: [...propertyMap.values()].map((entry) => ({
          propertyId: entry.propertyId,
          propertyName: entry.propertyName,
          paymentCount: entry.paymentCount,
          totals: [...entry.totals.entries()].map(([currencyCode, amount]) => ({ currencyCode, amount }))
            .sort((a, b) => a.currencyCode.localeCompare(b.currencyCode, "fr"))
        })),
        monthlyRevenue: [...monthlyMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, totals]) => ({
          month,
          totals: [...totals.entries()].map(([currencyCode, amount]) => ({ currencyCode, amount }))
            .sort((a, b) => a.currencyCode.localeCompare(b.currencyCode, "fr"))
        }))
      };
    },

    async listRevenuePaymentsPage(input: ListRevenuePaymentsPageInput): Promise<ListRevenuePaymentsPageResult> {
      const limit = Math.min(Math.max(1, Math.floor(input.limit || 50)), 50);
      const conditions = [
        "p.organization_id = $1",
        "p.status = 'paid'",
        "p.paid_date is not null",
        "p.paid_date >= $2::date",
        "p.paid_date <= $3::date",
        "p.payment_kind <> 'deposit'"
      ];
      const values: unknown[] = [input.organizationId, input.from, input.to];
      let idx = 4;
      if (input.propertyId) {
        conditions.push(`pr.id = $${idx++}`);
        values.push(input.propertyId);
      }
      if (input.cursor) {
        const [paidDate, id] = input.cursor.split("|");
        if (paidDate && id) {
          conditions.push(`(p.paid_date, p.id) < ($${idx++}::date, $${idx++})`);
          values.push(paidDate, id);
        }
      }
      values.push(limit + 1);

      const result = await client.query<{
        id: string;
        property_id: string | null;
        property_name: string | null;
        unit_number: string | null;
        tenant_name: string | null;
        paid_date: string | Date;
        due_date: string | Date;
        payment_kind: string;
        currency_code: string;
        amount: string | number;
        note: string | null;
      }>(
        `select
           p.id, pr.id as property_id, pr.name as property_name, u.unit_number,
           t.full_name as tenant_name, p.paid_date, p.due_date, p.payment_kind,
           p.currency_code, p.amount, p.note
         from payments p
         join leases l on l.id = p.lease_id
         join units u on u.id = l.unit_id
         join properties pr on pr.id = u.property_id
         join tenants t on t.id = p.tenant_id
         where ${conditions.join(" and ")}
         order by p.paid_date desc, p.id desc
         limit $${idx}`,
        values
      );

      const hasMore = result.rows.length > limit;
      const rows = hasMore ? result.rows.slice(0, limit) : result.rows;
      const last = rows[rows.length - 1];
      return {
        rows: rows.map((row) => ({
          paymentId: row.id,
          propertyId: row.property_id,
          propertyName: row.property_name ?? "Portefeuille hors mapping",
          unitNumber: row.unit_number ?? "-",
          tenantName: row.tenant_name ?? "Locataire",
          paidDate: toIsoDate(row.paid_date),
          dueDate: toIsoDate(row.due_date),
          paymentKind: row.payment_kind as import("@hhousing/domain").PaymentKind,
          currencyCode: row.currency_code,
          amount: toNumber(row.amount),
          note: row.note
        })),
        nextCursor: hasMore && last ? `${toIsoDate(last.paid_date)}|${last.id}` : null
      };
    },

    async countSidebarPaymentBadges(organizationId: string, todayIsoDate: string): Promise<number> {
      const result = await client.query<{ count: string | number }>(
        `select count(*)::int as count
         from payments
         where organization_id = $1
           and (
             status = 'overdue'
             or (status = 'pending' and due_date < $2::date)
           )`,
        [organizationId, todayIsoDate]
      );
      return Number(result.rows[0]?.count ?? 0);
    }
  };
  return repository;
}

export function createPaymentRepositoryFromEnv(env: DatabaseEnvSource): PaymentRepository {
  const envResult = readDatabaseEnv(env);
  if (!envResult.success) {
    throw new Error(envResult.error);
  }
  const pool = getSharedPool(envResult.data.connectionString);
  return createPostgresPaymentRepository(pool);
}
