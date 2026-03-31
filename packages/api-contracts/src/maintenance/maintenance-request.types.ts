import type {
  MaintenanceRequest,
  MaintenancePriority,
  MaintenanceStatus,
  MaintenanceTimelineEvent
} from "@hhousing/domain";

export interface CreateMaintenanceRequestInput {
  organizationId: string;
  unitId: string;
  tenantId: string | null;
  title: string;
  description: string;
  priority: MaintenancePriority;
}

export type CreateMaintenanceRequestOutput = MaintenanceRequest;

export interface UpdateMaintenanceRequestInput {
  requestId: string;
  organizationId: string;
  status?: MaintenanceStatus;
  assignedToName?: string | null;
  internalNotes?: string | null;
  resolutionNotes?: string | null;
}

export type UpdateMaintenanceRequestOutput = MaintenanceRequest;

export interface MaintenanceRequestDetailOutput {
  request: MaintenanceRequest;
  timeline: MaintenanceTimelineEvent[];
}

export interface ListMaintenanceRequestsFilter {
  organizationId: string;
  unitId?: string;
  status?: string;
}

export interface ListMaintenanceRequestsOutput {
  requests: MaintenanceRequest[];
}
