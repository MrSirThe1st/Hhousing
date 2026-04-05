import type { Organization, Property, PropertyManagementContext, PropertyType, Unit } from "@hhousing/domain";

export interface CreateOrganizationInput {
  name: string;
}

export interface CreateOrganizationOutput {
  organization: Organization;
}

export interface CreatePropertyInput {
  organizationId: string;
  name: string;
  address: string;
  city: string;
  countryCode: string;
  managementContext: PropertyManagementContext;
  propertyType: PropertyType;
  yearBuilt?: number | null;
  photoUrls?: string[];
  clientId?: string | null;
  unitTemplate?: CreatePropertyUnitTemplateInput;
}

export interface CreatePropertyOutput {
  property: Property;
  units: Unit[];
}

export interface CreatePropertyUnitTemplateInput {
  monthlyRentAmount: number;
  depositAmount: number;
  currencyCode: string;
  bedroomCount?: number | null;
  bathroomCount?: number | null;
  sizeSqm?: number | null;
  amenities?: string[];
  features?: string[];
  unitCount?: number;
}

export interface CreateUnitInput {
  organizationId: string;
  propertyId: string;
  unitNumber: string;
  monthlyRentAmount: number;
  depositAmount?: number;
  currencyCode: string;
  bedroomCount?: number | null;
  bathroomCount?: number | null;
  sizeSqm?: number | null;
  amenities?: string[];
  features?: string[];
}

export interface CreateUnitOutput {
  unit: Unit;
}

export interface PropertyWithUnitsView {
  property: Property;
  units: Unit[];
}

export interface ListPropertiesWithUnitsOutput {
  items: PropertyWithUnitsView[];
}

export interface ListPropertiesFilter {
  managementContext?: PropertyManagementContext;
}
