export type TenantAccountStatus = "active" | "pending_deletion" | "deleted";

export interface Tenant {
  id: string;
  organizationId: string;
  authUserId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  whatsappNumber: string | null;
  whatsappOptIn: boolean;
  dateOfBirth: string | null;
  photoUrl: string | null;
  employmentStatus: string | null;
  jobTitle: string | null;
  monthlyIncome: number | null;
  numberOfOccupants: number | null;
  accountStatus: TenantAccountStatus;
  deletionRequestedAtIso: string | null;
  deletedAtIso: string | null;
  createdAtIso: string;
}
