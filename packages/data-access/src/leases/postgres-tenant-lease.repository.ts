import { Pool, type QueryResultRow } from "pg";
import type { Tenant, Lease } from "@hhousing/domain";
import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env";
import type {
  CreateTenantRecordInput,
  CreateLeaseRecordInput,
  UpdateTenantRecordInput,
  UpdateLeaseRecordInput,
  TenantLeaseRepository
} from "./tenant-lease-record.types";

interface TenantRow extends QueryResultRow {
  id: string;
  organization_id: string;
  auth_user_id: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  created_at: Date | string;
}

interface LeaseRow extends QueryResultRow {
  id: string;
  organization_id: string;
  unit_id: string;
  tenant_id: string;
  start_date: string | Date;
  end_date: string | Date | null;
  monthly_rent_amount: string | number;
  currency_code: string;
  status: "active" | "ended" | "pending";
  created_at: Date | string;
}

interface LeaseWithTenantRow extends LeaseRow {
  tenant_full_name: string;
  tenant_email: string | null;
}

export interface TenantLeaseQueryable {
  query<Row extends QueryResultRow>(
    text: string,
    values?: readonly unknown[]
  ): Promise<{ rows: Row[]; rowCount?: number | null }>;
}

const poolCache = new Map<string, Pool>();

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

function mapTenant(row: TenantRow): Tenant {
  return {
    id: row.id,
    organizationId: row.organization_id,
    authUserId: row.auth_user_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    createdAtIso: toIso(row.created_at)
  };
}

function mapLease(row: LeaseRow): Lease {
  return {
    id: row.id,
    organizationId: row.organization_id,
    unitId: row.unit_id,
    tenantId: row.tenant_id,
    startDate: toIsoDate(row.start_date),
    endDate: row.end_date ? toIsoDate(row.end_date) : null,
    monthlyRentAmount: toNumber(row.monthly_rent_amount),
    currencyCode: row.currency_code,
    status: row.status,
    createdAtIso: toIso(row.created_at)
  };
}

function mapLeaseWithTenant(row: LeaseWithTenantRow): LeaseWithTenantView {
  return {
    ...mapLease(row),
    tenantFullName: row.tenant_full_name,
    tenantEmail: row.tenant_email
  };
}

function getOrCreatePool(connectionString: string): Pool {
  const existing = poolCache.get(connectionString);
  if (existing) return existing;

  const pool = new Pool({ connectionString, max: 5 });
  poolCache.set(connectionString, pool);
  return pool;
}

