import { Pool, type QueryResultRow } from "pg";
import type { ListTasksFilter } from "@hhousing/api-contracts";
import type { Task } from "@hhousing/domain";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env";
import type {
  CreateTaskRecordInput,
  TaskRepository,
  UpdateTaskRecordInput,
  UpsertSystemTaskRecordInput
} from "./task-record.types";

interface TaskRow extends QueryResultRow {
  id: string;
  organization_id: string;
  title: string;
  description: string | null;
  priority: Task["priority"];
  due_date: string | Date;
  status: Task["status"];
  source: Task["source"];
  system_code: Task["systemCode"];
  system_key: string | null;
  assigned_user_id: string | null;
  related_entity_type: Task["relatedEntityType"];
  related_entity_id: string | null;
  property_id: string | null;
  unit_id: string | null;
  lease_id: string | null;
  tenant_id: string | null;
  payment_id: string | null;
  maintenance_request_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  completed_at: Date | string | null;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toIsoDate(value: Date | string): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    description: row.description,
    priority: row.priority,
    dueDate: toIsoDate(row.due_date),
    status: row.status,
    source: row.source,
    systemCode: row.system_code,
    systemKey: row.system_key,
    assignedUserId: row.assigned_user_id,
    relatedEntityType: row.related_entity_type,
    relatedEntityId: row.related_entity_id,
    propertyId: row.property_id,
    unitId: row.unit_id,
    leaseId: row.lease_id,
    tenantId: row.tenant_id,
    paymentId: row.payment_id,
    maintenanceRequestId: row.maintenance_request_id,
    createdAtIso: toIso(row.created_at),
    updatedAtIso: toIso(row.updated_at),
    completedAtIso: row.completed_at ? toIso(row.completed_at) : null
  };
}

