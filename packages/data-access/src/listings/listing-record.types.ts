import type {
  Listing,
  ListingApplication,
  ListingApplicationStatus,
  ListingStatus,
  PropertyManagementContext,
  Tenant
} from "@hhousing/domain";
import type {
  ListingApplicationView,
  ManagerListingView,
  PublicListingFilter,
  PublicListingView
} from "@hhousing/api-contracts";

export interface UpsertListingRecordInput {
  id: string;
  organizationId: string;
  propertyId: string;
  unitId: string;
  status: ListingStatus;
  marketingDescription: string | null;
  coverImageUrl: string | null;
  galleryImageUrls: string[];
  youtubeUrl: string | null;
  instagramUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  isFeatured: boolean;
  showAddress: boolean;
  showRent: boolean;
  showDeposit: boolean;
  showAmenities: boolean;
  showFeatures: boolean;
  showBedrooms: boolean;
  showBathrooms: boolean;
  showSizeSqm: boolean;
  publishedAtIso: string | null;
  createdByUserId: string;
  updatedByUserId: string;
}

export interface CreateListingApplicationRecordInput {
  id: string;
  listingId: string;
  organizationId: string;
  fullName: string;
  email: string;
  phone: string;
  employmentInfo: string | null;
  monthlyIncome: number | null;
  notes: string | null;
}

export interface UpdateListingApplicationStatusRecordInput {
  applicationId: string;
  organizationId: string;
  status: ListingApplicationStatus;
  screeningNotes: string | null;
  requestedInfoMessage: string | null;
  reviewedByUserId: string;
  reviewedAtIso: string;
}

export interface ListingRepository {
  upsertListing(input: UpsertListingRecordInput): Promise<Listing>;
  getListingById(listingId: string, organizationId: string): Promise<Listing | null>;
  getListingByUnitId(unitId: string, organizationId: string): Promise<Listing | null>;
  listManagerListings(organizationId: string, managementContext?: PropertyManagementContext): Promise<ManagerListingView[]>;
  listPublicListings(filter?: PublicListingFilter): Promise<PublicListingView[]>;
  getPublicListingById(listingId: string): Promise<PublicListingView | null>;
  createApplication(input: CreateListingApplicationRecordInput): Promise<ListingApplication>;
  getApplicationById(applicationId: string, organizationId: string): Promise<ListingApplicationView | null>;
  listApplications(organizationId: string, managementContext?: PropertyManagementContext): Promise<ListingApplicationView[]>;
  updateApplicationStatus(input: UpdateListingApplicationStatusRecordInput): Promise<ListingApplication | null>;
  markApplicationConverted(applicationId: string, organizationId: string, tenantId: string): Promise<ListingApplication | null>;
  getConvertedTenant(applicationId: string, organizationId: string): Promise<Tenant | null>;
}