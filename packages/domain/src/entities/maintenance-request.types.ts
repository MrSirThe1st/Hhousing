export type MaintenancePriority = "low" | "medium" | "high" | "urgent";
export type MaintenanceStatus = "open" | "in_progress" | "resolved" | "cancelled";

export interface MaintenanceRequest {
  id: string;
  organizationId: string;
  unitId: string;
  tenantId: string | null;
  title: string;
  description: string;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  resolvedAt: string | null; // ISO datetime
  createdAtIso: string;
}
