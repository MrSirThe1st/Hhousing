import { Pool, type PoolClient, type QueryResultRow } from "pg";
import type { ApiResult } from "@hhousing/api-contracts";
import type { Organization, Owner, OwnerType, Property, Unit } from "@hhousing/domain";
import type { PropertyManagementContext } from "@hhousing/domain";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env";
import type {
  CreateOwnerRecordInput,
  CreateOrganizationRecordInput,
  CreatePropertyRecordInput,
  CreatePropertyWithUnitsRecordInput,
  CreateUnitRecordInput,
  ListPropertiesWithUnitsFilter,
  UpdateOrganizationRecordInput,
  UpdatePropertyRecordInput,
  UpdateUnitRecordInput,
  OrganizationPropertyUnitRepository,
  PropertyWithUnitsRecord
} from "./organization-property-unit-record.types";

interface OrganizationRow extends QueryResultRow {
  id: string;
  name: string;
  logo_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  contact_whatsapp: string | null;
  website_url: string | null;
  address: string | null;
  email_signature: string | null;
  status: "active" | "suspended";
  created_at: Date | string;
}

interface PropertyRow extends QueryResultRow {
  id: string;
  organization_id: string;
  organization_name: string | null;
  name: string;
  address: string;
  city: string;
  country_code: string;
  management_context: PropertyManagementContext;
  property_type: "single_unit" | "multi_unit";
  year_built: number | null;
  photo_urls: string[];
  client_id: string | null;
  client_name: string | null;
  status: "active" | "archived";
  created_at: Date | string;
}

interface OwnerRow extends QueryResultRow {
  id: string;
  organization_id: string;
  name: string;
  full_name: string;
  owner_type?: OwnerType;
  user_id?: string | null;
  address: string | null;
  is_company: boolean;
  company_name: string | null;
  country: string | null;
  city: string | null;
  state: string | null;
  phone_number: string | null;
  profile_picture_url: string | null;
  created_at: Date | string;
}

interface UnitRow extends QueryResultRow {
  id: string;
  organization_id: string;
  property_id: string;
  unit_number: string;
  monthly_rent_amount: string | number;
  deposit_amount: string | number;
  currency_code: string;
  bedroom_count: number | null;
  bathroom_count: string | number | null;
  size_sqm: string | number | null;
  amenities: string[];
  features: string[];
  status: "vacant" | "occupied" | "inactive";
  created_at: Date | string;
}

interface PropertyWithUnitRow extends QueryResultRow {
  property_id: string;
  property_organization_id: string;
  property_organization_name: string | null;
  property_name: string;
  property_address: string;
  property_city: string;
  property_country_code: string;
  property_management_context: PropertyManagementContext;
  property_type: "single_unit" | "multi_unit";
  property_year_built: number | null;
  property_photo_urls: string[];
  property_client_id: string | null;
  property_client_name: string | null;
  property_status: "active" | "archived";
  property_created_at: Date | string;
  unit_id: string | null;
  unit_organization_id: string | null;
  unit_property_id: string | null;
  unit_number: string | null;
  unit_monthly_rent_amount: string | number | null;
  unit_deposit_amount: string | number | null;
  unit_currency_code: string | null;
  unit_bedroom_count: number | null;
  unit_bathroom_count: string | number | null;
  unit_size_sqm: string | number | null;
  unit_amenities: string[] | null;
  unit_features: string[] | null;
  unit_status: "vacant" | "occupied" | "inactive" | null;
  unit_created_at: Date | string | null;
}

export interface DatabaseQueryable {
  query<Row extends QueryResultRow>(
    text: string,
    values?: readonly unknown[]
  ): Promise<{ rows: Row[]; rowCount?: number | null }>;
}

interface TransactionCapableClient extends DatabaseQueryable {
  connect?: () => Promise<PoolClient>;
}

const poolCache = new Map<string, Pool>();
let propertyStorageSchemaPromise: Promise<PropertyStorageSchema> | null = null;

