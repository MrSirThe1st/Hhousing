export type ListingApplicationStatus =
  | "submitted"
  | "under_review"
  | "approved"
  | "rejected"
  | "needs_more_info"
  | "converted";

export interface ListingApplication {
  id: string;
  listingId: string;
  organizationId: string;
  fullName: string;
  email: string;
  phone: string;
  employmentInfo: string | null;
  monthlyIncome: number | null;
  notes: string | null;
  status: ListingApplicationStatus;
  screeningNotes: string | null;
  requestedInfoMessage: string | null;
  reviewedByUserId: string | null;
  reviewedAtIso: string | null;
  convertedTenantId: string | null;
  createdAtIso: string;
  updatedAtIso: string;
}