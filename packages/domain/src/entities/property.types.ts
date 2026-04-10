export type PropertyStatus = "active" | "archived";

export type PropertyManagementContext = "owned" | "managed";

export type PropertyType = "single_unit" | "multi_unit";

export type PropertyOwnerType = "organization" | "client";

export interface Property {
  id: string;
  organizationId: string;
  name: string;
  address: string;
  city: string;
  countryCode: string;
  propertyType: PropertyType;
  yearBuilt: number | null;
  photoUrls: string[];
  ownerId: string;
  ownerName: string;
  ownerType: PropertyOwnerType;
  managementContext: PropertyManagementContext;
  clientId: string | null;
  clientName: string | null;
  status: PropertyStatus;
  createdAtIso: string;
}