interface PropertyStorageSchema {
  relationIdColumn: "client_id" | "owner_id";
  relationNameColumn: "client_name" | "owner_name";
  ownersTable: "owner_clients" | "owners";
  ownerProfileColumns: {
    fullName: boolean;
    address: boolean;
    isCompany: boolean;
    companyName: boolean;
    country: boolean;
    city: boolean;
    state: boolean;
    phoneNumber: boolean;
    profilePictureUrl: boolean;
  };
}

async function getPropertyStorageSchema(client: DatabaseQueryable): Promise<PropertyStorageSchema> {
  if (!propertyStorageSchemaPromise) {
    propertyStorageSchemaPromise = (async () => {
      const [columnResult, tableResult, ownerColumnResult] = await Promise.all([
        client.query<{ column_name: string }>(
          `select column_name
           from information_schema.columns
           where table_schema = current_schema()
             and table_name = 'properties'
             and column_name in ('client_id', 'client_name', 'owner_id', 'owner_name')`
        ),
        client.query<{ table_name: string; column_name?: string }>(
          `select table_name
           from information_schema.tables
           where table_schema = current_schema()
             and table_name in ('owner_clients', 'owners')`
        ),
        client.query<{ column_name: string }>(
          `select column_name
           from information_schema.columns
           where table_schema = current_schema()
             and table_name = 'owners'
             and column_name in ('full_name', 'address', 'is_company', 'company_name', 'country', 'city', 'state', 'phone_number', 'profile_picture_url')`
        )
      ]);

      const columnNames = new Set(columnResult.rows.map((row) => row.column_name));
      const tableNames = new Set(tableResult.rows.map((row) => row.table_name));
      const ownerColumnNames = new Set(ownerColumnResult.rows.map((row) => row.column_name));

      return {
        relationIdColumn: columnNames.has("owner_id") ? "owner_id" : "client_id",
        relationNameColumn: columnNames.has("owner_name") ? "owner_name" : "client_name",
        ownersTable: tableNames.has("owners") ? "owners" : "owner_clients",
        ownerProfileColumns: {
          fullName: ownerColumnNames.has("full_name"),
          address: ownerColumnNames.has("address"),
          isCompany: ownerColumnNames.has("is_company"),
          companyName: ownerColumnNames.has("company_name"),
          country: ownerColumnNames.has("country"),
          city: ownerColumnNames.has("city"),
          state: ownerColumnNames.has("state"),
          phoneNumber: ownerColumnNames.has("phone_number"),
          profilePictureUrl: ownerColumnNames.has("profile_picture_url")
        }
      };
    })();
  }

  return propertyStorageSchemaPromise;
}

function relationIdAlias(schema: PropertyStorageSchema, tableAlias = "p"): string {
  return `${tableAlias}.${schema.relationIdColumn} as client_id`;
}

function relationNameAlias(schema: PropertyStorageSchema, tableAlias = "p"): string {
  return `${tableAlias}.${schema.relationNameColumn} as client_name`;
}

function ownerRelationIdAlias(schema: PropertyStorageSchema, tableAlias = "p"): string {
  return `${tableAlias}.${schema.relationIdColumn} as property_client_id`;
}

function ownerRelationNameAlias(schema: PropertyStorageSchema, tableAlias = "p"): string {
  return `${tableAlias}.${schema.relationNameColumn} as property_client_name`;
}

function ownerSelectList(schema: PropertyStorageSchema, tableAlias?: string): string {
  const prefix = tableAlias ? `${tableAlias}.` : "";

  return [
    `${prefix}id`,
    `${prefix}organization_id`,
    `${prefix}name`,
    schema.ownersTable === "owners" ? `${prefix}owner_type` : `'client'::text as owner_type`,
    schema.ownersTable === "owners" ? `${prefix}user_id` : `null::text as user_id`,
    schema.ownerProfileColumns.fullName ? `${prefix}full_name` : `${prefix}name as full_name`,
    schema.ownerProfileColumns.address ? `${prefix}address` : `null::text as address`,
    schema.ownerProfileColumns.isCompany ? `${prefix}is_company` : `false as is_company`,
    schema.ownerProfileColumns.companyName ? `${prefix}company_name` : `null::text as company_name`,
    schema.ownerProfileColumns.country ? `${prefix}country` : `null::text as country`,
    schema.ownerProfileColumns.city ? `${prefix}city` : `null::text as city`,
    schema.ownerProfileColumns.state ? `${prefix}state` : `null::text as state`,
    schema.ownerProfileColumns.phoneNumber ? `${prefix}phone_number` : `null::text as phone_number`,
    schema.ownerProfileColumns.profilePictureUrl ? `${prefix}profile_picture_url` : `null::text as profile_picture_url`,
    `${prefix}created_at`
  ].join(", ");
}

