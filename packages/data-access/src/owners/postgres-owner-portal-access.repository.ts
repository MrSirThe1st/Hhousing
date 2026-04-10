import { Pool, type QueryResultRow } from "pg";
import type { DatabaseEnvSource } from "../database/database-env";
import { readDatabaseEnv } from "../database/database-env";
import type {
  CreateOwnerInvitationRecordInput,
  CreateOwnerPortalAccessRecordInput,
  OwnerInvitationPreviewRecord,
  OwnerInvitationRecord,
  OwnerPortalAccessRecord,
  OwnerPortalAccessRepository
} from "./owner-portal-access-record.types";

interface OwnerInvitationRow extends QueryResultRow {
  id: string;
  owner_id: string;
  organization_id: string;
  owner_name: string;
  organization_name: string;
  email: string;
  expires_at: Date | string;
  used_at: Date | string | null;
  revoked_at: Date | string | null;
  created_at: Date | string;
}

interface OwnerInvitationPreviewRow extends QueryResultRow {
  invitation_id: string;
  owner_id: string;
  organization_id: string;
  owner_name: string;
  organization_name: string;
  email: string;
  expires_at: Date | string;
}

interface OwnerPortalAccessRow extends QueryResultRow {
  id: string;
  owner_id: string;
  organization_id: string;
  user_id: string;
  email: string;
  status: "active" | "inactive";
  created_at: Date | string;
}

const poolCache = new Map<string, Pool>();

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapOwnerInvitation(row: OwnerInvitationRow): OwnerInvitationRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    organizationId: row.organization_id,
    ownerName: row.owner_name,
    organizationName: row.organization_name,
    email: row.email,
    expiresAtIso: toIso(row.expires_at),
    usedAtIso: row.used_at ? toIso(row.used_at) : null,
    revokedAtIso: row.revoked_at ? toIso(row.revoked_at) : null,
    createdAtIso: toIso(row.created_at)
  };
}

function mapOwnerInvitationPreview(row: OwnerInvitationPreviewRow): OwnerInvitationPreviewRecord {
  return {
    invitationId: row.invitation_id,
    ownerId: row.owner_id,
    organizationId: row.organization_id,
    ownerName: row.owner_name,
    organizationName: row.organization_name,
    email: row.email,
    expiresAtIso: toIso(row.expires_at)
  };
}

function mapOwnerPortalAccess(row: OwnerPortalAccessRow): OwnerPortalAccessRecord {
  return {
    id: row.id,
    ownerId: row.owner_id,
    organizationId: row.organization_id,
    userId: row.user_id,
    email: row.email,
    status: row.status,
    createdAtIso: toIso(row.created_at)
  };
}

function getOrCreatePool(connectionString: string): Pool {
  const existing = poolCache.get(connectionString);
  if (existing) {
    return existing;
  }

  const pool = new Pool({ connectionString, max: 5 });
  poolCache.set(connectionString, pool);
  return pool;
}

