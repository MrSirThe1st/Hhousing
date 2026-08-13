export interface MarketplaceProfile {
  userId: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  createdAtIso: string;
  updatedAtIso: string;
}

export interface UserMarketingPreferences {
  userId: string;
  emailNewListings: boolean;
  emailHarakaNews: boolean;
  whatsappNewListings: boolean;
  whatsappHarakaNews: boolean;
  whatsappPhone: string | null;
  emailOptedInAtIso: string | null;
  emailOptedOutAtIso: string | null;
  whatsappOptedInAtIso: string | null;
  whatsappOptedOutAtIso: string | null;
  updatedAtIso: string;
}

export interface SavedListing {
  id: string;
  userId: string;
  listingId: string;
  createdAtIso: string;
}

export type ViewingRequestStatus =
  | "submitted"
  | "contacted"
  | "scheduled"
  | "completed"
  | "cancelled";

export interface ViewingRequest {
  id: string;
  listingId: string;
  organizationId: string;
  userId: string | null;
  fullName: string;
  email: string;
  phone: string;
  preferredDate: string | null;
  message: string | null;
  status: ViewingRequestStatus;
  createdAtIso: string;
  updatedAtIso: string;
}
