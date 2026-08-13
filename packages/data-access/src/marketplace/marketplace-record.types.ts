import type {
  MarketplaceProfile,
  SavedListing,
  UserMarketingPreferences,
  ViewingRequest
} from "@hhousing/domain";
import type { PublicListingView } from "@hhousing/api-contracts";

export interface UpsertMarketplaceProfileInput {
  userId: string;
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface UpdateMarketplaceProfileInput {
  userId: string;
  fullName?: string | null;
  phone?: string | null;
  email?: string | null;
}

export interface UpsertMarketingPreferencesInput {
  userId: string;
  emailNewListings?: boolean;
  emailHarakaNews?: boolean;
  whatsappNewListings?: boolean;
  whatsappHarakaNews?: boolean;
  whatsappPhone?: string | null;
}

export interface SavedListingView {
  saved: SavedListing;
  listing: PublicListingView | null;
  available: boolean;
}

export interface MarketplaceApplicationView {
  applicationId: string;
  listingId: string;
  status: string;
  fullName: string;
  email: string;
  phone: string;
  createdAtIso: string;
  listing: PublicListingView | null;
  available: boolean;
}

export interface MarketplaceViewingRequestView {
  request: ViewingRequest;
  listing: PublicListingView | null;
  available: boolean;
}

export interface MarketplaceRepository {
  getProfileByUserId(userId: string): Promise<MarketplaceProfile | null>;
  upsertProfile(input: UpsertMarketplaceProfileInput): Promise<MarketplaceProfile>;
  updateProfile(input: UpdateMarketplaceProfileInput): Promise<MarketplaceProfile | null>;
  getMarketingPreferences(userId: string): Promise<UserMarketingPreferences | null>;
  upsertMarketingPreferences(input: UpsertMarketingPreferencesInput): Promise<UserMarketingPreferences>;
  listSavedListings(userId: string): Promise<SavedListingView[]>;
  isListingSaved(userId: string, listingId: string): Promise<boolean>;
  listSavedListingIds(userId: string): Promise<string[]>;
  saveListing(id: string, userId: string, listingId: string): Promise<SavedListing>;
  unsaveListing(userId: string, listingId: string): Promise<boolean>;
  listApplicationsForUser(userId: string): Promise<MarketplaceApplicationView[]>;
  listViewingRequestsForUser(userId: string): Promise<MarketplaceViewingRequestView[]>;
}