export function createPostgresTenantLeaseRepository(
  client: TenantLeaseQueryable
): TenantLeaseRepository {
  return {
    async createTenant(input: CreateTenantRecordInput): Promise<Tenant> {
      const result = await client.query<TenantRow>(
        `insert into tenants (id, organization_id, auth_user_id, full_name, email, phone)
         values ($1, $2, $3, $4, $5, $6)
         returning id, organization_id, auth_user_id, full_name, email, phone, created_at`,
        [input.id, input.organizationId, input.authUserId, input.fullName, input.email, input.phone]
      );
      return mapTenant(result.rows[0]);
    },

    async createLease(input: CreateLeaseRecordInput): Promise<Lease> {
      const result = await client.query<LeaseRow>(
        `with created_lease as (
           insert into leases (
             id, organization_id, unit_id, tenant_id,
             start_date, end_date, monthly_rent_amount, currency_code, status
           )
           select $1, $2, $3, $4, $5, $6, $7, $8, 'active'
           from units u
           where u.id = $3
             and u.organization_id = $2
             and u.status = 'vacant'
           returning
             id, organization_id, unit_id, tenant_id,
             start_date, end_date, monthly_rent_amount, currency_code, status, created_at
         ), updated_unit as (
           update units
           set status = 'occupied'
           where id = $3
             and organization_id = $2
             and exists (select 1 from created_lease)
           returning id
         )
         select
           id, organization_id, unit_id, tenant_id,
           start_date, end_date, monthly_rent_amount, currency_code, status, created_at
         from created_lease`,
        [
          input.id,
          input.organizationId,
          input.unitId,
          input.tenantId,
          input.startDate,
          input.endDate,
          input.monthlyRentAmount,
          input.currencyCode
        ]
      );

      if (!result.rows[0]) {
        throw new Error("UNIT_NOT_AVAILABLE");
      }

      return mapLease(result.rows[0]);
    },

    async listLeasesByOrganization(organizationId: string): Promise<LeaseWithTenantView[]> {
      const result = await client.query<LeaseWithTenantRow>(
        `select
           l.id, l.organization_id, l.unit_id, l.tenant_id,
           l.start_date, l.end_date, l.monthly_rent_amount, l.currency_code, l.status, l.created_at,
           t.full_name  as tenant_full_name,
           t.email      as tenant_email
         from leases l
         join tenants t on t.id = l.tenant_id
         where l.organization_id = $1
         order by l.created_at desc`,
        [organizationId]
      );
      return result.rows.map(mapLeaseWithTenant);
    },

    async listTenantsByOrganization(organizationId: string): Promise<Tenant[]> {
      const result = await client.query<TenantRow>(
        `select id, organization_id, auth_user_id, full_name, email, phone, created_at
         from tenants
         where organization_id = $1
         order by full_name asc`,
        [organizationId]
      );
      return result.rows.map(mapTenant);
    },

    async getTenantById(tenantId: string, organizationId: string): Promise<Tenant | null> {
      const result = await client.query<TenantRow>(
        `select id, organization_id, auth_user_id, full_name, email, phone, created_at
         from tenants
         where id = $1 and organization_id = $2`,
        [tenantId, organizationId]
      );
      return result.rows[0] ? mapTenant(result.rows[0]) : null;
    },

    async getLeaseById(leaseId: string, organizationId: string): Promise<LeaseWithTenantView | null> {
      const result = await client.query<LeaseWithTenantRow>(
        `select
           l.id, l.organization_id, l.unit_id, l.tenant_id,
           l.start_date, l.end_date, l.monthly_rent_amount, l.currency_code, l.status, l.created_at,
           t.full_name  as tenant_full_name,
           t.email      as tenant_email
         from leases l
         join tenants t on t.id = l.tenant_id
         where l.id = $1 and l.organization_id = $2`,
        [leaseId, organizationId]
      );
      return result.rows[0] ? mapLeaseWithTenant(result.rows[0]) : null;
    },

    async updateTenant(input: UpdateTenantRecordInput): Promise<Tenant | null> {
      const result = await client.query<TenantRow>(
        `update tenants
         set full_name = $1, email = $2, phone = $3
         where id = $4 and organization_id = $5
         returning id, organization_id, auth_user_id, full_name, email, phone, created_at`,
        [input.fullName, input.email, input.phone, input.id, input.organizationId]
      );
      return result.rows[0] ? mapTenant(result.rows[0]) : null;
    },

    async updateLease(input: UpdateLeaseRecordInput): Promise<Lease | null> {
      const result = await client.query<LeaseRow>(
        `update leases
         set end_date = $1, status = $2
         where id = $3 and organization_id = $4
         returning
           id, organization_id, unit_id, tenant_id,
           start_date, end_date, monthly_rent_amount, currency_code, status, created_at`,
        [input.endDate, input.status, input.id, input.organizationId]
      );
      return result.rows[0] ? mapLease(result.rows[0]) : null;
    },

    async deleteTenant(tenantId: string, organizationId: string): Promise<boolean> {
      const result = await client.query(
        `delete from tenants where id = $1 and organization_id = $2`,
        [tenantId, organizationId]
      );
      return (result.rowCount ?? 0) > 0;
    }
  };
}

export function createTenantLeaseRepositoryFromEnv(env: DatabaseEnvSource): TenantLeaseRepository {
  const envResult = readDatabaseEnv(env);
  if (!envResult.success) {
    throw new Error(envResult.error);
  }
  const pool = getOrCreatePool(envResult.data.connectionString);
  return createPostgresTenantLeaseRepository(pool);
}