function createOrganizationOwner(organization: Organization): Owner {
  return {
    id: getOrganizationOwnerId(organization.id),
    organizationId: organization.id,
    name: organization.name,
    fullName: organization.name,
    ownerType: "organization",
    userId: null,
    address: organization.address,
    isCompany: true,
    companyName: organization.name,
    country: null,
    city: null,
    state: null,
    phoneNumber: organization.contactPhone ?? organization.contactWhatsapp,
    profilePictureUrl: organization.logoUrl,
    createdAtIso: organization.createdAtIso
  };
}

function getOrganizationOwnerId(organizationId: string): string {
  return `own_org_${organizationId}`;
}

function mapManagementContextToOwnerType(value: PropertyManagementContext): OwnerType {
  return value === "owned" ? "organization" : "client";
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

function mapOrganization(row: OrganizationRow): Organization {
  return {
    id: row.id,
    name: row.name,
    logoUrl: row.logo_url,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    contactWhatsapp: row.contact_whatsapp,
    websiteUrl: row.website_url,
    address: row.address,
    emailSignature: row.email_signature,
    status: row.status,
    createdAtIso: toIso(row.created_at)
  };
}

function mapProperty(row: PropertyRow): Property {
  const ownerType = mapManagementContextToOwnerType(row.management_context);
  const ownerId = ownerType === "organization" ? getOrganizationOwnerId(row.organization_id) : (row.client_id ?? getOrganizationOwnerId(row.organization_id));
  const ownerName = ownerType === "organization" ? (row.organization_name ?? "") : (row.client_name ?? "Owner client");
  const clientId = ownerType === "client" ? row.client_id : null;
  const clientName = ownerType === "client" ? row.client_name : null;

  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    address: row.address,
    city: row.city,
    countryCode: row.country_code,
    managementContext: row.management_context,
    propertyType: row.property_type,
    yearBuilt: row.year_built,
    photoUrls: row.photo_urls,
    ownerId,
    ownerName,
    ownerType,
    clientId,
    clientName,
    status: row.status,
    createdAtIso: toIso(row.created_at)
  };
}

function mapOwner(row: OwnerRow): Owner {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    fullName: row.full_name,
    ownerType: row.owner_type ?? "client",
    userId: row.user_id ?? null,
    address: row.address,
    isCompany: row.is_company,
    companyName: row.company_name,
    country: row.country,
    city: row.city,
    state: row.state,
    phoneNumber: row.phone_number,
    profilePictureUrl: row.profile_picture_url,
    createdAtIso: toIso(row.created_at)
  };
}

function mapUnit(row: UnitRow): Unit {
  return {
    id: row.id,
    organizationId: row.organization_id,
    propertyId: row.property_id,
    unitNumber: row.unit_number,
    monthlyRentAmount: toNumber(row.monthly_rent_amount),
    depositAmount: toNumber(row.deposit_amount),
    currencyCode: row.currency_code,
    bedroomCount: row.bedroom_count,
    bathroomCount: row.bathroom_count === null ? null : toNumber(row.bathroom_count),
    sizeSqm: row.size_sqm === null ? null : toNumber(row.size_sqm),
    amenities: row.amenities,
    features: row.features,
    status: row.status,
    createdAtIso: toIso(row.created_at)
  };
}

