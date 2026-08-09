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

export interface DashboardUrgentMaintenanceSnapshot {
  urgentCount: number;
  topTitle: string | null;
  items: Array<{ id: string; title: string }>;
}

export interface MaintenanceRequestRepository {
  createMaintenanceRequest(input: CreateMaintenanceRequestRecordInput): Promise<MaintenanceRequest>;
  updateMaintenanceRequest(input: UpdateMaintenanceRequestRecordInput): Promise<MaintenanceRequest | null>;
  listMaintenanceRequests(filter: ListMaintenanceRequestsFilter & { limit?: number }): Promise<MaintenanceRequest[]>;
  listMaintenanceRequestsPage(input: {
    organizationId: string;
    unitId?: string | null;
    status?: string | null;
    limit: number;
    cursor?: string | null;
  }): Promise<{ requests: MaintenanceRequest[]; nextCursor: string | null }>;
  getMaintenanceStatusCounts(organizationId: string): Promise<{
    total: number;
    open: number;
    inProgress: number;
    resolved: number;
    cancelled: number;
    urgent: number;
  }>;
  getMaintenanceRequestById(requestId: string, organizationId: string): Promise<MaintenanceRequest | null>;
  listMaintenanceRequestTimeline(
    requestId: string,
    organizationId: string
  ): Promise<MaintenanceTimelineEvent[]>;
  listMaintenanceRequestsByTenantAuthUserId(
    tenantAuthUserId: string,
    organizationId: string
  ): Promise<MaintenanceRequest[]>;
  getDashboardUrgentMaintenanceSnapshot(
    organizationId: string,
    limit: number
  ): Promise<DashboardUrgentMaintenanceSnapshot>;
  countActiveMaintenanceRequests(organizationId: string): Promise<number>;
}
