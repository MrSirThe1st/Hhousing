export type PropertyStatus = "active" | "archived";

export type PropertyManagementContext = "owned" | "managed";

export type PropertyType = "single_unit" | "multi_unit";

export interface Property {
  id: string;
  organizationId: string;
  name: string;
  address: string;
  city: string;
  countryCode: string;
  managementContext: PropertyManagementContext;
  propertyType: PropertyType;
  yearBuilt: number | null;
  photoUrls: string[];
  clientId: string | null;
  clientName: string | null;
  status: PropertyStatus;
  createdAtIso: string;
}