async function withTransaction<T>(
  databaseClient: TransactionCapableClient,
  operation: (queryable: DatabaseQueryable) => Promise<T>
): Promise<T> {
  if (!databaseClient.connect) {
    return operation(databaseClient);
  }

  const connection = await databaseClient.connect();

  try {
    await connection.query("begin");
    const result = await operation(connection);
    await connection.query("commit");
    return result;
  } catch (error) {
    await connection.query("rollback");
    throw error;
  } finally {
    connection.release();
  }
}

function getOrCreatePool(connectionString: string): Pool {
  const existing = poolCache.get(connectionString);
  if (existing) {
    return existing;
  }

  const pool = new Pool({
    connectionString,
    max: 5
  });

  poolCache.set(connectionString, pool);
  return pool;
}

export function createPostgresOrganizationPropertyUnitRepository(
  client: DatabaseQueryable
): OrganizationPropertyUnitRepository {
  const transactionCapableClient = client as TransactionCapableClient;

  return {
    async createOrganization(input: CreateOrganizationRecordInput): Promise<Organization> {
      const result = await client.query<OrganizationRow>(
        `insert into organizations (id, name)
         values ($1, $2)
         returning id, name, logo_url, contact_email, contact_phone, contact_whatsapp, website_url, address, email_signature, status, created_at`,
        [input.id, input.name]
      );

      return mapOrganization(result.rows[0]);
    },
    async getOrganizationById(organizationId: string): Promise<Organization | null> {
      const result = await client.query<OrganizationRow>(
        `select id, name, logo_url, contact_email, contact_phone, contact_whatsapp, website_url, address, email_signature, status, created_at
         from organizations
         where id = $1`,
        [organizationId]
      );

      return result.rows[0] ? mapOrganization(result.rows[0]) : null;
    },
    async updateOrganization(input: UpdateOrganizationRecordInput): Promise<Organization | null> {
      const result = await client.query<OrganizationRow>(
        `update organizations
         set name = $2,
             logo_url = $3,
             contact_email = $4,
             contact_phone = $5,
             contact_whatsapp = $6,
             website_url = $7,
             address = $8,
             email_signature = $9
         where id = $1
         returning id, name, logo_url, contact_email, contact_phone, contact_whatsapp, website_url, address, email_signature, status, created_at`,
        [
          input.id,
          input.name,
          input.logoUrl,
          input.contactEmail,
          input.contactPhone,
          input.contactWhatsapp,
          input.websiteUrl,
          input.address,
          input.emailSignature
        ]
      );

      return result.rows[0] ? mapOrganization(result.rows[0]) : null;
    },
    async createOwner(input: CreateOwnerRecordInput): Promise<Owner> {
      const schema = await getPropertyStorageSchema(client);
      const values: Array<string | boolean | null> = [input.id, input.organizationId, input.name];
      const columns = ["id", "organization_id", "name"];

      if (schema.ownersTable === "owners") {
        columns.push("owner_type", "user_id");
        values.push(input.ownerType, input.userId);

        if (schema.ownerProfileColumns.fullName) {
          columns.push("full_name");
          values.push(input.fullName);
        }

        if (schema.ownerProfileColumns.address) {
          columns.push("address");
          values.push(input.address);
        }

        if (schema.ownerProfileColumns.isCompany) {
          columns.push("is_company");
          values.push(input.isCompany);
        }

        if (schema.ownerProfileColumns.companyName) {
          columns.push("company_name");
          values.push(input.companyName);
        }

        if (schema.ownerProfileColumns.country) {
          columns.push("country");
          values.push(input.country);
        }

        if (schema.ownerProfileColumns.city) {
          columns.push("city");
          values.push(input.city);
        }

        if (schema.ownerProfileColumns.state) {
          columns.push("state");
          values.push(input.state);
        }

        if (schema.ownerProfileColumns.phoneNumber) {
          columns.push("phone_number");
          values.push(input.phoneNumber);
        }

        if (schema.ownerProfileColumns.profilePictureUrl) {
          columns.push("profile_picture_url");
          values.push(input.profilePictureUrl);
        }
      }

      const result = await client.query<OwnerRow>(
        `insert into ${schema.ownersTable} (${columns.join(", ")})
         values (${columns.map((_, index) => `$${index + 1}`).join(", ")})
         returning ${ownerSelectList(schema)}`,
        values
      );

      return mapOwner(result.rows[0]);
    },
    async createOwnerClient(input: CreateOwnerRecordInput): Promise<Owner> {
      return this.createOwner(input);
    },
    async createProperty(input: CreatePropertyRecordInput): Promise<Property> {
      const schema = await getPropertyStorageSchema(client);
      const result = await client.query<PropertyRow>(
        `insert into properties (
          id,
          organization_id,
          name,
          address,
          city,
          country_code,
          management_context,
          property_type,
          year_built,
          photo_urls,
          ${schema.relationIdColumn},
          ${schema.relationNameColumn}
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        returning id, organization_id, (select name from organizations where id = organization_id) as organization_name, name, address, city, country_code, management_context, property_type, year_built, photo_urls, ${relationIdAlias(schema)}, ${relationNameAlias(schema)}, status, created_at`,
        [
          input.id,
          input.organizationId,
          input.name,
          input.address,
          input.city,
          input.countryCode,
          input.ownerType === "organization" ? "owned" : "managed",
          input.propertyType,
          input.yearBuilt,
          input.photoUrls,
          input.ownerType === "client" ? input.ownerId : null,
          input.ownerType === "client" ? input.ownerName : null
        ]
      );

      return mapProperty(result.rows[0]);
    },
    async createPropertyWithUnits(
      input: CreatePropertyWithUnitsRecordInput
    ): Promise<{ property: Property; units: Unit[] }> {
      return withTransaction(transactionCapableClient, async (queryable) => {
        const schema = await getPropertyStorageSchema(queryable);
        const propertyResult = await queryable.query<PropertyRow>(
          `insert into properties (
            id,
            organization_id,
            name,
            address,
            city,
            country_code,
            management_context,
            property_type,
            year_built,
            photo_urls,
            ${schema.relationIdColumn},
            ${schema.relationNameColumn}
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          returning id, organization_id, (select name from organizations where id = organization_id) as organization_name, name, address, city, country_code, management_context, property_type, year_built, photo_urls, ${relationIdAlias(schema)}, ${relationNameAlias(schema)}, status, created_at`,
          [
            input.property.id,
            input.property.organizationId,
            input.property.name,
            input.property.address,
            input.property.city,
            input.property.countryCode,
            input.property.ownerType === "organization" ? "owned" : "managed",
            input.property.propertyType,
            input.property.yearBuilt,
            input.property.photoUrls,
            input.property.ownerType === "client" ? input.property.ownerId : null,
            input.property.ownerType === "client" ? input.property.ownerName : null
          ]
        );

        const property = mapProperty(propertyResult.rows[0]);
        const units: Unit[] = [];

        for (const unitInput of input.units) {
          const unitResult = await queryable.query<UnitRow>(
            `insert into units (
              id,
              organization_id,
              property_id,
              unit_number,
              monthly_rent_amount,
              deposit_amount,
              currency_code,
              bedroom_count,
              bathroom_count,
              size_sqm,
              amenities,
              features
            ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
            returning id, organization_id, property_id, unit_number, monthly_rent_amount, deposit_amount, currency_code, bedroom_count, bathroom_count, size_sqm, amenities, features, status, created_at`,
            [
              unitInput.id,
              unitInput.organizationId,
              unitInput.propertyId,
              unitInput.unitNumber,
              unitInput.monthlyRentAmount,
              unitInput.depositAmount,
              unitInput.currencyCode,
              unitInput.bedroomCount,
              unitInput.bathroomCount,
              unitInput.sizeSqm,
              unitInput.amenities,
              unitInput.features
            ]
          );

          units.push(mapUnit(unitResult.rows[0]));
        }

        return { property, units };
      });
    },
    async createUnit(input: CreateUnitRecordInput): Promise<Unit> {
      const result = await client.query<UnitRow>(
        `insert into units (
          id,
          organization_id,
          property_id,
          unit_number,
          monthly_rent_amount,
          deposit_amount,
          currency_code,
          bedroom_count,
          bathroom_count,
          size_sqm,
          amenities,
          features
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        returning id, organization_id, property_id, unit_number, monthly_rent_amount, deposit_amount, currency_code, bedroom_count, bathroom_count, size_sqm, amenities, features, status, created_at`,
        [
          input.id,
          input.organizationId,
          input.propertyId,
          input.unitNumber,
          input.monthlyRentAmount,
          input.depositAmount,
          input.currencyCode,
          input.bedroomCount,
          input.bathroomCount,
          input.sizeSqm,
          input.amenities,
          input.features
        ]
      );

      return mapUnit(result.rows[0]);
    },
    async updateProperty(input: UpdatePropertyRecordInput): Promise<Property | null> {
      const schema = await getPropertyStorageSchema(client);
      const result = await client.query<PropertyRow>(
        `update properties
         set name = $1,
             address = $2,
             city = $3,
             country_code = $4,
             management_context = $5,
             ${schema.relationIdColumn} = $6,
             ${schema.relationNameColumn} = $7
           where id = $8 and organization_id = $9
         returning id, organization_id, (select name from organizations where id = organization_id) as organization_name, name, address, city, country_code, management_context, property_type, year_built, photo_urls, ${relationIdAlias(schema)}, ${relationNameAlias(schema)}, status, created_at`,
        [
          input.name,
          input.address,
          input.city,
          input.countryCode,
          input.ownerType === "organization" ? "owned" : "managed",
          input.ownerType === "client" ? input.ownerId : null,
          input.ownerType === "client" ? input.ownerName : null,
          input.id,
          input.organizationId
        ]
      );

      return result.rows[0] ? mapProperty(result.rows[0]) : null;
    },
    async updateUnit(input: UpdateUnitRecordInput): Promise<Unit | null> {
      const result = await client.query<UnitRow>(
        `update units
         set unit_number = $1, monthly_rent_amount = $2, currency_code = $3, status = $4
         where id = $5 and organization_id = $6
         returning *`,
        [input.unitNumber, input.monthlyRentAmount, input.currencyCode, input.status, input.id, input.organizationId]
      );

      return result.rows[0] ? mapUnit(result.rows[0]) : null;
    },
    async deleteProperty(propertyId: string, organizationId: string): Promise<boolean> {
      const result = await client.query(
        `delete from properties where id = $1 and organization_id = $2`,
        [propertyId, organizationId]
      );

      return (result.rowCount ?? 0) > 0;
    },
    async deleteUnit(unitId: string, organizationId: string): Promise<boolean> {
      const result = await client.query(
        `delete from units where id = $1 and organization_id = $2`,
        [unitId, organizationId]
      );

      return (result.rowCount ?? 0) > 0;
    },
    async getOwnerById(ownerId: string, organizationId: string): Promise<Owner | null> {
      if (ownerId === getOrganizationOwnerId(organizationId)) {
        const organization = await this.getOrganizationById(organizationId);
        if (!organization) {
          return null;
        }

        return {
          ...createOrganizationOwner(organization),
          id: getOrganizationOwnerId(organizationId)
        };
      }

      const schema = await getPropertyStorageSchema(client);
      const result = await client.query<OwnerRow>(
        schema.ownersTable === "owners"
           ? `select ${ownerSelectList(schema, "owners")}
             from owners
             where id = $1 and organization_id = $2`
           : `select ${ownerSelectList(schema, "owner_clients")}
             from owner_clients
             where id = $1 and organization_id = $2`,
        [ownerId, organizationId]
      );

      return result.rows[0] ? mapOwner(result.rows[0]) : null;
    },
    async getOwnerClientById(ownerId: string, organizationId: string): Promise<Owner | null> {
      return this.getOwnerById(ownerId, organizationId);
    },
    async getPropertyById(propertyId: string, organizationId: string): Promise<Property | null> {
      const schema = await getPropertyStorageSchema(client);
      const result = await client.query<PropertyRow>(
        `select
           id,
           organization_id,
            (select name from organizations where id = properties.organization_id) as organization_name,
           name,
           address,
           city,
           country_code,
           management_context,
           property_type,
           year_built,
           photo_urls,
           ${relationIdAlias(schema, "properties")},
           ${relationNameAlias(schema, "properties")},
           status,
           created_at
         from properties
         where id = $1 and organization_id = $2`,
        [propertyId, organizationId]
      );

      return result.rows[0] ? mapProperty(result.rows[0]) : null;
    },
    async getUnitById(unitId: string, organizationId: string): Promise<Unit | null> {
      const result = await client.query<UnitRow>(
        `select * from units where id = $1 and organization_id = $2`,
        [unitId, organizationId]
      );

      return result.rows[0] ? mapUnit(result.rows[0]) : null;
    },
    async listOwners(organizationId: string): Promise<Owner[]> {
      const schema = await getPropertyStorageSchema(client);
      const [organization, result] = await Promise.all([
        this.getOrganizationById(organizationId),
        client.query<OwnerRow>(
          schema.ownersTable === "owners"
            ? `select ${ownerSelectList(schema, "owners")}
               from owners
              where organization_id = $1 and owner_type = 'client'
               order by name asc, created_at desc`
            : `select ${ownerSelectList(schema, "owner_clients")}
               from owner_clients
               where organization_id = $1
               order by name asc, created_at desc`,
          [organizationId]
        )
      ]);

      const owners = result.rows.map(mapOwner);

      if (!organization) {
        return owners;
      }

      return [
        createOrganizationOwner(organization),
        ...owners
      ];
    },
    async listOwnerClients(organizationId: string): Promise<Owner[]> {
      const owners = await this.listOwners(organizationId);
      return owners.filter((owner) => owner.ownerType === "client");
    },
    async listPropertiesWithUnits(
      organizationId: string,
      filter?: ListPropertiesWithUnitsFilter | PropertyManagementContext
    ): Promise<PropertyWithUnitsRecord[]> {
      const normalizedFilter = typeof filter === "string"
        ? { managementContext: filter }
        : filter;
      const schema = await getPropertyStorageSchema(client);
      const values: unknown[] = [organizationId];
      const clauses = ["p.organization_id = $1"];

      const normalizedOwnerType = normalizedFilter?.ownerType
        ?? (normalizedFilter?.managementContext === "owned" ? "organization" : normalizedFilter?.managementContext === "managed" ? "client" : undefined);

      if (normalizedFilter?.ownerId) {
        if (normalizedFilter.ownerId === getOrganizationOwnerId(organizationId)) {
          clauses.push("p.management_context = 'owned'");
        } else {
          values.push(normalizedFilter.ownerId);
          clauses.push(`p.${schema.relationIdColumn} = $${values.length}`);
        }
      }

      if (normalizedOwnerType) {
        clauses.push(normalizedOwnerType === "organization" ? "p.management_context = 'owned'" : "p.management_context = 'managed'");
      }

      const result = await client.query<PropertyWithUnitRow>(
        `select
           p.id as property_id,
           p.organization_id as property_organization_id,
            o.name as property_organization_name,
           p.name as property_name,
           p.address as property_address,
           p.city as property_city,
           p.country_code as property_country_code,
           p.management_context as property_management_context,
           p.property_type as property_type,
           p.year_built as property_year_built,
           p.photo_urls as property_photo_urls,
           ${ownerRelationIdAlias(schema)},
           ${ownerRelationNameAlias(schema)},
           p.status as property_status,
           p.created_at as property_created_at,
           u.id as unit_id,
           u.organization_id as unit_organization_id,
           u.property_id as unit_property_id,
           u.unit_number as unit_number,
           u.monthly_rent_amount as unit_monthly_rent_amount,
           u.deposit_amount as unit_deposit_amount,
           u.currency_code as unit_currency_code,
           u.bedroom_count as unit_bedroom_count,
           u.bathroom_count as unit_bathroom_count,
           u.size_sqm as unit_size_sqm,
           u.amenities as unit_amenities,
           u.features as unit_features,
           u.status as unit_status,
           u.created_at as unit_created_at
         from properties p
         inner join organizations o on o.id = p.organization_id
         left join units u on u.property_id = p.id
         where ${clauses.join(" and ")}
         order by p.created_at desc, u.created_at desc`,
        values
      );

      const grouped = new Map<string, PropertyWithUnitsRecord>();

      for (const row of result.rows) {
        const existing = grouped.get(row.property_id);
        if (existing) {
          if (row.unit_id !== null) {
            existing.units.push({
              id: row.unit_id,
              organizationId: row.unit_organization_id ?? row.property_organization_id,
              propertyId: row.unit_property_id ?? row.property_id,
              unitNumber: row.unit_number ?? "",
              monthlyRentAmount: toNumber(row.unit_monthly_rent_amount ?? 0),
              depositAmount: toNumber(row.unit_deposit_amount ?? 0),
              currencyCode: row.unit_currency_code ?? "",
              bedroomCount: row.unit_bedroom_count,
              bathroomCount: row.unit_bathroom_count === null ? null : toNumber(row.unit_bathroom_count),
              sizeSqm: row.unit_size_sqm === null ? null : toNumber(row.unit_size_sqm),
              amenities: row.unit_amenities ?? [],
              features: row.unit_features ?? [],
              status: row.unit_status ?? "inactive",
              createdAtIso: toIso(row.unit_created_at ?? row.property_created_at)
            });
          }
          continue;
        }

        const item: PropertyWithUnitsRecord = {
          property: {
            id: row.property_id,
            organizationId: row.property_organization_id,
            name: row.property_name,
            address: row.property_address,
            city: row.property_city,
            countryCode: row.property_country_code,
            managementContext: row.property_management_context,
            propertyType: row.property_type,
            yearBuilt: row.property_year_built,
            photoUrls: row.property_photo_urls,
            ownerId: row.property_management_context === "owned"
              ? getOrganizationOwnerId(row.property_organization_id)
              : (row.property_client_id ?? getOrganizationOwnerId(row.property_organization_id)),
            ownerName: row.property_management_context === "owned" ? (row.property_organization_name ?? "") : (row.property_client_name ?? "Owner client"),
            ownerType: row.property_management_context === "owned" ? "organization" : "client",
            clientId: row.property_client_id,
            clientName: row.property_client_name,
            status: row.property_status,
            createdAtIso: toIso(row.property_created_at)
          },
          units: []
        };

        if (row.unit_id !== null) {
          item.units.push({
            id: row.unit_id,
            organizationId: row.unit_organization_id ?? row.property_organization_id,
            propertyId: row.unit_property_id ?? row.property_id,
            unitNumber: row.unit_number ?? "",
            monthlyRentAmount: toNumber(row.unit_monthly_rent_amount ?? 0),
            depositAmount: toNumber(row.unit_deposit_amount ?? 0),
            currencyCode: row.unit_currency_code ?? "",
            bedroomCount: row.unit_bedroom_count,
            bathroomCount: row.unit_bathroom_count === null ? null : toNumber(row.unit_bathroom_count),
            sizeSqm: row.unit_size_sqm === null ? null : toNumber(row.unit_size_sqm),
            amenities: row.unit_amenities ?? [],
            features: row.unit_features ?? [],
            status: row.unit_status ?? "inactive",
            createdAtIso: toIso(row.unit_created_at ?? row.property_created_at)
          });
        }

        grouped.set(row.property_id, item);
      }

      return [...grouped.values()];
    }
  };
}

export function createPostgresOrganizationPropertyUnitRepositoryFromConnectionString(
  connectionString: string
): OrganizationPropertyUnitRepository {
  return createPostgresOrganizationPropertyUnitRepository(getOrCreatePool(connectionString));
}

export function createOrganizationPropertyUnitRepositoryFromEnv(
  source: DatabaseEnvSource
): ApiResult<OrganizationPropertyUnitRepository> {
  const envResult = readDatabaseEnv(source);
  if (!envResult.success) {
    return envResult;
  }

  return {
    success: true,
    data: createPostgresOrganizationPropertyUnitRepositoryFromConnectionString(
      envResult.data.connectionString
    )
  };
}
