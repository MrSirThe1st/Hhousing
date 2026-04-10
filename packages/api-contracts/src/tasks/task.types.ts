import type { Task, TaskPriority, TaskSource, TaskStatus, WorkflowEntityType } from "@hhousing/domain";

export type { TaskPriority, TaskSource, TaskStatus, WorkflowEntityType } from "@hhousing/domain";

export interface CreateTaskInput {
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
}

export interface UpdateTaskInput {
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

export interface ListTasksFilter {
  organizationId: string;
  status?: TaskStatus;
  source?: TaskSource;
  assignedUserId?: string;
}

export interface ListTasksOutput {
  tasks: Task[];
}

export type CreateTaskOutput = Task;

export type UpdateTaskOutput = Task;

export interface DeleteTaskOutput {
  success: true;
}