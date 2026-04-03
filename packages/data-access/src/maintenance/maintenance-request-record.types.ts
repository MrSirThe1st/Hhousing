import type { MaintenanceRequest, MaintenanceStatus, MaintenanceTimelineEvent } from "@hhousing/domain";
import type { ListMaintenanceRequestsFilter } from "@hhousing/api-contracts";

export interface CreateMaintenanceRequestRecordInput {
  id: string;
  organizationId: string;
  unitId: string;
  tenantId: string | null;
  title: string;
  description: string;
  priority: string;
  photoUrls?: string[];
}

export interface UpdateMaintenanceRequestRecordInput {
  requestId: string;
  organizationId: string;
  status?: MaintenanceStatus;
  assignedToName?: string | null;
  internalNotes?: string | null;
  resolutionNotes?: string | null;
}

export interface MaintenanceRequestRepository {
  createMaintenanceRequest(input: CreateMaintenanceRequestRecordInput): Promise<MaintenanceRequest>;
  updateMaintenanceRequest(input: UpdateMaintenanceRequestRecordInput): Promise<MaintenanceRequest | null>;
  listMaintenanceRequests(filter: ListMaintenanceRequestsFilter): Promise<MaintenanceRequest[]>;
  getMaintenanceRequestById(requestId: string, organizationId: string): Promise<MaintenanceRequest | null>;
  listMaintenanceRequestTimeline(
    requestId: string,
    organizationId: string
  ): Promise<MaintenanceTimelineEvent[]>;
  listMaintenanceRequestsByTenantAuthUserId(
    tenantAuthUserId: string,
    organizationId: string
  ): Promise<MaintenanceRequest[]>;
}
