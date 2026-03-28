export type OrganizationStatus = "active" | "suspended";

export interface Organization {
  id: string;
  name: string;
  status: OrganizationStatus;
  createdAtIso: string;
}
