import { Pool, type PoolClient, type QueryResultRow } from "pg";
import type { DatabaseEnvSource } from "../database/database-env";
import { readDatabaseEnv } from "../database/database-env";
import type {
  AuthRepository,
  CreateOrganizationMembershipRecordInput,
  CreateTeamMemberInvitationRecordInput,
  CreateOperatorAccountRecordInput,
  CreateOperatorAccountRecordOutput,
  TeamMemberInvitationPreviewRecord
} from "./auth-record.types";
import type { MembershipStatus, Organization, OrganizationMembership, TeamMemberInvitation, TeamMemberInvitationRole, UserRole } from "@hhousing/domain";

interface OrganizationRow extends QueryResultRow {
  id: string;
  name: string;
  status: "active" | "suspended";
  created_at: Date | string;
}

interface OrganizationMembershipRow extends QueryResultRow {
  id: string;
  user_id: string;
  organization_id: string;
  organization_name: string;
  role: UserRole;
  status: MembershipStatus;
  can_own_properties: boolean;
  created_at: Date | string;
}

interface TeamMemberInvitationRow extends QueryResultRow {
  id: string;
  organization_id: string;
  organization_name: string;
  email: string;
  role: TeamMemberInvitationRole;
  can_own_properties: boolean;
  expires_at: Date | string;
  used_at: Date | string | null;
  revoked_at: Date | string | null;
  created_at: Date | string;
}

interface TeamMemberInvitationPreviewRow extends QueryResultRow {
  invitation_id: string;
  organization_id: string;
  organization_name: string;
  email: string;
  role: TeamMemberInvitationRole;
  can_own_properties: boolean;
  expires_at: Date | string;
}

const poolCache = new Map<string, Pool>();

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    createdAtIso: toIso(row.created_at)
  };
}

function mapMembership(row: OrganizationMembershipRow): OrganizationMembership {
  return {
    id: row.id,
    userId: row.user_id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    role: row.role,
    status: row.status,
    capabilities: {
      canOwnProperties: row.can_own_properties
    },
    createdAtIso: toIso(row.created_at)
  };
}

function mapTeamMemberInvitation(row: TeamMemberInvitationRow): TeamMemberInvitation {
  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    email: row.email,
    role: row.role,
    canOwnProperties: row.can_own_properties,
    expiresAtIso: toIso(row.expires_at),
    usedAtIso: row.used_at ? toIso(row.used_at) : null,
    revokedAtIso: row.revoked_at ? toIso(row.revoked_at) : null,
    createdAtIso: toIso(row.created_at)
  };
}

