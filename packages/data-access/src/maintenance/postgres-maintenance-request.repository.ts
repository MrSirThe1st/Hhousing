import { Pool, type QueryResultRow } from "pg";
import type { MaintenanceRequest } from "@hhousing/domain";
import type { ListMaintenanceRequestsFilter } from "@hhousing/api-contracts";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env";
import type {
  CreateMaintenanceRequestRecordInput,
  UpdateMaintenanceStatusRecordInput,
  MaintenanceRequestRepository
} from "./maintenance-request-record.types";

interface MaintenanceRequestRow extends QueryResultRow {
  id: string;
  organization_id: string;
  unit_id: string;
  tenant_id: string | null;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "resolved" | "cancelled";
  resolved_at: Date | string | null;
  created_at: Date | string;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapMaintenanceRequest(row: MaintenanceRequestRow): MaintenanceRequest {
  return {
    id: row.id,
    organizationId: row.organization_id,
    unitId: row.unit_id,
    tenantId: row.tenant_id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    status: row.status,
    resolvedAt: row.resolved_at ? toIso(row.resolved_at) : null,
    createdAtIso: toIso(row.created_at)
  };
}

export interface MaintenanceRequestQueryable {
  query<Row extends QueryResultRow>(
    text: string,
    values?: readonly unknown[]
  ): Promise<{ rows: Row[] }>;
}

const poolCache = new Map<string, Pool>();

function getOrCreatePool(connectionString: string): Pool {
  const existing = poolCache.get(connectionString);
  if (existing) return existing;
  const pool = new Pool({ connectionString, max: 5 });
  poolCache.set(connectionString, pool);
  return pool;
}

export function createPostgresMaintenanceRequestRepository(
  client: MaintenanceRequestQueryable
): MaintenanceRequestRepository {
  return {
    async createMaintenanceRequest(
      input: CreateMaintenanceRequestRecordInput
    ): Promise<MaintenanceRequest> {
      const result = await client.query<MaintenanceRequestRow>(
        `insert into maintenance_requests (
          id, organization_id, unit_id, tenant_id,
          title, description, priority
        ) values ($1, $2, $3, $4, $5, $6, $7)
        returning
          id, organization_id, unit_id, tenant_id,
          title, description, priority, status, resolved_at, created_at`,
        [
          input.id,
          input.organizationId,
          input.unitId,
          input.tenantId,
          input.title,
          input.description,
          input.priority
        ]
      );
      return mapMaintenanceRequest(result.rows[0]);
    },

    async updateMaintenanceStatus(
      input: UpdateMaintenanceStatusRecordInput
    ): Promise<MaintenanceRequest | null> {
      const resolvedAt = input.status === "resolved" ? "now()" : "null";
      const result = await client.query<MaintenanceRequestRow>(
        `update maintenance_requests
         set status = $1,
             resolved_at = case when $1 = 'resolved' then now() else null end
         where id = $2 and organization_id = $3
         returning
           id, organization_id, unit_id, tenant_id,
           title, description, priority, status, resolved_at, created_at`,
        // resolved_at handled inline — only pass status, id, org to avoid extra param
        [input.status, input.requestId, input.organizationId]
      );
      // suppress unused variable warning for resolvedAt computed above
      void resolvedAt;
      if (result.rows.length === 0) return null;
      return mapMaintenanceRequest(result.rows[0]);
    },

    async listMaintenanceRequests(
      filter: ListMaintenanceRequestsFilter
    ): Promise<MaintenanceRequest[]> {
      const conditions: string[] = ["organization_id = $1"];
      const values: unknown[] = [filter.organizationId];
      let idx = 2;

      if (filter.unitId !== undefined) {
        conditions.push(`unit_id = $${idx++}`);
        values.push(filter.unitId);
      }

      if (filter.status !== undefined) {
        conditions.push(`status = $${idx++}`);
        values.push(filter.status);
      }

      const where = conditions.join(" and ");
      const result = await client.query<MaintenanceRequestRow>(
        `select
           id, organization_id, unit_id, tenant_id,
           title, description, priority, status, resolved_at, created_at
         from maintenance_requests
         where ${where}
         order by created_at desc`,
        values
      );
      return result.rows.map(mapMaintenanceRequest);
    }
  };
}

export function createMaintenanceRequestRepositoryFromEnv(
  env: DatabaseEnvSource
): MaintenanceRequestRepository {
  const envResult = readDatabaseEnv(env);
  if (!envResult.success) {
    throw new Error(envResult.error);
  }
  const pool = getOrCreatePool(envResult.data.connectionString);
  return createPostgresMaintenanceRequestRepository(pool);
}
