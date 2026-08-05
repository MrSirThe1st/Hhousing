import { Pool, type QueryResultRow } from "pg";
import type { DatabaseEnvSource } from "../database/database-env";
import { readDatabaseEnv } from "../database/database-env";
import type {
  CreatePlatformAuditLogInput,
  GrantPlatformAdminInput,
  ListPlatformAuditLogsInput,
  ListPlatformOrganizationsInput,
  ListPlatformUsersInput,
  PlatformAdminRecord,
  PlatformAdminRepository,
  PlatformAuditLogRecord,
  PlatformOrganizationDetail,
  PlatformOrganizationListItem,
  PlatformOverviewStats,
  PlatformUserDetail,
  PlatformUserListItem,
  PlatformUserStatusRecord,
  SetOrganizationStatusInput,
  UpsertPlatformUserStatusInput
} from "./platform-admin-record.types";

interface PlatformAdminRow extends QueryResultRow {
  userId: string;
  status: "active" | "inactive";
  createdAtIso: string;
  createdByUserId: string | null;
}

interface PlatformUserStatusRow extends QueryResultRow {
  userId: string;
  status: "active" | "suspended";
  reason: string | null;
  updatedAtIso: string;
  updatedByUserId: string | null;
}

interface PlatformAuditLogRow extends QueryResultRow {
  id: string;
  actorUserId: string;
  actionKey: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAtIso: string;
}

function mapAdminRow(row: PlatformAdminRow): PlatformAdminRecord {
  return {
    userId: row.userId,
    status: row.status,
    createdAtIso: row.createdAtIso,
    createdByUserId: row.createdByUserId
  };
}

function mapUserStatusRow(row: PlatformUserStatusRow): PlatformUserStatusRecord {
  return {
    userId: row.userId,
    status: row.status,
    reason: row.reason,
    updatedAtIso: row.updatedAtIso,
    updatedByUserId: row.updatedByUserId
  };
}

function mapAuditRow(row: PlatformAuditLogRow): PlatformAuditLogRecord {
  return {
    id: row.id,
    actorUserId: row.actorUserId,
    actionKey: row.actionKey,
    entityType: row.entityType,
    entityId: row.entityId,
    metadata: row.metadata ?? {},
    createdAtIso: row.createdAtIso
  };
}

