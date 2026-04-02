import { Pool, type QueryResultRow } from "pg";
import type { MaintenanceRequest, MaintenanceStatus, MaintenanceTimelineEvent } from "@hhousing/domain";
import type { ListMaintenanceRequestsFilter } from "@hhousing/api-contracts";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env";
import type {
  CreateMaintenanceRequestRecordInput,
  UpdateMaintenanceRequestRecordInput,
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
  assigned_to_name: string | null;
  internal_notes: string | null;
  resolution_notes: string | null;
  resolved_at: Date | string | null;
  updated_at: Date | string;
  created_at: Date | string;
}

interface MaintenanceEventRow extends QueryResultRow {
  id: string;
  organization_id: string;
  maintenance_request_id: string;
  event_type: "created" | "status_changed" | "assigned" | "internal_note_updated" | "resolution_note_updated";
  status_from: MaintenanceStatus | null;
  status_to: MaintenanceStatus | null;
  assigned_to_name: string | null;
  note: string | null;
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
    assignedToName: row.assigned_to_name,
    internalNotes: row.internal_notes,
    resolutionNotes: row.resolution_notes,
    resolvedAt: row.resolved_at ? toIso(row.resolved_at) : null,
    updatedAtIso: toIso(row.updated_at),
    createdAtIso: toIso(row.created_at)
  };
}

