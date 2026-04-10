import type { ListTasksFilter } from "@hhousing/api-contracts";
import type { Task, TaskPriority, TaskStatus, WorkflowEntityType } from "@hhousing/domain";

export interface CreateTaskRecordInput {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  dueDate: string;
  status: TaskStatus;
  assignedUserId: string | null;
  relatedEntityType: WorkflowEntityType | null;
  relatedEntityId: string | null;
  propertyId: string | null;
  unitId: string | null;
  leaseId: string | null;
  tenantId: string | null;
  source: "manual";
}

export interface UpdateTaskRecordInput {
  id: string;
  organizationId: string;
  title?: string;
  description?: string | null;
  priority?: TaskPriority;
  dueDate?: string;
  status?: TaskStatus;
  assignedUserId?: string | null;
  relatedEntityType?: WorkflowEntityType | null;
  relatedEntityId?: string | null;
  propertyId?: string | null;
  unitId?: string | null;
  leaseId?: string | null;
  tenantId?: string | null;
}

export interface UpsertSystemTaskRecordInput {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  dueDate: string;
  assignedUserId: string | null;
  relatedEntityType: WorkflowEntityType | null;
  relatedEntityId: string | null;
  propertyId: string | null;
  unitId: string | null;
  leaseId: string | null;
  tenantId: string | null;
  paymentId: string | null;
  maintenanceRequestId: string | null;
  systemCode: "maintenance_follow_up" | "rent_overdue_follow_up" | "lease_renewal";
  systemKey: string;
}

export interface TaskRepository {
  createTask(input: CreateTaskRecordInput): Promise<Task>;
  getTaskById(id: string, organizationId: string): Promise<Task | null>;
  listTasks(filter: ListTasksFilter): Promise<Task[]>;
  updateTask(input: UpdateTaskRecordInput): Promise<Task | null>;
  deleteTask(id: string, organizationId: string): Promise<boolean>;
  upsertSystemTask(input: UpsertSystemTaskRecordInput): Promise<Task>;
  closeInactiveSystemTasks(organizationId: string, activeSystemKeys: string[]): Promise<number>;
}