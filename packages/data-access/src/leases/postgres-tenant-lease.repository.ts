import { Pool, type QueryResultRow } from "pg";
import type { Tenant, Lease } from "@hhousing/domain";
import type { LeaseWithTenantView } from "@hhousing/api-contracts";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env";
import type {
  CreateTenantRecordInput,
  CreateLeaseRecordInput,
  CreateTenantInvitationRecordInput,
  TenantInvitationPreviewRecord,
  TenantInvitationRecord,
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

interface TenantInvitationRow extends QueryResultRow {
  id: string;
  tenant_id: string;
  organization_id: string;
  email: string;
  expires_at: Date | string;
  used_at: Date | string | null;
  revoked_at: Date | string | null;
  created_at: Date | string;
}

interface TenantInvitationPreviewRow extends QueryResultRow {
  invitation_id: string;
  tenant_id: string;
  organization_id: string;
  organization_name: string;
  tenant_full_name: string;
  tenant_email: string;
  tenant_phone: string | null;
  lease_id: string | null;
  unit_id: string | null;
  lease_start_date: string | Date | null;
  lease_end_date: string | Date | null;
  monthly_rent_amount: string | number | null;
  currency_code: string | null;
  expires_at: Date | string;
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

function mapTenantInvitation(row: TenantInvitationRow): TenantInvitationRecord {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    organizationId: row.organization_id,
    email: row.email,
    expiresAtIso: toIso(row.expires_at),
    usedAtIso: row.used_at ? toIso(row.used_at) : null,
    revokedAtIso: row.revoked_at ? toIso(row.revoked_at) : null,
    createdAtIso: toIso(row.created_at)
  };
}

function mapTenantInvitationPreview(row: TenantInvitationPreviewRow): TenantInvitationPreviewRecord {
  return {
    invitationId: row.invitation_id,
    tenantId: row.tenant_id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    tenantFullName: row.tenant_full_name,
    tenantEmail: row.tenant_email,
    tenantPhone: row.tenant_phone,
    leaseId: row.lease_id,
    unitId: row.unit_id,
    leaseStartDate: row.lease_start_date ? toIsoDate(row.lease_start_date) : null,
    leaseEndDate: row.lease_end_date ? toIsoDate(row.lease_end_date) : null,
    monthlyRentAmount:
      row.monthly_rent_amount === null ? null : toNumber(row.monthly_rent_amount),
    currencyCode: row.currency_code,
    expiresAtIso: toIso(row.expires_at)
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

    async revokeActiveTenantInvitations(tenantId: string, organizationId: string): Promise<void> {
      await client.query(
        `update tenant_invitations
         set revoked_at = now()
         where tenant_id = $1
           and organization_id = $2
           and used_at is null
           and revoked_at is null`,
        [tenantId, organizationId]
      );
    },

    async createTenantInvitation(input: CreateTenantInvitationRecordInput): Promise<TenantInvitationRecord> {
      const result = await client.query<TenantInvitationRow>(
        `insert into tenant_invitations (
           id,
           tenant_id,
           organization_id,
           email,
           token_hash,
           expires_at,
           created_by_user_id
         )
         values ($1, $2, $3, $4, $5, $6::timestamptz, $7)
         returning id, tenant_id, organization_id, email, expires_at, used_at, revoked_at, created_at`,
        [
          input.id,
          input.tenantId,
          input.organizationId,
          input.email,
          input.tokenHash,
          input.expiresAtIso,
          input.createdByUserId
        ]
      );

      return mapTenantInvitation(result.rows[0]);
    },

    async getTenantInvitationPreviewByTokenHash(tokenHash: string): Promise<TenantInvitationPreviewRecord | null> {
      const result = await client.query<TenantInvitationPreviewRow>(
        `select
           invitation.id as invitation_id,
           tenant.id as tenant_id,
           tenant.organization_id,
           organization.name as organization_name,
           tenant.full_name as tenant_full_name,
           invitation.email as tenant_email,
           tenant.phone as tenant_phone,
           lease.id as lease_id,
           lease.unit_id,
           lease.start_date as lease_start_date,
           lease.end_date as lease_end_date,
           lease.monthly_rent_amount,
           lease.currency_code,
           invitation.expires_at
         from tenant_invitations invitation
         join tenants tenant on tenant.id = invitation.tenant_id
         join organizations organization on organization.id = invitation.organization_id
         left join lateral (
           select
             l.id,
             l.unit_id,
             l.start_date,
             l.end_date,
             l.monthly_rent_amount,
             l.currency_code
           from leases l
           where l.tenant_id = tenant.id
             and l.organization_id = tenant.organization_id
             and l.status in ('active', 'pending')
           order by
             case when l.status = 'active' then 0 else 1 end,
             l.start_date desc
           limit 1
         ) lease on true
         where invitation.token_hash = $1
           and invitation.used_at is null
           and invitation.revoked_at is null
           and invitation.expires_at > now()`,
        [tokenHash]
      );

      return result.rows[0] ? mapTenantInvitationPreview(result.rows[0]) : null;
    },

    async markTenantInvitationUsed(invitationId: string): Promise<void> {
      await client.query(
        `update tenant_invitations
         set used_at = now()
         where id = $1`,
        [invitationId]
      );
    },

    async linkTenantAuthUser(
      tenantId: string,
      organizationId: string,
      authUserId: string,
      phone: string | null
    ): Promise<Tenant | null> {
      const result = await client.query<TenantRow>(
        `update tenants
         set auth_user_id = $1,
             phone = coalesce($2, phone)
         where id = $3 and organization_id = $4 and auth_user_id is null
         returning id, organization_id, auth_user_id, full_name, email, phone, created_at`,
        [authUserId, phone, tenantId, organizationId]
      );

      return result.rows[0] ? mapTenant(result.rows[0]) : null;
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

    async getCurrentLeaseByTenantAuthUserId(
      tenantAuthUserId: string,
      organizationId: string
    ): Promise<LeaseWithTenantView | null> {
      const result = await client.query<LeaseWithTenantRow>(
        `select
           l.id, l.organization_id, l.unit_id, l.tenant_id,
           l.start_date, l.end_date, l.monthly_rent_amount, l.currency_code, l.status, l.created_at,
           t.full_name  as tenant_full_name,
           t.email      as tenant_email
         from leases l
         join tenants t on t.id = l.tenant_id
         where t.auth_user_id = $1
           and l.organization_id = $2
           and l.status in ('active', 'pending')
         order by
           case when l.status = 'active' then 0 else 1 end,
           l.start_date desc
         limit 1`,
        [tenantAuthUserId, organizationId]
      );

      return result.rows[0] ? mapLeaseWithTenant(result.rows[0]) : null;
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
