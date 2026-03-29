export type UserRole = "tenant" | "landlord" | "property_manager" | "platform_admin";

export type MembershipStatus = "active" | "invited" | "inactive";

export interface MembershipCapabilities {
  canOwnProperties: boolean;
}

export interface OrganizationMembership {
  id: string;
  userId: string;
  organizationId: string;
  organizationName: string;
  role: UserRole;
  status: MembershipStatus;
  capabilities: MembershipCapabilities;
  createdAtIso: string;
}