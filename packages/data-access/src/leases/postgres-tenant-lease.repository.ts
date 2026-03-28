import { Pool, type QueryResultRow } from "pg";
import type { Tenant, Lease } from "@hhousing/domain";
import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env";
import type {
  CreateTenantRecordInput,
  CreateLeaseRecordInput,
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
  start_date: string;
  end_date: string | null;
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
  ): Promise<{ rows: Row[] }>;
}

const poolCache = new Map<string, Pool>();

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

function toIsoDate(value: string): string {
  // pg returns dates as YYYY-MM-DD strings, keep as-is
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
        `insert into leases (
          id, organization_id, unit_id, tenant_id,
          start_date, end_date, monthly_rent_amount, currency_code
        ) values ($1, $2, $3, $4, $5, $6, $7, $8)
        returning
          id, organization_id, unit_id, tenant_id,
          start_date, end_date, monthly_rent_amount, currency_code, status, created_at`,
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
