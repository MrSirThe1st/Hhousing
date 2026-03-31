import { Pool, type QueryResultRow } from "pg";
import type { ApiResult } from "@hhousing/api-contracts";
import type { Organization, Property, Unit } from "@hhousing/domain";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env";
import type {
  CreateOrganizationRecordInput,
  CreatePropertyRecordInput,
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
  status: "active" | "archived";
  created_at: Date | string;
}

interface UnitRow extends QueryResultRow {
  id: string;
  organization_id: string;
  property_id: string;
  unit_number: string;
  monthly_rent_amount: string | number;
  currency_code: string;
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
  property_status: "active" | "archived";
  property_created_at: Date | string;
  unit_id: string | null;
  unit_organization_id: string | null;
  unit_property_id: string | null;
  unit_number: string | null;
  unit_monthly_rent_amount: string | number | null;
  unit_currency_code: string | null;
  unit_status: "vacant" | "occupied" | "inactive" | null;
  unit_created_at: Date | string | null;
}

export interface DatabaseQueryable {
  query<Row extends QueryResultRow>(
    text: string,
    values?: readonly unknown[]
  ): Promise<{ rows: Row[]; rowCount?: number | null }>;
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
    status: row.status,
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
    currencyCode: row.currency_code,
    status: row.status,
    createdAtIso: toIso(row.created_at)
  };
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
    async createProperty(input: CreatePropertyRecordInput): Promise<Property> {
      const result = await client.query<PropertyRow>(
        `insert into properties (
          id,
          organization_id,
          name,
          address,
          city,
          country_code
        ) values ($1, $2, $3, $4, $5, $6)
        returning id, organization_id, name, address, city, country_code, status, created_at`,
        [
          input.id,
          input.organizationId,
          input.name,
          input.address,
          input.city,
          input.countryCode
        ]
      );

      return mapProperty(result.rows[0]);
    },
    async createUnit(input: CreateUnitRecordInput): Promise<Unit> {
      const result = await client.query<UnitRow>(
        `insert into units (
          id,
          organization_id,
          property_id,
          unit_number,
          monthly_rent_amount,
          currency_code
        ) values ($1, $2, $3, $4, $5, $6)
        returning id, organization_id, property_id, unit_number, monthly_rent_amount, currency_code, status, created_at`,
        [
          input.id,
          input.organizationId,
          input.propertyId,
          input.unitNumber,
          input.monthlyRentAmount,
          input.currencyCode
        ]
      );

      return mapUnit(result.rows[0]);
    },
    async updateProperty(input: UpdatePropertyRecordInput): Promise<Property | null> {
      const result = await client.query<PropertyRow>(
        `update properties
         set name = $1, address = $2, city = $3, country_code = $4
         where id = $5 and organization_id = $6
         returning *`,
        [input.name, input.address, input.city, input.countryCode, input.id, input.organizationId]
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
    async listPropertiesWithUnits(organizationId: string): Promise<PropertyWithUnitsRecord[]> {
      const result = await client.query<PropertyWithUnitRow>(
        `select
           p.id as property_id,
           p.organization_id as property_organization_id,
           p.name as property_name,
           p.address as property_address,
           p.city as property_city,
           p.country_code as property_country_code,
           p.status as property_status,
           p.created_at as property_created_at,
           u.id as unit_id,
           u.organization_id as unit_organization_id,
           u.property_id as unit_property_id,
           u.unit_number as unit_number,
           u.monthly_rent_amount as unit_monthly_rent_amount,
           u.currency_code as unit_currency_code,
           u.status as unit_status,
           u.created_at as unit_created_at
         from properties p
         left join units u on u.property_id = p.id
         where p.organization_id = $1
         order by p.created_at desc, u.created_at desc`,
        [organizationId]
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
              currencyCode: row.unit_currency_code ?? "",
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
            currencyCode: row.unit_currency_code ?? "",
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
