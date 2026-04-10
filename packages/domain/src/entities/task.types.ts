export type TaskPriority = "low" | "medium" | "high" | "urgent";

export type TaskStatus = "open" | "in_progress" | "done" | "cancelled";

export type TaskSource = "manual" | "system";

export type TaskSystemCode = "maintenance_follow_up" | "rent_overdue_follow_up" | "lease_renewal";

export type WorkflowEntityType =
  | "organization"
  | "property"
  | "unit"
  | "lease"
  | "tenant"
  | "payment"
  | "maintenance_request"
  | "task"
  | "custom";

export interface Task {
  id: string;
  organizationId: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  dueDate: string;
  status: TaskStatus;
  source: TaskSource;
  systemCode: TaskSystemCode | null;
  systemKey: string | null;
  assignedUserId: string | null;
  relatedEntityType: WorkflowEntityType | null;
  relatedEntityId: string | null;
  propertyId: string | null;
  unitId: string | null;
  leaseId: string | null;
  tenantId: string | null;
  paymentId: string | null;
  maintenanceRequestId: string | null;
  createdAtIso: string;
  updatedAtIso: string;
  completedAtIso: string | null;
}