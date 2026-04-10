import { Pool, type QueryResultRow } from "pg";
import type { ListCalendarEventsFilter } from "@hhousing/api-contracts";
import type { CalendarEvent } from "@hhousing/domain";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env";
import type {
  CalendarEventRepository,
  CreateCalendarEventRecordInput,
  UpdateCalendarEventRecordInput
} from "./calendar-event-record.types";

interface CalendarEventRow extends QueryResultRow {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  start_at: Date | string;
  end_at: Date | string | null;
  event_type: CalendarEvent["eventType"];
  status: CalendarEvent["status"];
  assigned_user_id: string | null;
  related_entity_type: CalendarEvent["relatedEntityType"];
  related_entity_id: string | null;
  property_id: string | null;
  unit_id: string | null;
  lease_id: string | null;
  tenant_id: string | null;
  payment_id: string | null;
  maintenance_request_id: string | null;
  task_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapCalendarEvent(row: CalendarEventRow): CalendarEvent {
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    description: row.description,
    startAtIso: toIso(row.start_at),
    endAtIso: row.end_at ? toIso(row.end_at) : null,
    eventType: row.event_type,
    status: row.status,
    assignedUserId: row.assigned_user_id,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    propertyId: row.property_id,
    unitId: row.unit_id,
    leaseId: row.lease_id,
    tenantId: row.tenant_id,
    paymentId: row.payment_id,
    maintenanceRequestId: row.maintenance_request_id,
    taskId: row.task_id,
    createdAtIso: toIso(row.created_at),
    updatedAtIso: toIso(row.updated_at)
  };
}

export interface CalendarEventQueryable {
  query<Row extends QueryResultRow>(
    text: string,
    values?: readonly unknown[]
  ): Promise<{ rows: Row[]; rowCount?: number | null }>;
}

const poolCache = new Map<string, Pool>();

function getOrCreatePool(connectionString: string): Pool {
  const existing = poolCache.get(connectionString);
  if (existing) return existing;
  const pool = new Pool({ connectionString, max: 5 });
  poolCache.set(connectionString, pool);
  return pool;
}

const EVENT_COLUMNS = `
  id,
  organization_id,
  title,
  description,
  start_at,
  end_at,
  event_type,
  status,
  assigned_user_id,
  related_entity_type,
  related_entity_id,
  property_id,
  unit_id,
  lease_id,
  tenant_id,
  payment_id,
  maintenance_request_id,
  task_id,
  created_at,
  updated_at`;

export function createPostgresCalendarEventRepository(client: CalendarEventQueryable): CalendarEventRepository {
  return {
    async createCalendarEvent(input: CreateCalendarEventRecordInput): Promise<CalendarEvent> {
      const result = await client.query<CalendarEventRow>(
        `insert into calendar_events (
          id, organization_id, title, description, start_at, end_at, event_type, status,
          assigned_user_id, related_entity_type, related_entity_id,
          property_id, unit_id, lease_id, tenant_id, created_at, updated_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, now(), now())
        returning ${EVENT_COLUMNS}`,
        [
          input.id,
          input.organizationId,
          input.title,
          input.description,
          input.startAtIso,
          input.endAtIso,
          input.eventType,
          input.status,
          input.assignedUserId,
          input.relatedEntityType,
          input.relatedEntityId,
          input.propertyId,
          input.unitId,
          input.leaseId,
          input.tenantId
        ]
      );

      return mapCalendarEvent(result.rows[0]);
    },

    async getCalendarEventById(id: string, organizationId: string): Promise<CalendarEvent | null> {
      const result = await client.query<CalendarEventRow>(
        `select ${EVENT_COLUMNS}
         from calendar_events
         where id = $1 and organization_id = $2
         limit 1`,
        [id, organizationId]
      );

      return result.rows[0] ? mapCalendarEvent(result.rows[0]) : null;
    },

    async listCalendarEvents(filter: ListCalendarEventsFilter): Promise<CalendarEvent[]> {
      const conditions: string[] = ["organization_id = $1"];
      const values: unknown[] = [filter.organizationId];
      let index = 2;

      if (filter.startAtFrom !== undefined) {
        conditions.push(`start_at >= $${index++}`);
        values.push(filter.startAtFrom);
      }

      if (filter.startAtTo !== undefined) {
        conditions.push(`start_at <= $${index++}`);
        values.push(filter.startAtTo);
      }

      if (filter.eventType !== undefined) {
        conditions.push(`event_type = $${index++}`);
        values.push(filter.eventType);
      }

      const result = await client.query<CalendarEventRow>(
        `select ${EVENT_COLUMNS}
         from calendar_events
         where ${conditions.join(" and ")}
         order by start_at asc, created_at asc`,
        values
      );

      return result.rows.map(mapCalendarEvent);
    },

    async updateCalendarEvent(input: UpdateCalendarEventRecordInput): Promise<CalendarEvent | null> {
      const assignments: string[] = [];
      const values: unknown[] = [input.id, input.organizationId];
      let index = 3;

      const addAssignment = (column: string, value: unknown): void => {
        assignments.push(`${column} = $${index++}`);
        values.push(value);
      };

      if (input.title !== undefined) addAssignment("title", input.title);
      if (input.description !== undefined) addAssignment("description", input.description);
      if (input.startAtIso !== undefined) addAssignment("start_at", input.startAtIso);
      if (input.endAtIso !== undefined) addAssignment("end_at", input.endAtIso);
      if (input.eventType !== undefined) addAssignment("event_type", input.eventType);
      if (input.status !== undefined) addAssignment("status", input.status);
      if (input.assignedUserId !== undefined) addAssignment("assigned_user_id", input.assignedUserId);
      if (input.relatedEntityType !== undefined) addAssignment("related_entity_type", input.relatedEntityType);
      if (input.relatedEntityId !== undefined) addAssignment("related_entity_id", input.relatedEntityId);
      if (input.propertyId !== undefined) addAssignment("property_id", input.propertyId);
      if (input.unitId !== undefined) addAssignment("unit_id", input.unitId);
      if (input.leaseId !== undefined) addAssignment("lease_id", input.leaseId);
      if (input.tenantId !== undefined) addAssignment("tenant_id", input.tenantId);
      assignments.push("updated_at = now()");

      const result = await client.query<CalendarEventRow>(
        `update calendar_events
         set ${assignments.join(", ")}
         where id = $1 and organization_id = $2
         returning ${EVENT_COLUMNS}`,
        values
      );

      return result.rows[0] ? mapCalendarEvent(result.rows[0]) : null;
    },

    async deleteCalendarEvent(id: string, organizationId: string): Promise<boolean> {
      const result = await client.query(
        `delete from calendar_events where id = $1 and organization_id = $2`,
        [id, organizationId]
      );

      return (result.rowCount ?? 0) > 0;
    }
  };
}

export function createCalendarEventRepositoryFromEnv(env: DatabaseEnvSource): CalendarEventRepository {
  const envResult = readDatabaseEnv(env);
  if (!envResult.success) {
    throw new Error(envResult.error);
  }

  const pool = getOrCreatePool(envResult.data.connectionString);
  return createPostgresCalendarEventRepository(pool);
}