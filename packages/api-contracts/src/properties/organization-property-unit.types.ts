import type { Organization, Property, Unit } from "@hhousing/domain";

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
}

export interface CreatePropertyOutput {
  property: Property;
}

export interface CreateUnitInput {
  organizationId: string;
  propertyId: string;
  unitNumber: string;
  monthlyRentAmount: number;
  currencyCode: string;
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
