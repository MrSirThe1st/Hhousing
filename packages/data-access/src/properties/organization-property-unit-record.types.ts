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

export interface UpdatePropertyRecordInput {
  id: string;
  organizationId: string;
  name: string;
  address: string;
  city: string;
  countryCode: string;
}

export interface UpdateUnitRecordInput {
  id: string;
  organizationId: string;
  propertyId: string;
  unitNumber: string;
  monthlyRentAmount: number;
  currencyCode: string;
  status: "vacant" | "occupied" | "inactive";
}

export interface PropertyWithUnitsRecord {
  property: Property;
  units: Unit[];
}

export interface OrganizationPropertyUnitRepository {
  createOrganization(input: CreateOrganizationRecordInput): Promise<Organization>;
  createProperty(input: CreatePropertyRecordInput): Promise<Property>;
  createUnit(input: CreateUnitRecordInput): Promise<Unit>;
  updateProperty(input: UpdatePropertyRecordInput): Promise<Property | null>;
  updateUnit(input: UpdateUnitRecordInput): Promise<Unit | null>;
  deleteProperty(propertyId: string, organizationId: string): Promise<boolean>;
  deleteUnit(unitId: string, organizationId: string): Promise<boolean>;
  getPropertyById(propertyId: string, organizationId: string): Promise<Property | null>;
  getUnitById(unitId: string, organizationId: string): Promise<Unit | null>;
  listPropertiesWithUnits(organizationId: string): Promise<PropertyWithUnitsRecord[]>;
}
