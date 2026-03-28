export interface Tenant {
  id: string;
  organizationId: string;
  authUserId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  createdAtIso: string;
}
