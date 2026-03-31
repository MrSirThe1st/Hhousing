import { Pool, type QueryResultRow } from "pg";
import type { DatabaseEnvSource } from "../database/database-env";
import { readDatabaseEnv } from "../database/database-env";
import type { MemberFunction, MemberWithFunctions, TeamFunction } from "@hhousing/api-contracts";

interface TeamFunctionRow extends QueryResultRow {
  id: string;
  organizationId: string;
  functionCode: TeamFunction["functionCode"];
  displayName: string;
  description: string | null;
  permissions: string[] | null;
  createdAt: Date | string;
}

interface MemberFunctionRow extends QueryResultRow {
  id: string;
  organizationId: string;
  memberId: string;
  functionId: string;
  assignedBy: string | null;
  createdAt: Date | string;
}

interface MemberWithFunctionsRow extends QueryResultRow {
  memberId: string;
  userId: string;
  role: MemberWithFunctions["role"];
  status: MemberWithFunctions["status"];
  createdAt: Date | string;
  functions: Array<{
    id: string;
    organizationId: string;
    functionCode: TeamFunction["functionCode"];
    displayName: string;
    description: string | null;
    permissions: string[] | null;
    createdAt: Date | string;
  }> | null;
}

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function mapTeamFunction(row: TeamFunctionRow): TeamFunction {
  return {
    id: row.id,
    organizationId: row.organizationId,
    functionCode: row.functionCode,
    displayName: row.displayName,
    description: row.description,
    permissions: Array.isArray(row.permissions) ? row.permissions : [],
    createdAt: toDate(row.createdAt)
  };
}

function mapMemberFunction(row: MemberFunctionRow): MemberFunction {
  return {
    id: row.id,
    organizationId: row.organizationId,
    memberId: row.memberId,
    functionId: row.functionId,
    assignedBy: row.assignedBy ?? undefined,
    createdAt: toDate(row.createdAt)
  };
}

function mapMemberWithFunctions(row: MemberWithFunctionsRow): MemberWithFunctions {
  return {
    memberId: row.memberId,
    userId: row.userId,
    name: "",
    email: "",
    role: row.role,
    functions: Array.isArray(row.functions)
      ? row.functions.map((functionRow) =>
          mapTeamFunction({
            ...functionRow,
            permissions: functionRow.permissions ?? []
          })
        )
      : [],
    status: row.status,
    createdAt: toDate(row.createdAt)
  };
}

