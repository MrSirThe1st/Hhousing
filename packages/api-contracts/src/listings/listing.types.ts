import type {
  Listing,
  ListingApplication,
  ListingApplicationStatus,
  ListingStatus,
  Property,
  PropertyManagementContext,
  PropertyType,
  Tenant,
  Unit
} from "@hhousing/domain";

export interface UpsertListingInput {
  organizationId: string;
  propertyId: string;
  unitId: string;
  status: ListingStatus;
  marketingDescription?: string | null;
  coverImageUrl?: string | null;
  galleryImageUrls?: string[];
  youtubeUrl?: string | null;
  instagramUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  isFeatured?: boolean;
  showAddress?: boolean;
  showRent?: boolean;
  showDeposit?: boolean;
  showAmenities?: boolean;
  showFeatures?: boolean;
  showBedrooms?: boolean;
  showBathrooms?: boolean;
  showSizeSqm?: boolean;
}

export interface SubmitListingApplicationInput {
  fullName: string;
  email: string;
  phone: string;
  employmentInfo?: string | null;
  monthlyIncome?: number | null;
  notes?: string | null;
}

export interface UpdateListingApplicationInput {
  organizationId: string;
  status: ListingApplicationStatus;
  screeningNotes?: string | null;
  requestedInfoMessage?: string | null;
}

export interface PublicListingFilter {
  q?: string | null;
  city?: string | null;
  minRent?: number | null;
  maxRent?: number | null;
  propertyType?: PropertyType | null;
  featuredOnly?: boolean;
}

export interface PublicListingView {
  listing: Listing;
  property: Property;
  unit: Unit;
  title: string;
  locationLabel: string;
  priceLabel: string;
  sharePath: string;
}

export interface PublicListingDetailOutput {
  item: PublicListingView;
}

export interface PublicListingsOutput {
  items: PublicListingView[];
}

export interface ManagerListingView {
  property: Property;
  unit: Unit;
  listing: Listing | null;
  applicationCount: number;
  lastApplicationAtIso: string | null;
}

export interface ManagerListingsOutput {
  items: ManagerListingView[];
}

export interface ListingApplicationView {
  application: ListingApplication;
  listing: Listing;
  property: Property;
  unit: Unit;
  convertedTenant: Tenant | null;
}

export interface ManagerApplicationsOutput {
  items: ListingApplicationView[];
}

export interface ManagerApplicationsFilter {
  managementContext?: PropertyManagementContext;
}

export interface ConvertListingApplicationOutput {
  application: ListingApplication;
  tenant: Tenant;
}