import { Pool, type PoolClient, type QueryResultRow } from "pg";
import type { ApiResult } from "@hhousing/api-contracts";
import type { Organization, OwnerClient, Property, PropertyManagementContext, Unit } from "@hhousing/domain";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env";
import type {
  CreateOwnerClientRecordInput,
  CreateOrganizationRecordInput,
  CreatePropertyRecordInput,
  CreatePropertyWithUnitsRecordInput,
  CreateUnitRecordInput,
  UpdatePropertyRecordInput,
  UpdateUnitRecordInput,
  OrganizationPropertyUnitRepository,
  PropertyWithUnitsRecord
} from "./organization-property-unit-record.types";

interface OrganizationRow extends QueryResultRow {
  id: string;
  name: string;
  status: "active" | "suspended";
  created_at: Date | string;
}

interface PropertyRow extends QueryResultRow {
  id: string;
  organization_id: string;
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

interface OwnerClientRow extends QueryResultRow {
  id: string;
  organization_id: string;
  name: string;
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
    status: row.status,
    createdAtIso: toIso(row.created_at)
  };
}

function mapProperty(row: PropertyRow): Property {
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
    clientId: row.client_id,
    clientName: row.client_name,
    status: row.status,
    createdAtIso: toIso(row.created_at)
  };
}

function mapOwnerClient(row: OwnerClientRow): OwnerClient {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
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
         returning id, name, status, created_at`,
        [input.id, input.name]
      );

      return mapOrganization(result.rows[0]);
    },
    async createOwnerClient(input: CreateOwnerClientRecordInput): Promise<OwnerClient> {
      const result = await client.query<OwnerClientRow>(
        `insert into owner_clients (id, organization_id, name)
         values ($1, $2, $3)
         returning id, organization_id, name, created_at`,
        [input.id, input.organizationId, input.name]
      );

      return mapOwnerClient(result.rows[0]);
    },
    async createProperty(input: CreatePropertyRecordInput): Promise<Property> {
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
          client_id,
          client_name
        ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        returning id, organization_id, name, address, city, country_code, management_context, property_type, year_built, photo_urls, client_id, client_name, status, created_at`,
        [
          input.id,
          input.organizationId,
          input.name,
          input.address,
          input.city,
          input.countryCode,
          input.managementContext,
          input.propertyType,
          input.yearBuilt,
          input.photoUrls,
          input.clientId,
          input.clientName
        ]
      );

      return mapProperty(result.rows[0]);
    },
    async createPropertyWithUnits(
      input: CreatePropertyWithUnitsRecordInput
    ): Promise<{ property: Property; units: Unit[] }> {
      return withTransaction(transactionCapableClient, async (queryable) => {
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
            client_id,
            client_name
          ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
          returning id, organization_id, name, address, city, country_code, management_context, property_type, year_built, photo_urls, client_id, client_name, status, created_at`,
          [
            input.property.id,
            input.property.organizationId,
            input.property.name,
            input.property.address,
            input.property.city,
            input.property.countryCode,
            input.property.managementContext,
            input.property.propertyType,
            input.property.yearBuilt,
            input.property.photoUrls,
            input.property.clientId,
            input.property.clientName
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
      const result = await client.query<PropertyRow>(
        `update properties
         set name = $1,
             address = $2,
             city = $3,
             country_code = $4,
             management_context = $5,
             client_id = $6,
             client_name = $7
           where id = $8 and organization_id = $9
         returning *`,
        [
          input.name,
          input.address,
          input.city,
          input.countryCode,
          input.managementContext,
          input.clientId,
          input.clientName,
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
    async getOwnerClientById(clientId: string, organizationId: string): Promise<OwnerClient | null> {
      const result = await client.query<OwnerClientRow>(
        `select id, organization_id, name, created_at
         from owner_clients
         where id = $1 and organization_id = $2`,
        [clientId, organizationId]
      );

      return result.rows[0] ? mapOwnerClient(result.rows[0]) : null;
    },
    async getPropertyById(propertyId: string, organizationId: string): Promise<Property | null> {
      const result = await client.query<PropertyRow>(
        `select * from properties where id = $1 and organization_id = $2`,
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
    async listOwnerClients(organizationId: string): Promise<OwnerClient[]> {
      const result = await client.query<OwnerClientRow>(
        `select id, organization_id, name, created_at
         from owner_clients
         where organization_id = $1
         order by name asc, created_at desc`,
        [organizationId]
      );

      return result.rows.map(mapOwnerClient);
    },
    async listPropertiesWithUnits(
      organizationId: string,
      managementContext?: PropertyManagementContext
    ): Promise<PropertyWithUnitsRecord[]> {
      const filterClause = managementContext ? "and p.management_context = $2" : "";
      const values: readonly unknown[] = managementContext
        ? [organizationId, managementContext]
        : [organizationId];

      const result = await client.query<PropertyWithUnitRow>(
        `select
           p.id as property_id,
           p.organization_id as property_organization_id,
           p.name as property_name,
           p.address as property_address,
           p.city as property_city,
           p.country_code as property_country_code,
           p.management_context as property_management_context,
           p.property_type as property_type,
           p.year_built as property_year_built,
           p.photo_urls as property_photo_urls,
           p.client_id as property_client_id,
           p.client_name as property_client_name,
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
         left join units u on u.property_id = p.id
         where p.organization_id = $1
         ${filterClause}
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
