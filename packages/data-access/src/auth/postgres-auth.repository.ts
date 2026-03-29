import { Pool, type PoolClient, type QueryResultRow } from "pg";
import type { DatabaseEnvSource } from "../database/database-env";
import { readDatabaseEnv } from "../database/database-env";
import type {
  AuthRepository,
  CreateOperatorAccountRecordInput,
  CreateOperatorAccountRecordOutput
} from "./auth-record.types";
import type { MembershipStatus, Organization, OrganizationMembership, UserRole } from "@hhousing/domain";

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