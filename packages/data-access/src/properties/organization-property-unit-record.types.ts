import type { Organization, Owner, OwnerType, Property, PropertyManagementContext, PropertyType, Unit } from "@hhousing/domain";

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
  ownerId: string;
  propertyType: PropertyType;
  yearBuilt: number | null;
  photoUrls: string[];
  ownerName: string;
  ownerType: OwnerType;
}

export interface CreateOwnerRecordInput {
  id: string;
  organizationId: string;
  name: string;
  fullName: string;
  ownerType: OwnerType;
  userId: string | null;
  address: string | null;
  isCompany: boolean;
  companyName: string | null;
  country: string | null;
  city: string | null;
  state: string | null;
  phoneNumber: string | null;
  profilePictureUrl: string | null;
}

export type CreateOwnerClientRecordInput = CreateOwnerRecordInput;

export interface UpdateOwnerRecordInput {
  id: string;
  organizationId: string;
  name: string;
  fullName: string;
  address: string | null;
  isCompany: boolean;
  companyName: string | null;
  country: string | null;
  city: string | null;
  state: string | null;
  phoneNumber: string | null;
  profilePictureUrl: string | null;
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
  ownerId: string;
  ownerName: string;
  ownerType: OwnerType;
}

export interface ListPropertiesWithUnitsFilter {
  ownerId?: string;
  ownerType?: OwnerType;
  managementContext?: "owned" | "managed";
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
  createOwner(input: CreateOwnerRecordInput): Promise<Owner>;
  createOwnerClient(input: CreateOwnerClientRecordInput): Promise<Owner>;
  updateOwner(input: UpdateOwnerRecordInput): Promise<Owner | null>;
  createProperty(input: CreatePropertyRecordInput): Promise<Property>;
  createPropertyWithUnits(input: CreatePropertyWithUnitsRecordInput): Promise<{ property: Property; units: Unit[] }>;
  createUnit(input: CreateUnitRecordInput): Promise<Unit>;
  updateProperty(input: UpdatePropertyRecordInput): Promise<Property | null>;
  updateUnit(input: UpdateUnitRecordInput): Promise<Unit | null>;
  deleteProperty(propertyId: string, organizationId: string): Promise<boolean>;
  deleteUnit(unitId: string, organizationId: string): Promise<boolean>;
  getOwnerById(ownerId: string, organizationId: string): Promise<Owner | null>;
  getOwnerClientById(ownerId: string, organizationId: string): Promise<Owner | null>;
  getPropertyById(propertyId: string, organizationId: string): Promise<Property | null>;
  getUnitById(unitId: string, organizationId: string): Promise<Unit | null>;
  listOwners(organizationId: string): Promise<Owner[]>;
  listOwnerClients(organizationId: string): Promise<Owner[]>;
  listPropertiesWithUnits(
    organizationId: string,
    filter?: ListPropertiesWithUnitsFilter | PropertyManagementContext
  ): Promise<PropertyWithUnitsRecord[]>;
}
