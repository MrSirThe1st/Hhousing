import type { Organization, Property, Unit } from "@hhousing/domain";

export interface CreateOrganizationRecordInput {
  id: string;
  name: string;
}

export interface CreatePropertyRecordInput {
  id: string;
  organizationId: string;
  name: string;
  address: string;
  city: string;
  countryCode: string;
}

export interface CreateUnitRecordInput {
  id: string;
  organizationId: string;
  propertyId: string;
  unitNumber: string;
  monthlyRentAmount: number;
  currencyCode: string;
}

export interface PropertyWithUnitsRecord {
  property: Property;
  units: Unit[];
}

export interface OrganizationPropertyUnitRepository {
  createOrganization(input: CreateOrganizationRecordInput): Promise<Organization>;
  createProperty(input: CreatePropertyRecordInput): Promise<Property>;
  createUnit(input: CreateUnitRecordInput): Promise<Unit>;
  listPropertiesWithUnits(organizationId: string): Promise<PropertyWithUnitsRecord[]>;
}