export function createPostgresOwnerPortalAccessRepository(pool: Pool): OwnerPortalAccessRepository {
  return {
    async revokeActiveOwnerInvitations(ownerId: string, organizationId: string, email: string): Promise<void> {
      await pool.query(
        `update owner_invitations
         set revoked_at = now()
         where owner_id = $1
           and organization_id = $2
           and lower(email) = lower($3)
           and used_at is null
           and revoked_at is null
           and expires_at > now()`,
        [ownerId, organizationId, email]
      );
    },

    async createOwnerInvitation(input: CreateOwnerInvitationRecordInput): Promise<OwnerInvitationRecord> {
      const result = await pool.query<OwnerInvitationRow>(
        `insert into owner_invitations (
           id,
           owner_id,
           organization_id,
           email,
           token_hash,
           expires_at,
           created_by_user_id
         )
         select
           $1,
           owner.id,
           owner.organization_id,
           $2,
           $3,
           $4,
           $5
         from owners owner
         where owner.id = $6
           and owner.organization_id = $7
         returning
           id,
           owner_id,
           organization_id,
           '' as owner_name,
           '' as organization_name,
           email,
           expires_at,
           used_at,
           revoked_at,
           created_at`,
        [
          input.id,
          input.email,
          input.tokenHash,
          input.expiresAtIso,
          input.createdByUserId,
          input.ownerId,
          input.organizationId
        ]
      );

      const contextResult = await pool.query<{ owner_name: string; organization_name: string }>(
        `select owner.name as owner_name, organization.name as organization_name
         from owners owner
         join organizations organization on organization.id = owner.organization_id
         where owner.id = $1 and owner.organization_id = $2`,
        [input.ownerId, input.organizationId]
      );

      return mapOwnerInvitation({
        ...result.rows[0],
        owner_name: contextResult.rows[0]?.owner_name ?? "",
        organization_name: contextResult.rows[0]?.organization_name ?? ""
      });
    },

    async getOwnerInvitationPreviewByTokenHash(tokenHash: string): Promise<OwnerInvitationPreviewRecord | null> {
      const result = await pool.query<OwnerInvitationPreviewRow>(
        `select
           invitation.id as invitation_id,
           invitation.owner_id,
           invitation.organization_id,
           owner.name as owner_name,
           organization.name as organization_name,
           invitation.email,
           invitation.expires_at
         from owner_invitations invitation
         join owners owner on owner.id = invitation.owner_id and owner.organization_id = invitation.organization_id
         join organizations organization on organization.id = invitation.organization_id
         where invitation.token_hash = $1
           and invitation.used_at is null
           and invitation.revoked_at is null
           and invitation.expires_at > now()`,
        [tokenHash]
      );

      return result.rows[0] ? mapOwnerInvitationPreview(result.rows[0]) : null;
    },

    async markOwnerInvitationUsed(invitationId: string): Promise<void> {
      await pool.query(
        `update owner_invitations
         set used_at = now()
         where id = $1`,
        [invitationId]
      );
    },

    async getOwnerPortalAccessByUserAndOwner(userId: string, ownerId: string, organizationId: string): Promise<OwnerPortalAccessRecord | null> {
      const result = await pool.query<OwnerPortalAccessRow>(
        `select id, owner_id, organization_id, user_id, email, status, created_at
         from owner_portal_accesses
         where user_id = $1 and owner_id = $2 and organization_id = $3`,
        [userId, ownerId, organizationId]
      );

      return result.rows[0] ? mapOwnerPortalAccess(result.rows[0]) : null;
    },

    async createOwnerPortalAccess(input: CreateOwnerPortalAccessRecordInput): Promise<OwnerPortalAccessRecord> {
      const result = await pool.query<OwnerPortalAccessRow>(
        `insert into owner_portal_accesses (
           id,
           owner_id,
           organization_id,
           user_id,
           email,
           status,
           invited_by_user_id
         ) values ($1, $2, $3, $4, $5, 'active', $6)
         returning id, owner_id, organization_id, user_id, email, status, created_at`,
        [
          input.id,
          input.ownerId,
          input.organizationId,
          input.userId,
          input.email,
          input.invitedByUserId
        ]
      );

      return mapOwnerPortalAccess(result.rows[0]);
    },

    async listOwnerPortalAccessesByUserId(userId: string): Promise<OwnerPortalAccessRecord[]> {
      const result = await pool.query<OwnerPortalAccessRow>(
        `select id, owner_id, organization_id, user_id, email, status, created_at
         from owner_portal_accesses
         where user_id = $1 and status = 'active'
         order by created_at asc`,
        [userId]
      );

      return result.rows.map(mapOwnerPortalAccess);
    }
  };
}

export function createOwnerPortalAccessRepositoryFromEnv(env: DatabaseEnvSource): OwnerPortalAccessRepository {
  const envResult = readDatabaseEnv(env);
  if (!envResult.success) {
    throw new Error(envResult.error);
  }

  return createPostgresOwnerPortalAccessRepository(getOrCreatePool(envResult.data.connectionString));
}
