import { Pool, type QueryResultRow } from "pg";
import type { DatabaseEnvSource } from "../database/database-env";
import { readDatabaseEnv } from "../database/database-env";
import type {
  AuditLogRecord,
  AuditLogRepository,
  CreateAuditLogRecordInput,
  ListAuditLogsByDayInput
} from "./audit-log-record.types";

interface AuditLogRow extends QueryResultRow {
  id: string;
  organizationId: string;
  actorMemberId: string | null;
  actorUserId: string | null;
  actionKey: string;
  entityType: string;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  createdAtIso: string;
}

function mapAuditLogRow(row: AuditLogRow): AuditLogRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    actorMemberId: row.actorMemberId,
    actorUserId: row.actorUserId,
    actionKey: row.actionKey,
    entityType: row.entityType,
    entityId: row.entityId,
    metadata: row.metadata ?? {},
    createdAtIso: row.createdAtIso
  };
}

export function createPostgresAuditLogRepository(pool: Pool): AuditLogRepository {
  return {
    async createAuditLog(input: CreateAuditLogRecordInput): Promise<AuditLogRecord> {
      const result = await pool.query<AuditLogRow>(
        `with inserted as (
           insert into audit_logs (
             id,
             organization_id,
             actor_member_id,
             action_key,
             entity_type,
             entity_id,
             metadata,
             created_at
           )
             values ($1::text, $2::text, $3::text, $4::text, $5::text, $6::text, $7::jsonb, now())
           returning
             id,
             organization_id,
             actor_member_id,
             action_key,
             entity_type,
             entity_id,
             metadata,
             created_at
         )
         select
           inserted.id,
           inserted.organization_id as "organizationId",
           inserted.actor_member_id as "actorMemberId",
           membership.user_id as "actorUserId",
           inserted.action_key as "actionKey",
           inserted.entity_type as "entityType",
           inserted.entity_id as "entityId",
           inserted.metadata,
           inserted.created_at::text as "createdAtIso"
         from inserted
         left join organization_memberships membership on membership.id = inserted.actor_member_id`,
        [
          input.id,
          input.organizationId,
          input.actorMemberId,
          input.actionKey,
          input.entityType,
          input.entityId ?? null,
          JSON.stringify(input.metadata ?? {})
        ]
      );

      return mapAuditLogRow(result.rows[0]);
    },

    async listAuditLogsByDay(input: ListAuditLogsByDayInput): Promise<AuditLogRecord[]> {
      const dayStart = `${input.dayIso}T00:00:00.000Z`;
      const dayDate = new Date(dayStart);
      const nextDay = new Date(dayDate.getTime() + 24 * 60 * 60 * 1000).toISOString();

      const result = await pool.query<AuditLogRow>(
        `select
           audit_logs.id,
           audit_logs.organization_id as "organizationId",
           audit_logs.actor_member_id as "actorMemberId",
           membership.user_id as "actorUserId",
           audit_logs.action_key as "actionKey",
           audit_logs.entity_type as "entityType",
           audit_logs.entity_id as "entityId",
           audit_logs.metadata,
           audit_logs.created_at::text as "createdAtIso"
         from audit_logs
         left join organization_memberships membership on membership.id = audit_logs.actor_member_id
         where audit_logs.organization_id = $1
           and audit_logs.created_at >= $2::timestamptz
           and audit_logs.created_at < $3::timestamptz
         order by audit_logs.created_at desc`,
        [input.organizationId, dayStart, nextDay]
      );

      return result.rows.map(mapAuditLogRow);
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

export function createAuditLogRepositoryFromEnv(env: DatabaseEnvSource): AuditLogRepository {
  const envResult = readDatabaseEnv(env);
  if (!envResult.success) {
    throw new Error(envResult.error);
  }

  return createPostgresAuditLogRepository(getOrCreatePool(envResult.data.connectionString));
}