function mapMaintenanceEvent(row: MaintenanceEventRow): MaintenanceTimelineEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    maintenanceRequestId: row.maintenance_request_id,
    eventType: row.event_type,
    statusFrom: row.status_from,
    statusTo: row.status_to,
    assignedToName: row.assigned_to_name,
    note: row.note,
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
          title, description, priority, status,
          assigned_to_name, internal_notes, resolution_notes,
          resolved_at, updated_at, created_at`,
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
      const created = mapMaintenanceRequest(result.rows[0]);

      await client.query(
        `insert into maintenance_request_events (
           id, organization_id, maintenance_request_id,
           event_type, status_to
         ) values ($1, $2, $3, 'created', $4)`,
        [`mntevt_${created.id}_created`, input.organizationId, created.id, created.status]
      );

      return created;
    },

    async updateMaintenanceRequest(
      input: UpdateMaintenanceRequestRecordInput
    ): Promise<MaintenanceRequest | null> {
      const currentResult = await client.query<MaintenanceRequestRow>(
        `select
           id, organization_id, unit_id, tenant_id,
           title, description, priority, status,
           assigned_to_name, internal_notes, resolution_notes,
           resolved_at, updated_at, created_at
         from maintenance_requests
         where id = $1 and organization_id = $2`,
        [input.requestId, input.organizationId]
      );

      if (currentResult.rows.length === 0) return null;

      const current = currentResult.rows[0];
      const nextStatus = input.status ?? current.status;
      const nextAssignedToName =
        input.assignedToName !== undefined ? input.assignedToName : current.assigned_to_name;
      const nextInternalNotes =
        input.internalNotes !== undefined ? input.internalNotes : current.internal_notes;
      const nextResolutionNotes =
        input.resolutionNotes !== undefined ? input.resolutionNotes : current.resolution_notes;

      const result = await client.query<MaintenanceRequestRow>(
        `update maintenance_requests
         set status = $1,
             assigned_to_name = $2,
             internal_notes = $3,
             resolution_notes = $4,
             resolved_at = case when $1 = 'resolved' then now() else null end,
             updated_at = now()
         where id = $5 and organization_id = $6
         returning
           id, organization_id, unit_id, tenant_id,
           title, description, priority, status,
           assigned_to_name, internal_notes, resolution_notes,
           resolved_at, updated_at, created_at`,
        [
          nextStatus,
          nextAssignedToName,
          nextInternalNotes,
          nextResolutionNotes,
          input.requestId,
          input.organizationId
        ]
      );

      const updated = mapMaintenanceRequest(result.rows[0]);

      if (current.status !== updated.status) {
        await client.query(
          `insert into maintenance_request_events (
             id, organization_id, maintenance_request_id,
             event_type, status_from, status_to
           ) values ($1, $2, $3, 'status_changed', $4, $5)`,
          [
            `mntevt_${updated.id}_${Date.now()}_status`,
            input.organizationId,
            updated.id,
            current.status,
            updated.status
          ]
        );
      }

      if (current.assigned_to_name !== updated.assignedToName) {
        await client.query(
          `insert into maintenance_request_events (
             id, organization_id, maintenance_request_id,
             event_type, assigned_to_name
           ) values ($1, $2, $3, 'assigned', $4)`,
          [
            `mntevt_${updated.id}_${Date.now()}_assigned`,
            input.organizationId,
            updated.id,
            updated.assignedToName
          ]
        );
      }

      if (current.internal_notes !== updated.internalNotes) {
        await client.query(
          `insert into maintenance_request_events (
             id, organization_id, maintenance_request_id,
             event_type, note
           ) values ($1, $2, $3, 'internal_note_updated', $4)`,
          [
            `mntevt_${updated.id}_${Date.now()}_internal`,
            input.organizationId,
            updated.id,
            updated.internalNotes
          ]
        );
      }

      if (current.resolution_notes !== updated.resolutionNotes) {
        await client.query(
          `insert into maintenance_request_events (
             id, organization_id, maintenance_request_id,
             event_type, note
           ) values ($1, $2, $3, 'resolution_note_updated', $4)`,
          [
            `mntevt_${updated.id}_${Date.now()}_resolution`,
            input.organizationId,
            updated.id,
            updated.resolutionNotes
          ]
        );
      }

      return updated;
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
            title, description, priority, status,
            assigned_to_name, internal_notes, resolution_notes,
            resolved_at, updated_at, created_at
         from maintenance_requests
         where ${where}
         order by created_at desc`,
        values
      );
      return result.rows.map(mapMaintenanceRequest);
    },

    async getMaintenanceRequestById(
      requestId: string,
      organizationId: string
    ): Promise<MaintenanceRequest | null> {
      const result = await client.query<MaintenanceRequestRow>(
        `select
           id, organization_id, unit_id, tenant_id,
           title, description, priority, status,
           assigned_to_name, internal_notes, resolution_notes,
           resolved_at, updated_at, created_at
         from maintenance_requests
         where id = $1 and organization_id = $2`,
        [requestId, organizationId]
      );
      return result.rows[0] ? mapMaintenanceRequest(result.rows[0]) : null;
    },

    async listMaintenanceRequestTimeline(
      requestId: string,
      organizationId: string
    ): Promise<MaintenanceTimelineEvent[]> {
      const result = await client.query<MaintenanceEventRow>(
        `select
           id,
           organization_id,
           maintenance_request_id,
           event_type,
           status_from,
           status_to,
           assigned_to_name,
           note,
           created_at
         from maintenance_request_events
         where maintenance_request_id = $1 and organization_id = $2
         order by created_at asc`,
        [requestId, organizationId]
      );
      return result.rows.map(mapMaintenanceEvent);
    },

    async listMaintenanceRequestsByTenantAuthUserId(
      tenantAuthUserId: string,
      organizationId: string
    ): Promise<MaintenanceRequest[]> {
      const result = await client.query<MaintenanceRequestRow>(
        `select
           mr.id, mr.organization_id, mr.unit_id, mr.tenant_id,
           mr.title, mr.description, mr.priority, mr.status,
           mr.assigned_to_name, mr.internal_notes, mr.resolution_notes,
           mr.resolved_at, mr.updated_at, mr.created_at
         from maintenance_requests mr
         join tenants t on t.id = mr.tenant_id
         where t.auth_user_id = $1 and mr.organization_id = $2
         order by mr.created_at desc
         limit 100`,
        [tenantAuthUserId, organizationId]
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