export class TeamFunctionsRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Get all functions for an organization
   */
  async listFunctionsByOrganization(organizationId: string): Promise<TeamFunction[]> {
    const result = await this.pool.query<TeamFunctionRow>(
      `
      select
        id,
        organization_id as "organizationId",
        function_code as "functionCode",
        display_name as "displayName",
        description,
        permissions,
        created_at as "createdAt"
      from team_functions
      where organization_id = $1
      order by created_at asc
      `,
      [organizationId]
    );

    return result.rows.map(mapTeamFunction);
  }

  /**
   * Get a specific function by ID
   */
  async getFunctionById(functionId: string): Promise<TeamFunction | null> {
    const result = await this.pool.query<TeamFunctionRow>(
      `
      select
        id,
        organization_id as "organizationId",
        function_code as "functionCode",
        display_name as "displayName",
        description,
        permissions,
        created_at as "createdAt"
      from team_functions
      where id = $1
      `,
      [functionId]
    );

    if (result.rows.length === 0) return null;

    return mapTeamFunction(result.rows[0]);
  }

  /**
   * Get all functions assigned to a member
   */
  async listMemberFunctions(memberId: string): Promise<TeamFunction[]> {
    const result = await this.pool.query<TeamFunctionRow>(
      `
      select
        tf.id,
        tf.organization_id as "organizationId",
        tf.function_code as "functionCode",
        tf.display_name as "displayName",
        tf.description,
        tf.permissions,
        tf.created_at as "createdAt"
      from member_functions mf
      inner join team_functions tf on mf.function_id = tf.id
      where mf.member_id = $1
      order by tf.created_at asc
      `,
      [memberId]
    );

    return result.rows.map(mapTeamFunction);
  }

  /**
   * Check if member has a specific permission
   * Permissions can be explicit strings or '*' for wildcard (all permissions)
   */
  async memberHasPermission(memberId: string, permission: string): Promise<boolean> {
    const result = await this.pool.query<{ has_permission: boolean }>(
      `
      select exists(
        select 1
        from member_functions mf
        inner join team_functions tf on mf.function_id = tf.id
        where mf.member_id = $1
          and (
            tf.permissions @> jsonb_build_array($2::text)
            or tf.permissions @> '["*"]'::jsonb
          )
      ) as has_permission
      `,
      [memberId, permission]
    );

    return result.rows[0]?.has_permission || false;
  }

  /**
   * Assign a function to a member
   */
  async assignFunctionToMember(
    memberId: string,
    functionId: string,
    organizationId: string,
    assignedBy?: string
  ): Promise<MemberFunction> {
    const id = `mf_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;

    const result = await this.pool.query<MemberFunctionRow>(
      `
      insert into member_functions (id, organization_id, member_id, function_id, assigned_by, created_at)
      values ($1, $2, $3, $4, $5, now())
      returning
        id,
        organization_id as "organizationId",
        member_id as "memberId",
        function_id as "functionId",
        assigned_by as "assignedBy",
        created_at as "createdAt"
      `,
      [id, organizationId, memberId, functionId, assignedBy || null]
    );

    return mapMemberFunction(result.rows[0]);
  }

  /**
   * Remove a function from a member
   */
  async removeFunctionFromMember(memberId: string, functionId: string): Promise<void> {
    await this.pool.query(
      `
      delete from member_functions
      where member_id = $1 and function_id = $2
      `,
      [memberId, functionId]
    );
  }

  /**
   * Clear all functions for a member
   */
  async clearMemberFunctions(memberId: string): Promise<void> {
    await this.pool.query(
      `
      delete from member_functions
      where member_id = $1
      `,
      [memberId]
    );
  }

  /**
   * Get member details with assigned functions
   * Used for team member listings
   */
  async getMemberWithFunctions(
    memberId: string
  ): Promise<MemberWithFunctions | null> {
    const result = await this.pool.query<MemberWithFunctionsRow>(
      `
      select
        om.id as "memberId",
        om.user_id as "userId",
        om.role,
        om.status,
        om.created_at as "createdAt",
        json_agg(
          json_build_object(
            'id', tf.id,
            'organizationId', tf.organization_id,
            'functionCode', tf.function_code,
            'displayName', tf.display_name,
            'description', tf.description,
            'permissions', tf.permissions,
            'createdAt', tf.created_at
          ) order by tf.created_at asc
        ) filter (where tf.id is not null) as functions
      from organization_memberships om
      left join member_functions mf on mf.member_id = om.id
      left join team_functions tf on mf.function_id = tf.id
      where om.id = $1
      group by om.id, om.user_id, om.role, om.status, om.created_at
      `,
      [memberId]
    );

    if (result.rows.length === 0) return null;

    return mapMemberWithFunctions(result.rows[0]);
  }

  /**
   * List all members in org with their functions
   */
  async listOrganizationMembersWithFunctions(
    organizationId: string
  ): Promise<MemberWithFunctions[]> {
    const result = await this.pool.query<MemberWithFunctionsRow>(
      `
      select
        om.id as "memberId",
        om.user_id as "userId",
        om.role,
        om.status,
        om.created_at as "createdAt",
        json_agg(
          json_build_object(
            'id', tf.id,
            'organizationId', tf.organization_id,
            'functionCode', tf.function_code,
            'displayName', tf.display_name,
            'description', tf.description,
            'permissions', tf.permissions,
            'createdAt', tf.created_at
          ) order by tf.created_at asc
        ) filter (where tf.id is not null) as functions
      from organization_memberships om
      left join member_functions mf on mf.member_id = om.id
      left join team_functions tf on mf.function_id = tf.id
      where om.organization_id = $1 and om.role != 'tenant'
      group by om.id, om.user_id, om.role, om.status, om.created_at
      order by om.created_at desc
      `,
      [organizationId]
    );

    return result.rows.map(mapMemberWithFunctions);
  }
}

// Connection pool management
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

/**
 * Create TeamFunctionsRepository from environment config.
 */
export function createTeamFunctionsRepositoryFromEnv(
  env: DatabaseEnvSource
): TeamFunctionsRepository {
  const envResult = readDatabaseEnv(env);
  if (!envResult.success) {
    throw new Error(envResult.error);
  }

  const pool = getOrCreatePool(envResult.data.connectionString);
  return new TeamFunctionsRepository(pool);
}