export interface TaskQueryable {
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

const TASK_COLUMNS = `
  id,
  organization_id,
  title,
  description,
  priority,
  due_date,
  status,
  source,
  system_code,
  system_key,
  assigned_user_id,
  related_entity_type,
  related_entity_id,
  property_id,
  unit_id,
  lease_id,
  tenant_id,
  payment_id,
  maintenance_request_id,
  created_at,
  updated_at,
  completed_at`;

export function createPostgresTaskRepository(client: TaskQueryable): TaskRepository {
  return {
    async createTask(input: CreateTaskRecordInput): Promise<Task> {
      const result = await client.query<TaskRow>(
        `insert into tasks (
          id, organization_id, title, description, priority, due_date, status, source,
          assigned_user_id, related_entity_type, related_entity_id,
          property_id, unit_id, lease_id, tenant_id, created_at, updated_at
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, now(), now())
        returning ${TASK_COLUMNS}`,
        [
          input.id,
          input.organizationId,
          input.title,
          input.description,
          input.priority,
          input.dueDate,
          input.status,
          input.source,
          input.assignedUserId,
          input.relatedEntityType,
          input.relatedEntityId,
          input.propertyId,
          input.unitId,
          input.leaseId,
          input.tenantId
        ]
      );

      return mapTask(result.rows[0]);
    },

    async getTaskById(id: string, organizationId: string): Promise<Task | null> {
      const result = await client.query<TaskRow>(
        `select ${TASK_COLUMNS}
         from tasks
         where id = $1 and organization_id = $2
         limit 1`,
        [id, organizationId]
      );

      return result.rows[0] ? mapTask(result.rows[0]) : null;
    },

    async listTasks(filter: ListTasksFilter): Promise<Task[]> {
      const conditions: string[] = ["organization_id = $1"];
      const values: unknown[] = [filter.organizationId];
      let index = 2;

      if (filter.status !== undefined) {
        conditions.push(`status = $${index++}`);
        values.push(filter.status);
      }

      if (filter.source !== undefined) {
        conditions.push(`source = $${index++}`);
        values.push(filter.source);
      }

      if (filter.assignedUserId !== undefined) {
        conditions.push(`assigned_user_id = $${index++}`);
        values.push(filter.assignedUserId);
      }

      const result = await client.query<TaskRow>(
        `select ${TASK_COLUMNS}
         from tasks
         where ${conditions.join(" and ")}
         order by
           case status
             when 'open' then 0
             when 'in_progress' then 1
             when 'done' then 2
             else 3
           end,
           due_date asc,
           created_at desc`,
        values
      );

      return result.rows.map(mapTask);
    },

    async updateTask(input: UpdateTaskRecordInput): Promise<Task | null> {
      const assignments: string[] = [];
      const values: unknown[] = [input.id, input.organizationId];
      let index = 3;

      const addAssignment = (column: string, value: unknown): void => {
        assignments.push(`${column} = $${index++}`);
        values.push(value);
      };

      if (input.title !== undefined) addAssignment("title", input.title);
      if (input.description !== undefined) addAssignment("description", input.description);
      if (input.priority !== undefined) addAssignment("priority", input.priority);
      if (input.dueDate !== undefined) addAssignment("due_date", input.dueDate);
      if (input.status !== undefined) addAssignment("status", input.status);
      if (input.assignedUserId !== undefined) addAssignment("assigned_user_id", input.assignedUserId);
      if (input.relatedEntityType !== undefined) addAssignment("related_entity_type", input.relatedEntityType);
      if (input.relatedEntityId !== undefined) addAssignment("related_entity_id", input.relatedEntityId);
      if (input.propertyId !== undefined) addAssignment("property_id", input.propertyId);
      if (input.unitId !== undefined) addAssignment("unit_id", input.unitId);
      if (input.leaseId !== undefined) addAssignment("lease_id", input.leaseId);
      if (input.tenantId !== undefined) addAssignment("tenant_id", input.tenantId);

      if (input.status !== undefined) {
        assignments.push(
          `completed_at = case
             when $${index} in ('done', 'cancelled') then coalesce(completed_at, now())
             else null
           end`
        );
        values.push(input.status);
        index += 1;
      }

      assignments.push("updated_at = now()");

      const result = await client.query<TaskRow>(
        `update tasks
         set ${assignments.join(", ")}
         where id = $1 and organization_id = $2
         returning ${TASK_COLUMNS}`,
        values
      );

      return result.rows[0] ? mapTask(result.rows[0]) : null;
    },

    async deleteTask(id: string, organizationId: string): Promise<boolean> {
      const result = await client.query(
        `delete from tasks where id = $1 and organization_id = $2 and source = 'manual'`,
        [id, organizationId]
      );

      return (result.rowCount ?? 0) > 0;
    },

    async upsertSystemTask(input: UpsertSystemTaskRecordInput): Promise<Task> {
      const result = await client.query<TaskRow>(
        `insert into tasks (
          id, organization_id, title, description, priority, due_date, status, source,
          system_code, system_key, assigned_user_id, related_entity_type, related_entity_id,
          property_id, unit_id, lease_id, tenant_id, payment_id, maintenance_request_id,
          created_at, updated_at, completed_at
        ) values (
          $1, $2, $3, $4, $5, $6, 'open', 'system',
          $7, $8, $9, $10, $11,
          $12, $13, $14, $15, $16, $17,
          now(), now(), null
        )
        on conflict (system_key) where system_key is not null do update set
          title = excluded.title,
          description = excluded.description,
          priority = excluded.priority,
          due_date = excluded.due_date,
          assigned_user_id = excluded.assigned_user_id,
          related_entity_type = excluded.related_entity_type,
          related_entity_id = excluded.related_entity_id,
          property_id = excluded.property_id,
          unit_id = excluded.unit_id,
          lease_id = excluded.lease_id,
          tenant_id = excluded.tenant_id,
          payment_id = excluded.payment_id,
          maintenance_request_id = excluded.maintenance_request_id,
          status = case when tasks.status in ('done', 'cancelled') then tasks.status else 'open' end,
          updated_at = now()
        returning ${TASK_COLUMNS}`,
        [
          input.id,
          input.organizationId,
          input.title,
          input.description,
          input.priority,
          input.dueDate,
          input.systemCode,
          input.systemKey,
          input.assignedUserId,
          input.relatedEntityType,
          input.relatedEntityId,
          input.propertyId,
          input.unitId,
          input.leaseId,
          input.tenantId,
          input.paymentId,
          input.maintenanceRequestId
        ]
      );

      return mapTask(result.rows[0]);
    },

    async closeInactiveSystemTasks(organizationId: string, activeSystemKeys: string[]): Promise<number> {
      const query = activeSystemKeys.length > 0
        ? `update tasks
           set status = 'done', completed_at = coalesce(completed_at, now()), updated_at = now()
           where organization_id = $1
             and source = 'system'
             and status in ('open', 'in_progress')
             and not (system_key = any($2::text[]))`
        : `update tasks
           set status = 'done', completed_at = coalesce(completed_at, now()), updated_at = now()
           where organization_id = $1
             and source = 'system'
             and status in ('open', 'in_progress')`;

      const values = activeSystemKeys.length > 0 ? [organizationId, activeSystemKeys] : [organizationId];
      const result = await client.query(query, values);
      return result.rowCount ?? 0;
    }
  };
}

export function createTaskRepositoryFromEnv(env: DatabaseEnvSource): TaskRepository {
  const envResult = readDatabaseEnv(env);
  if (!envResult.success) {
    throw new Error(envResult.error);
  }

  const pool = getOrCreatePool(envResult.data.connectionString);
  return createPostgresTaskRepository(pool);
}