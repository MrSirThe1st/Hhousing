import type { MaintenanceRequest } from "@hhousing/domain";
import type { ListMaintenanceRequestsFilter } from "@hhousing/api-contracts";

export interface CreateMaintenanceRequestRecordInput {
  id: string;
  organizationId: string;
  unitId: string;
  tenantId: string | null;
  title: string;
  description: string;
  priority: string;
}

export interface UpdateMaintenanceStatusRecordInput {
  requestId: string;
  organizationId: string;
  status: string;
}

export interface MaintenanceRequestRepository {
  createMaintenanceRequest(input: CreateMaintenanceRequestRecordInput): Promise<MaintenanceRequest>;
  updateMaintenanceStatus(input: UpdateMaintenanceStatusRecordInput): Promise<MaintenanceRequest | null>;
  listMaintenanceRequests(filter: ListMaintenanceRequestsFilter): Promise<MaintenanceRequest[]>;
}
