import type { MaintenanceRequest, MaintenancePriority } from "@hhousing/domain";

export interface CreateMaintenanceRequestInput {
  organizationId: string;
  unitId: string;
  tenantId: string | null;
  title: string;
  description: string;
  priority: MaintenancePriority;
}

export type CreateMaintenanceRequestOutput = MaintenanceRequest;

export interface UpdateMaintenanceStatusInput {
  requestId: string;
  organizationId: string;
  status: "open" | "in_progress" | "resolved" | "cancelled";
}

export type UpdateMaintenanceStatusOutput = MaintenanceRequest;

export interface ListMaintenanceRequestsFilter {
  organizationId: string;
  unitId?: string;
  status?: string;
}

export interface ListMaintenanceRequestsOutput {
  requests: MaintenanceRequest[];
}