function mapTeamMemberInvitationPreview(row: TeamMemberInvitationPreviewRow): TeamMemberInvitationPreviewRecord {
  return {
    invitationId: row.invitation_id,
    organizationId: row.organization_id,
    organizationName: row.organization_name,
    email: row.email,
    role: row.role,
    canOwnProperties: row.can_own_properties,
    expiresAtIso: toIso(row.expires_at)
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

async function createMembership(
  client: PoolClient,
  input: CreateOperatorAccountRecordInput
): Promise<OrganizationMembership> {
  const membershipResult = await client.query<OrganizationMembershipRow>(
    `insert into organization_memberships (
      id,
      organization_id,
      user_id,
      role,
      status,
      can_own_properties
    ) values ($1, $2, $3, $4, 'active', $5)
    returning
      id,
      user_id,
      organization_id,
      role,
      status,
      can_own_properties,
      created_at,
      '' as organization_name`,
    [
      input.membershipId,
      input.organizationId,
      input.userId,
      input.role,
      input.canOwnProperties
    ]
  );

  return mapMembership({
    ...membershipResult.rows[0],
    organization_name: input.organizationName
  });
}

export function createPostgresAuthRepository(pool: Pool): AuthRepository {
  return {
    async listMembershipsByUserId(userId: string): Promise<OrganizationMembership[]> {
      const result = await pool.query<OrganizationMembershipRow>(
        `select
           membership.id,
           membership.user_id,
           membership.organization_id,
           organization.name as organization_name,
           membership.role,
           membership.status,
           membership.can_own_properties,
           membership.created_at
         from organization_memberships membership
         join organizations organization on organization.id = membership.organization_id
         where membership.user_id = $1
         order by membership.created_at desc`,
        [userId]
      );

      return result.rows.map(mapMembership);
    },

    async listMembershipsByOrganization(organizationId: string): Promise<OrganizationMembership[]> {
      const result = await pool.query<OrganizationMembershipRow>(
        `select
           membership.id,
           membership.user_id,
           membership.organization_id,
           organization.name as organization_name,
           membership.role,
           membership.status,
           membership.can_own_properties,
           membership.created_at
         from organization_memberships membership
         join organizations organization on organization.id = membership.organization_id
         where membership.organization_id = $1
         order by membership.created_at desc`,
        [organizationId]
      );

      return result.rows.map(mapMembership);
    },

    async getMembershipByUserAndOrg(userId: string, organizationId: string): Promise<OrganizationMembership | null> {
      const result = await pool.query<OrganizationMembershipRow>(
        `select
           membership.id,
           membership.user_id,
           membership.organization_id,
           organization.name as organization_name,
           membership.role,
           membership.status,
           membership.can_own_properties,
           membership.created_at
         from organization_memberships membership
         join organizations organization on organization.id = membership.organization_id
         where membership.user_id = $1 and membership.organization_id = $2`,
        [userId, organizationId]
      );

      return result.rows.length > 0 ? mapMembership(result.rows[0]) : null;
    },

    async getMembershipById(membershipId: string): Promise<OrganizationMembership | null> {
      const result = await pool.query<OrganizationMembershipRow>(
        `select
           membership.id,
           membership.user_id,
           membership.organization_id,
           organization.name as organization_name,
           membership.role,
           membership.status,
           membership.can_own_properties,
           membership.created_at
         from organization_memberships membership
         join organizations organization on organization.id = membership.organization_id
         where membership.id = $1`,
        [membershipId]
      );

      return result.rows.length > 0 ? mapMembership(result.rows[0]) : null;
    },

    async createOrganizationMembership(
      input: CreateOrganizationMembershipRecordInput
    ): Promise<OrganizationMembership> {
      const result = await pool.query<OrganizationMembershipRow>(
        `insert into organization_memberships (
          id,
          organization_id,
          user_id,
          role,
          status,
          can_own_properties
        ) values ($1, $2, $3, $4, $5, $6)
        returning
          id,
          user_id,
          organization_id,
          role,
          status,
          can_own_properties,
          created_at,
          '' as organization_name`,
        [
          input.id,
          input.organizationId,
          input.userId,
          input.role,
          input.status,
          input.canOwnProperties
        ]
      );

      const nameResult = await pool.query<{ name: string }>(
        `select name from organizations where id = $1`,
        [input.organizationId]
      );

      return mapMembership({
        ...result.rows[0],
        organization_name: nameResult.rows[0]?.name ?? ""
      });
    },

    async listTeamMemberInvitationsByOrganization(organizationId: string): Promise<TeamMemberInvitation[]> {
      const result = await pool.query<TeamMemberInvitationRow>(
        `select
           invitation.id,
           invitation.organization_id,
           organization.name as organization_name,
           invitation.email,
           invitation.role,
           invitation.can_own_properties,
           invitation.expires_at,
           invitation.used_at,
           invitation.revoked_at,
           invitation.created_at
         from team_member_invitations invitation
         join organizations organization on organization.id = invitation.organization_id
         where invitation.organization_id = $1
         order by invitation.created_at desc`,
        [organizationId]
      );

      return result.rows.map(mapTeamMemberInvitation);
    },

    async revokeActiveTeamMemberInvitations(email: string, organizationId: string): Promise<void> {
      await pool.query(
        `update team_member_invitations
         set revoked_at = now()
         where organization_id = $1
           and lower(email) = lower($2)
           and used_at is null
           and revoked_at is null
           and expires_at > now()`,
        [organizationId, email]
      );
    },

    async createTeamMemberInvitation(input: CreateTeamMemberInvitationRecordInput): Promise<TeamMemberInvitation> {
      const result = await pool.query<TeamMemberInvitationRow>(
        `insert into team_member_invitations (
           id,
           organization_id,
           email,
           role,
           can_own_properties,
           token_hash,
           expires_at,
           created_by_user_id
         ) values ($1, $2, $3, $4, $5, $6, $7, $8)
         returning
           id,
           organization_id,
           '' as organization_name,
           email,
           role,
           can_own_properties,
           expires_at,
           used_at,
           revoked_at,
           created_at`,
        [
          input.id,
          input.organizationId,
          input.email,
          input.role,
          input.canOwnProperties,
          input.tokenHash,
          input.expiresAtIso,
          input.createdByUserId
        ]
      );

      const nameResult = await pool.query<{ name: string }>(
        `select name from organizations where id = $1`,
        [input.organizationId]
      );

      return mapTeamMemberInvitation({
        ...result.rows[0],
        organization_name: nameResult.rows[0]?.name ?? ""
      });
    },

    async getTeamMemberInvitationPreviewByTokenHash(tokenHash: string): Promise<TeamMemberInvitationPreviewRecord | null> {
      const result = await pool.query<TeamMemberInvitationPreviewRow>(
        `select
           invitation.id as invitation_id,
           invitation.organization_id,
           organization.name as organization_name,
           invitation.email,
           invitation.role,
           invitation.can_own_properties,
           invitation.expires_at
         from team_member_invitations invitation
         join organizations organization on organization.id = invitation.organization_id
         where invitation.token_hash = $1
           and invitation.used_at is null
           and invitation.revoked_at is null
           and invitation.expires_at > now()`,
        [tokenHash]
      );

      return result.rows[0] ? mapTeamMemberInvitationPreview(result.rows[0]) : null;
    },

    async markTeamMemberInvitationUsed(invitationId: string): Promise<void> {
      await pool.query(
        `update team_member_invitations
         set used_at = now()
         where id = $1`,
        [invitationId]
      );
    },

    async createOperatorAccount(
      input: CreateOperatorAccountRecordInput
    ): Promise<CreateOperatorAccountRecordOutput> {
      const client = await pool.connect();
      try {
        await client.query("begin");

        const organizationResult = await client.query<OrganizationRow>(
          `insert into organizations (id, name)
           values ($1, $2)
           returning id, name, status, created_at`,
          [input.organizationId, input.organizationName]
        );

        const membership = await createMembership(client, input);

        await client.query("commit");

        return {
          organization: mapOrganization(organizationResult.rows[0]),
          membership
        };
      } catch (error) {
        await client.query("rollback");
        throw error;
      } finally {
        client.release();
      }
    }
  };
}

export function createAuthRepositoryFromEnv(env: DatabaseEnvSource): AuthRepository {
  const envResult = readDatabaseEnv(env);
  if (!envResult.success) {
    throw new Error(envResult.error);
  }

  return createPostgresAuthRepository(getOrCreatePool(envResult.data.connectionString));
}