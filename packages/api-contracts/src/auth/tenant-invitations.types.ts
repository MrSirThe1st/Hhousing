export interface CreateTenantInvitationOutput {
  invitationId: string;
  tenantId: string;
  email: string;
  expiresAtIso: string;
  activationLink: string;
}

export interface TenantInvitationPreview {
  invitationId: string;
  tenantId: string;
  organizationId: string;
  organizationName: string;
  tenantFullName: string;
  tenantEmail: string;
  tenantPhone: string | null;
  leaseId: string | null;
  unitId: string | null;
  leaseStartDate: string | null;
  leaseEndDate: string | null;
  monthlyRentAmount: number | null;
  currencyCode: string | null;
  expiresAtIso: string;
}

export interface ValidateTenantInvitationOutput {
  invitation: TenantInvitationPreview;
}

export interface AcceptTenantInvitationInput {
  token: string;
  password: string;
  phone?: string | null;
}

export interface AcceptTenantInvitationOutput {
  tenantId: string;
  userId: string;
  organizationId: string;
  membershipId: string;
}