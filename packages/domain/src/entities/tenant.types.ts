export interface Tenant {
  id: string;
  organizationId: string;
  authUserId: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  dateOfBirth: string | null;
  photoUrl: string | null;
  employmentStatus: string | null;
  jobTitle: string | null;
  monthlyIncome: number | null;
  numberOfOccupants: number | null;
  createdAtIso: string;
}
