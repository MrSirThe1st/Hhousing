export type ListingStatus = "draft" | "published";

export interface ListingVisibility {
  showAddress: boolean;
  showRent: boolean;
  showDeposit: boolean;
  showAmenities: boolean;
  showFeatures: boolean;
  showBedrooms: boolean;
  showBathrooms: boolean;
  showSizeSqm: boolean;
}

export interface Listing {
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
  visibility: ListingVisibility;
  publishedAtIso: string | null;
  createdByUserId: string;
  updatedByUserId: string;
  createdAtIso: string;
  updatedAtIso: string;
}