export function createPostgresPlatformAdminRepository(pool: Pool): PlatformAdminRepository {
  return {
    async isActivePlatformAdmin(userId: string): Promise<boolean> {
      const result = await pool.query<{ exists: boolean }>(
        `select exists(
           select 1
           from platform_admins
           where user_id = $1::uuid
             and status = 'active'
         ) as exists`,
        [userId]
      );
      return result.rows[0]?.exists === true;
    },

    async getPlatformUserStatus(userId: string): Promise<PlatformUserStatusRecord | null> {
      const result = await pool.query<PlatformUserStatusRow>(
        `select
           user_id as "userId",
           status,
           reason,
           updated_at::text as "updatedAtIso",
           updated_by_user_id as "updatedByUserId"
         from platform_user_statuses
         where user_id = $1::uuid`,
        [userId]
      );
      const row = result.rows[0];
      return row ? mapUserStatusRow(row) : null;
    },

    async isUserSuspended(userId: string): Promise<boolean> {
      const result = await pool.query<{ exists: boolean }>(
        `select exists(
           select 1
           from platform_user_statuses
           where user_id = $1::uuid
             and status = 'suspended'
         ) as exists`,
        [userId]
      );
      return result.rows[0]?.exists === true;
    },

    async upsertPlatformUserStatus(input: UpsertPlatformUserStatusInput): Promise<PlatformUserStatusRecord> {
      const result = await pool.query<PlatformUserStatusRow>(
        `insert into platform_user_statuses (
           user_id, status, reason, updated_at, updated_by_user_id
         ) values ($1::uuid, $2, $3, now(), $4::uuid)
         on conflict (user_id) do update set
           status = excluded.status,
           reason = excluded.reason,
           updated_at = now(),
           updated_by_user_id = excluded.updated_by_user_id
         returning
           user_id as "userId",
           status,
           reason,
           updated_at::text as "updatedAtIso",
           updated_by_user_id as "updatedByUserId"`,
        [input.userId, input.status, input.reason ?? null, input.updatedByUserId]
      );
      return mapUserStatusRow(result.rows[0]);
    },

    async setOrganizationStatus(input: SetOrganizationStatusInput): Promise<PlatformOrganizationListItem | null> {
      const result = await pool.query<PlatformOrganizationListItem & QueryResultRow>(
        `with updated as (
           update organizations
           set status = $2
           where id = $1
           returning id, name, status, created_at
         )
         select
           updated.id,
           updated.name,
           updated.status,
           updated.created_at::text as "createdAtIso",
           (select count(*)::int from organization_memberships m where m.organization_id = updated.id) as "memberCount",
           (select count(*)::int from properties p where p.organization_id = updated.id) as "propertyCount"
         from updated`,
        [input.organizationId, input.status]
      );
      const row = result.rows[0];
      return row
        ? {
            id: row.id,
            name: row.name,
            status: row.status,
            memberCount: row.memberCount,
            propertyCount: row.propertyCount,
            createdAtIso: row.createdAtIso
          }
        : null;
    },

    async grantPlatformAdmin(input: GrantPlatformAdminInput): Promise<PlatformAdminRecord> {
      const result = await pool.query<PlatformAdminRow>(
        `insert into platform_admins (user_id, status, created_at, created_by_user_id)
         values ($1::uuid, 'active', now(), $2::uuid)
         on conflict (user_id) do update set
           status = 'active',
           created_by_user_id = coalesce(excluded.created_by_user_id, platform_admins.created_by_user_id)
         returning
           user_id as "userId",
           status,
           created_at::text as "createdAtIso",
           created_by_user_id as "createdByUserId"`,
        [input.userId, input.createdByUserId ?? null]
      );
      return mapAdminRow(result.rows[0]);
    },

    async revokePlatformAdmin(userId: string): Promise<boolean> {
      const result = await pool.query(
        `update platform_admins
         set status = 'inactive'
         where user_id = $1::uuid
           and status = 'active'`,
        [userId]
      );
      return (result.rowCount ?? 0) > 0;
    },

    async createPlatformAuditLog(input: CreatePlatformAuditLogInput): Promise<PlatformAuditLogRecord> {
      const result = await pool.query<PlatformAuditLogRow>(
        `insert into platform_audit_logs (
           id, actor_user_id, action_key, entity_type, entity_id, metadata, created_at
         ) values ($1, $2::uuid, $3, $4, $5, $6::jsonb, now())
         returning
           id,
           actor_user_id as "actorUserId",
           action_key as "actionKey",
           entity_type as "entityType",
           entity_id as "entityId",
           metadata,
           created_at::text as "createdAtIso"`,
        [
          input.id,
          input.actorUserId,
          input.actionKey,
          input.entityType,
          input.entityId ?? null,
          JSON.stringify(input.metadata ?? {})
        ]
      );
      return mapAuditRow(result.rows[0]);
    },

    async listPlatformAuditLogs(input: ListPlatformAuditLogsInput | number = 50): Promise<PlatformAuditLogRecord[]> {
      const options: ListPlatformAuditLogsInput =
        typeof input === "number" ? { limit: input } : input ?? {};
      const limit = options.limit ?? 50;
      const actionKey = options.actionKey?.trim() || null;
      const entityType = options.entityType?.trim() || null;

      const result = await pool.query<PlatformAuditLogRow>(
        `select
           id,
           actor_user_id as "actorUserId",
           action_key as "actionKey",
           entity_type as "entityType",
           entity_id as "entityId",
           metadata,
           created_at::text as "createdAtIso"
         from platform_audit_logs
         where ($1::text is null or action_key = $1 or action_key like $1 || '.%')
           and ($2::text is null or entity_type = $2)
         order by created_at desc
         limit $3`,
        [actionKey, entityType, limit]
      );
      return result.rows.map(mapAuditRow);
    },

    async getOverviewStats(): Promise<PlatformOverviewStats> {
      const counts = await pool.query<{
        userCount: number;
        suspendedUserCount: number;
        organizationCount: number;
        activeOrganizationCount: number;
        suspendedOrganizationCount: number;
      }>(
        `select
           (
             select count(distinct uid)::int from (
               select user_id::text as uid from organization_memberships
               union
               select user_id::text as uid from owner_portal_accesses
               union
               select user_id::text as uid from platform_admins
             ) users
           ) as "userCount",
           (select count(*)::int from platform_user_statuses where status = 'suspended') as "suspendedUserCount",
           (select count(*)::int from organizations) as "organizationCount",
           (select count(*)::int from organizations where status = 'active') as "activeOrganizationCount",
           (select count(*)::int from organizations where status = 'suspended') as "suspendedOrganizationCount"`
      );

      const recentPlatformAudit = await this.listPlatformAuditLogs(10);
      const row = counts.rows[0];

      return {
        userCount: row?.userCount ?? 0,
        suspendedUserCount: row?.suspendedUserCount ?? 0,
        organizationCount: row?.organizationCount ?? 0,
        activeOrganizationCount: row?.activeOrganizationCount ?? 0,
        suspendedOrganizationCount: row?.suspendedOrganizationCount ?? 0,
        recentPlatformAudit
      };
    },

    async listUsers(input: ListPlatformUsersInput = {}): Promise<PlatformUserListItem[]> {
      const limit = input.limit ?? 50;
      const offset = input.offset ?? 0;
      const search = input.search?.trim() || null;
      const accountStatus = input.accountStatus ?? null;

      const result = await pool.query<PlatformUserListItem & QueryResultRow>(
        `with known_users as (
           select distinct user_id::uuid as user_id from organization_memberships
           union
           select distinct user_id from owner_portal_accesses
           union
           select distinct user_id from platform_admins
         )
         select
           ku.user_id::text as "userId",
           au.email::text as email,
           coalesce(pus.status, 'active') as "accountStatus",
           coalesce(
             (
               select array_agg(distinct om.role)
               from organization_memberships om
               where om.user_id = ku.user_id::text
             ),
             array[]::text[]
           ) as "membershipRoles",
           (
             select count(distinct om.organization_id)::int
             from organization_memberships om
             where om.user_id = ku.user_id::text
           ) as "organizationCount",
           (
             select count(*)::int
             from owner_portal_accesses opa
             where opa.user_id = ku.user_id
           ) as "ownerPortalAccessCount",
           exists(
             select 1 from platform_admins pa
             where pa.user_id = ku.user_id and pa.status = 'active'
           ) as "isPlatformAdmin",
           au.created_at::text as "createdAtIso"
         from known_users ku
         left join auth.users au on au.id = ku.user_id
         left join platform_user_statuses pus on pus.user_id = ku.user_id
         where ($1::text is null or au.email ilike '%' || $1 || '%' or ku.user_id::text ilike '%' || $1 || '%')
           and ($2::text is null or coalesce(pus.status, 'active') = $2)
         order by au.created_at desc nulls last
         limit $3 offset $4`,
        [search, accountStatus, limit, offset]
      );

      return result.rows.map((row) => ({
        userId: row.userId,
        email: row.email,
        accountStatus: row.accountStatus,
        membershipRoles: row.membershipRoles ?? [],
        organizationCount: row.organizationCount,
        ownerPortalAccessCount: row.ownerPortalAccessCount,
        isPlatformAdmin: row.isPlatformAdmin,
        createdAtIso: row.createdAtIso
      }));
    },

    async getUserDetail(userId: string): Promise<PlatformUserDetail | null> {
      const userResult = await pool.query<{
        userId: string;
        email: string | null;
        accountStatus: "active" | "suspended";
        accountReason: string | null;
        isPlatformAdmin: boolean;
      }>(
        `select
           $1::text as "userId",
           au.email::text as email,
           coalesce(pus.status, 'active') as "accountStatus",
           pus.reason as "accountReason",
           exists(
             select 1 from platform_admins pa
             where pa.user_id = $1::uuid and pa.status = 'active'
           ) as "isPlatformAdmin"
         from (select 1) seed
         left join auth.users au on au.id = $1::uuid
         left join platform_user_statuses pus on pus.user_id = $1::uuid`,
        [userId]
      );

      const userRow = userResult.rows[0];
      if (!userRow) {
        return null;
      }

      const known = await pool.query<{ exists: boolean }>(
        `select exists(
           select 1 from auth.users where id = $1::uuid
         ) or exists(
           select 1 from organization_memberships where user_id = $1
         ) or exists(
           select 1 from owner_portal_accesses where user_id = $1::uuid
         ) or exists(
           select 1 from platform_admins where user_id = $1::uuid
         ) as exists`,
        [userId]
      );
      if (known.rows[0]?.exists !== true) {
        return null;
      }

      const memberships = await pool.query<{
        id: string;
        organizationId: string;
        organizationName: string;
        organizationStatus: "active" | "suspended";
        role: string;
        status: string;
        createdAtIso: string;
      }>(
        `select
           om.id,
           om.organization_id as "organizationId",
           org.name as "organizationName",
           org.status as "organizationStatus",
           om.role,
           om.status,
           om.created_at::text as "createdAtIso"
         from organization_memberships om
         join organizations org on org.id = om.organization_id
         where om.user_id = $1
         order by om.created_at desc`,
        [userId]
      );

      const ownerPortalAccesses = await pool.query<{
        id: string;
        organizationId: string;
        ownerId: string;
        email: string;
        status: string;
        createdAtIso: string;
      }>(
        `select
           id,
           organization_id as "organizationId",
           owner_id as "ownerId",
           email,
           status,
           created_at::text as "createdAtIso"
         from owner_portal_accesses
         where user_id = $1::uuid
         order by created_at desc`,
        [userId]
      );

      return {
        userId: userRow.userId,
        email: userRow.email,
        accountStatus: userRow.accountStatus,
        accountReason: userRow.accountReason,
        isPlatformAdmin: userRow.isPlatformAdmin,
        memberships: memberships.rows,
        ownerPortalAccesses: ownerPortalAccesses.rows
      };
    },

    async listOrganizations(input: ListPlatformOrganizationsInput = {}): Promise<PlatformOrganizationListItem[]> {
      const limit = input.limit ?? 50;
      const offset = input.offset ?? 0;
      const search = input.search?.trim() || null;
      const status = input.status ?? null;

      const result = await pool.query<PlatformOrganizationListItem & QueryResultRow>(
        `select
           org.id,
           org.name,
           org.status,
           org.created_at::text as "createdAtIso",
           (select count(*)::int from organization_memberships m where m.organization_id = org.id) as "memberCount",
           (select count(*)::int from properties p where p.organization_id = org.id) as "propertyCount"
         from organizations org
         where ($1::text is null or org.name ilike '%' || $1 || '%' or org.id ilike '%' || $1 || '%')
           and ($2::text is null or org.status = $2)
         order by org.created_at desc
         limit $3 offset $4`,
        [search, status, limit, offset]
      );

      return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        status: row.status,
        memberCount: row.memberCount,
        propertyCount: row.propertyCount,
        createdAtIso: row.createdAtIso
      }));
    },

    async getOrganizationDetail(organizationId: string): Promise<PlatformOrganizationDetail | null> {
      const orgResult = await pool.query<{
        id: string;
        name: string;
        status: "active" | "suspended";
        createdAtIso: string;
        propertyCount: number;
        memberCount: number;
        unitCount: number;
        activeLeaseCount: number;
        overduePaymentCount: number;
        openMaintenanceCount: number;
      }>(
        `select
           org.id,
           org.name,
           org.status,
           org.created_at::text as "createdAtIso",
           (select count(*)::int from properties p where p.organization_id = org.id) as "propertyCount",
           (select count(*)::int from organization_memberships m where m.organization_id = org.id) as "memberCount",
           (select count(*)::int from units u where u.organization_id = org.id) as "unitCount",
           (select count(*)::int from leases l where l.organization_id = org.id and l.status = 'active') as "activeLeaseCount",
           (select count(*)::int from payments pay where pay.organization_id = org.id and pay.status = 'overdue') as "overduePaymentCount",
           (select count(*)::int from maintenance_requests mr where mr.organization_id = org.id and mr.status in ('open', 'in_progress')) as "openMaintenanceCount"
         from organizations org
         where org.id = $1`,
        [organizationId]
      );

      const org = orgResult.rows[0];
      if (!org) {
        return null;
      }

      const members = await pool.query<{
        membershipId: string;
        userId: string;
        email: string | null;
        role: string;
        status: string;
        createdAtIso: string;
      }>(
        `select
           om.id as "membershipId",
           om.user_id as "userId",
           au.email::text as email,
           om.role,
           om.status,
           om.created_at::text as "createdAtIso"
         from organization_memberships om
         left join auth.users au on au.id::text = om.user_id
         where om.organization_id = $1
         order by om.created_at desc`,
        [organizationId]
      );

      const recentOrgAudit = await pool.query<{
        id: string;
        actionKey: string;
        entityType: string;
        entityId: string | null;
        actorUserId: string | null;
        createdAtIso: string;
      }>(
        `select
           audit_logs.id,
           audit_logs.action_key as "actionKey",
           audit_logs.entity_type as "entityType",
           audit_logs.entity_id as "entityId",
           membership.user_id as "actorUserId",
           audit_logs.created_at::text as "createdAtIso"
         from audit_logs
         left join organization_memberships membership on membership.id = audit_logs.actor_member_id
         where audit_logs.organization_id = $1
         order by audit_logs.created_at desc
         limit 20`,
        [organizationId]
      );

      return {
        id: org.id,
        name: org.name,
        status: org.status,
        createdAtIso: org.createdAtIso,
        propertyCount: org.propertyCount,
        health: {
          memberCount: org.memberCount,
          propertyCount: org.propertyCount,
          unitCount: org.unitCount,
          activeLeaseCount: org.activeLeaseCount,
          overduePaymentCount: org.overduePaymentCount,
          openMaintenanceCount: org.openMaintenanceCount
        },
        members: members.rows,
        recentOrgAudit: recentOrgAudit.rows
      };
    },

    async findUserIdByEmail(email: string): Promise<string | null> {
      const result = await pool.query<{ id: string }>(
        `select id::text as id
         from auth.users
         where lower(email) = lower($1)
         limit 1`,
        [email.trim()]
      );
      return result.rows[0]?.id ?? null;
    }
  };
}

const poolCache = new Map<string, Pool>();

function getOrCreatePool(connectionString: string): Pool {
  const existing = poolCache.get(connectionString);
  if (existing) {
    return existing;
  }

  const pool = new Pool({ connectionString, max: 5 });
  poolCache.set(connectionString, pool);
  return pool;
}

export function createPlatformAdminRepositoryFromEnv(env: DatabaseEnvSource): PlatformAdminRepository {
  const envResult = readDatabaseEnv(env);
  if (!envResult.success) {
    throw new Error(envResult.error);
  }

  return createPostgresPlatformAdminRepository(getOrCreatePool(envResult.data.connectionString));
}
