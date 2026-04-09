import type { Organization, OwnerClient, Property, PropertyManagementContext, PropertyType, Unit } from "@hhousing/domain";

export interface CreateOrganizationRecordInput {
  id: string;
  name: string;
}

export interface UpdateOrganizationRecordInput {
  id: string;
  name: string;
  logoUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactWhatsapp: string | null;
  websiteUrl: string | null;
  address: string | null;
  emailSignature: string | null;
}

export interface CreatePropertyRecordInput {
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
}

export interface CreateOwnerClientRecordInput {
  id: string;
  organizationId: string;
  name: string;
}

export interface CreateUnitRecordInput {
  id: string;
  organizationId: string;
  propertyId: string;
  unitNumber: string;
  monthlyRentAmount: number;
  depositAmount: number;
  currencyCode: string;
  bedroomCount: number | null;
  bathroomCount: number | null;
  sizeSqm: number | null;
  amenities: string[];
  features: string[];
}

export interface CreatePropertyWithUnitsRecordInput {
  property: CreatePropertyRecordInput;
  units: CreateUnitRecordInput[];
}

export interface UpdatePropertyRecordInput {
  id: string;
  organizationId: string;
  name: string;
  address: string;
  city: string;
  countryCode: string;
  managementContext: PropertyManagementContext;
  clientId: string | null;
  clientName: string | null;
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
  getOrganizationById(organizationId: string): Promise<Organization | null>;
  updateOrganization(input: UpdateOrganizationRecordInput): Promise<Organization | null>;
  createOwnerClient(input: CreateOwnerClientRecordInput): Promise<OwnerClient>;
  createProperty(input: CreatePropertyRecordInput): Promise<Property>;
  createPropertyWithUnits(input: CreatePropertyWithUnitsRecordInput): Promise<{ property: Property; units: Unit[] }>;
  createUnit(input: CreateUnitRecordInput): Promise<Unit>;
  updateProperty(input: UpdatePropertyRecordInput): Promise<Property | null>;
  updateUnit(input: UpdateUnitRecordInput): Promise<Unit | null>;
  deleteProperty(propertyId: string, organizationId: string): Promise<boolean>;
  deleteUnit(unitId: string, organizationId: string): Promise<boolean>;
  getOwnerClientById(clientId: string, organizationId: string): Promise<OwnerClient | null>;
  getPropertyById(propertyId: string, organizationId: string): Promise<Property | null>;
  getUnitById(unitId: string, organizationId: string): Promise<Unit | null>;
  listOwnerClients(organizationId: string): Promise<OwnerClient[]>;
  listPropertiesWithUnits(
    organizationId: string,
    managementContext?: PropertyManagementContext
  ): Promise<PropertyWithUnitsRecord[]>;
}
