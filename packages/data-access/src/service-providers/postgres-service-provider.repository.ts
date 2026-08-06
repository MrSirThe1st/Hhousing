import { Pool, type QueryResultRow } from "pg";
import type { ServiceProviderWithCategory } from "@hhousing/api-contracts";
import type {
  ServiceProvider,
  ServiceProviderCategory,
  ServiceProviderStatus
} from "@hhousing/domain";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env";
import type {
  AssignServiceProviderRecordInput,
  CreateServiceProviderCategoryRecordInput,
  CreateServiceProviderRecordInput,
  ListServiceProvidersRecordFilter,
  ServiceProviderAdminListItem,
  ServiceProviderCategoryWithCount,
  ServiceProviderRepository,
  ServiceProviderVisibilityStats,
  UpdateServiceProviderCategoryRecordInput,
  UpdateServiceProviderRecordInput
} from "./service-provider-record.types";

interface CategoryRow extends QueryResultRow {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  created_at: Date | string;
}

interface ProviderRow extends QueryResultRow {
  id: string;
  organization_id: string | null;
  category_id: string;
  name: string;
  phone: string;
  whatsapp_phone: string | null;
  description: string | null;
  city: string | null;
  quartier: string | null;
  status: ServiceProviderStatus;
  is_verified: boolean;
  created_by_organization_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
  category_name?: string;
  category_slug?: string;
  organization_name?: string | null;
}

interface AssignmentRow extends QueryResultRow {
  property_id: string;
  service_provider_id: string;
  created_at: Date | string;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function mapCategory(row: CategoryRow): ServiceProviderCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sortOrder: row.sort_order,
    createdAtIso: toIso(row.created_at)
  };
}

function mapProvider(row: ProviderRow): ServiceProvider {
  return {
    id: row.id,
    organizationId: row.organization_id,
    categoryId: row.category_id,
    name: row.name,
    phone: row.phone,
    whatsappPhone: row.whatsapp_phone,
    description: row.description,
    city: row.city,
    quartier: row.quartier,
    status: row.status,
    isVerified: row.is_verified,
    createdByOrganizationId: row.created_by_organization_id,
    createdAtIso: toIso(row.created_at),
    updatedAtIso: toIso(row.updated_at)
  };
}

function mapProviderWithCategory(row: ProviderRow): ServiceProviderAdminListItem {
  return {
    ...mapProvider(row),
    categoryName: row.category_name ?? "",
    categorySlug: row.category_slug ?? "",
    organizationName: row.organization_name ?? null
  };
}

const PROVIDER_SELECT = `
  sp.id, sp.organization_id, sp.category_id, sp.name, sp.phone, sp.whatsapp_phone,
  sp.description, sp.city, sp.quartier, sp.status, sp.is_verified,
  sp.created_by_organization_id, sp.created_at, sp.updated_at,
  c.name as category_name, c.slug as category_slug,
  coalesce(o.name, created_by.name) as organization_name
`;

export interface ServiceProviderQueryable {
  query<Row extends QueryResultRow>(
    text: string,
    values?: readonly unknown[]
  ): Promise<{ rows: Row[]; rowCount?: number | null }>;
}

const poolCache = new Map<string, Pool>();

function getOrCreatePool(connectionString: string): Pool {
  const existing = poolCache.get(connectionString);
  if (existing) return existing;
  const pool = new Pool({ connectionString, max: 5 });
  poolCache.set(connectionString, pool);
  return pool;
}

export function createPostgresServiceProviderRepository(
  client: ServiceProviderQueryable
): ServiceProviderRepository {
  return {
    async listCategories(): Promise<ServiceProviderCategory[]> {
      const result = await client.query<CategoryRow>(
        `select id, name, slug, sort_order, created_at
         from service_provider_categories
         order by sort_order asc, name asc`
      );
      return result.rows.map(mapCategory);
    },

    async listCategoriesWithCounts(): Promise<ServiceProviderCategoryWithCount[]> {
      const result = await client.query<CategoryRow & { provider_count: string | number }>(
        `select
           c.id, c.name, c.slug, c.sort_order, c.created_at,
           count(sp.id)::int as provider_count
         from service_provider_categories c
         left join service_providers sp on sp.category_id = c.id
         group by c.id, c.name, c.slug, c.sort_order, c.created_at
         order by c.sort_order asc, c.name asc`
      );
      return result.rows.map((row) => ({
        ...mapCategory(row),
        providerCount: Number(row.provider_count)
      }));
    },

    async getCategoryById(id: string): Promise<ServiceProviderCategory | null> {
      const result = await client.query<CategoryRow>(
        `select id, name, slug, sort_order, created_at
         from service_provider_categories
         where id = $1
         limit 1`,
        [id]
      );
      return result.rows[0] ? mapCategory(result.rows[0]) : null;
    },

    async createCategory(
      input: CreateServiceProviderCategoryRecordInput
    ): Promise<ServiceProviderCategory> {
      const result = await client.query<CategoryRow>(
        `insert into service_provider_categories (id, name, slug, sort_order)
         values ($1, $2, $3, $4)
         returning id, name, slug, sort_order, created_at`,
        [input.id, input.name, input.slug, input.sortOrder]
      );
      return mapCategory(result.rows[0]);
    },

    async updateCategory(
      input: UpdateServiceProviderCategoryRecordInput
    ): Promise<ServiceProviderCategory | null> {
      const result = await client.query<CategoryRow>(
        `update service_provider_categories
         set
           name = coalesce($2, name),
           slug = coalesce($3, slug),
           sort_order = coalesce($4, sort_order)
         where id = $1
         returning id, name, slug, sort_order, created_at`,
        [input.id, input.name ?? null, input.slug ?? null, input.sortOrder ?? null]
      );
      return result.rows[0] ? mapCategory(result.rows[0]) : null;
    },

    async deleteCategory(id: string): Promise<boolean> {
      const inUse = await client.query<{ count: string }>(
        `select count(*)::text as count from service_providers where category_id = $1`,
        [id]
      );
      if (Number(inUse.rows[0]?.count ?? 0) > 0) {
        return false;
      }
      const result = await client.query(
        `delete from service_provider_categories where id = $1`,
        [id]
      );
      return (result.rowCount ?? 0) > 0;
    },

    async listProviders(
      filter: ListServiceProvidersRecordFilter
    ): Promise<ServiceProviderAdminListItem[]> {
      const conditions: string[] = [];
      const values: unknown[] = [];
      let index = 1;

      if (filter.platformOnly) {
        conditions.push("sp.organization_id is null");
      } else if (filter.landlordOnly) {
        conditions.push("sp.organization_id is not null");
      } else if (filter.includePlatform && filter.organizationId) {
        conditions.push(`(sp.organization_id is null or sp.organization_id = $${index++})`);
        values.push(filter.organizationId);
      } else if (filter.organizationId !== undefined) {
        if (filter.organizationId === null) {
          conditions.push("sp.organization_id is null");
        } else {
          conditions.push(`sp.organization_id = $${index++}`);
          values.push(filter.organizationId);
        }
      }

      if (filter.categoryId) {
        conditions.push(`sp.category_id = $${index++}`);
        values.push(filter.categoryId);
      }

      if (filter.status) {
        conditions.push(`sp.status = $${index++}`);
        values.push(filter.status);
      }

      if (filter.verifiedOnly) {
        conditions.push("sp.is_verified = true");
      }

      if (filter.search?.trim()) {
        conditions.push(
          `(sp.name ilike $${index} or sp.phone ilike $${index} or coalesce(sp.whatsapp_phone, '') ilike $${index})`
        );
        values.push(`%${filter.search.trim()}%`);
        index += 1;
      }

      const where = conditions.length > 0 ? `where ${conditions.join(" and ")}` : "";

      const result = await client.query<ProviderRow>(
        `select ${PROVIDER_SELECT}
         from service_providers sp
         join service_provider_categories c on c.id = sp.category_id
         left join organizations o on o.id = sp.organization_id
         left join organizations created_by on created_by.id = sp.created_by_organization_id
         ${where}
         order by c.sort_order asc, sp.name asc`,
        values
      );
      return result.rows.map(mapProviderWithCategory);
    },

    async getProviderById(id: string): Promise<ServiceProviderAdminListItem | null> {
      const result = await client.query<ProviderRow>(
        `select ${PROVIDER_SELECT}
         from service_providers sp
         join service_provider_categories c on c.id = sp.category_id
         left join organizations o on o.id = sp.organization_id
         left join organizations created_by on created_by.id = sp.created_by_organization_id
         where sp.id = $1
         limit 1`,
        [id]
      );
      return result.rows[0] ? mapProviderWithCategory(result.rows[0]) : null;
    },

    async getProviderVisibilityStats(providerId: string): Promise<ServiceProviderVisibilityStats> {
      const result = await client.query<{ landlord_count: number; property_count: number }>(
        `select
           count(distinct organization_id)::int as landlord_count,
           count(distinct property_id)::int as property_count
         from property_service_providers
         where service_provider_id = $1`,
        [providerId]
      );
      const row = result.rows[0];
      return {
        landlordCount: row?.landlord_count ?? 0,
        propertyCount: row?.property_count ?? 0
      };
    },

    async createProvider(input: CreateServiceProviderRecordInput): Promise<ServiceProvider> {
      const result = await client.query<ProviderRow>(
        `insert into service_providers (
           id, organization_id, category_id, name, phone, whatsapp_phone,
           description, city, quartier, status, is_verified, created_by_organization_id
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         returning
           id, organization_id, category_id, name, phone, whatsapp_phone,
           description, city, quartier, status, is_verified,
           created_by_organization_id, created_at, updated_at`,
        [
          input.id,
          input.organizationId,
          input.categoryId,
          input.name,
          input.phone,
          input.whatsappPhone,
          input.description,
          input.city,
          input.quartier,
          input.status,
          input.isVerified,
          input.createdByOrganizationId
        ]
      );
      return mapProvider(result.rows[0]);
    },

    async updateProvider(input: UpdateServiceProviderRecordInput): Promise<ServiceProvider | null> {
      const values: unknown[] = [
        input.id,
        input.categoryId ?? null,
        input.name ?? null,
        input.phone ?? null,
        input.whatsappPhone !== undefined,
        input.whatsappPhone ?? null,
        input.description !== undefined,
        input.description ?? null,
        input.city !== undefined,
        input.city ?? null,
        input.quartier !== undefined,
        input.quartier ?? null,
        input.isVerified ?? null
      ];

      let orgClause = "";
      if (input.organizationId !== undefined) {
        orgClause = " and organization_id = $14";
        values.push(input.organizationId);
      }

      const result = await client.query<ProviderRow>(
        `update service_providers
         set
           category_id = coalesce($2, category_id),
           name = coalesce($3, name),
           phone = coalesce($4, phone),
           whatsapp_phone = case when $5::boolean then $6 else whatsapp_phone end,
           description = case when $7::boolean then $8 else description end,
           city = case when $9::boolean then $10 else city end,
           quartier = case when $11::boolean then $12 else quartier end,
           is_verified = coalesce($13, is_verified),
           updated_at = now()
         where id = $1${orgClause}
         returning
           id, organization_id, category_id, name, phone, whatsapp_phone,
           description, city, quartier, status, is_verified,
           created_by_organization_id, created_at, updated_at`,
        values
      );
      return result.rows[0] ? mapProvider(result.rows[0]) : null;
    },

    async setProviderStatus(
      id: string,
      status: ServiceProviderStatus
    ): Promise<ServiceProvider | null> {
      const result = await client.query<ProviderRow>(
        `update service_providers
         set status = $2, updated_at = now()
         where id = $1
         returning
           id, organization_id, category_id, name, phone, whatsapp_phone,
           description, city, quartier, status, is_verified,
           created_by_organization_id, created_at, updated_at`,
        [id, status]
      );
      return result.rows[0] ? mapProvider(result.rows[0]) : null;
    },

    async promoteProvider(id: string): Promise<ServiceProvider | null> {
      const result = await client.query<ProviderRow>(
        `update service_providers
         set
           organization_id = null,
           is_verified = true,
           updated_at = now()
         where id = $1 and organization_id is not null
         returning
           id, organization_id, category_id, name, phone, whatsapp_phone,
           description, city, quartier, status, is_verified,
           created_by_organization_id, created_at, updated_at`,
        [id]
      );
      return result.rows[0] ? mapProvider(result.rows[0]) : null;
    },

    async deleteProvider(id: string, organizationId?: string): Promise<boolean> {
      if (organizationId) {
        const result = await client.query(
          `delete from service_providers where id = $1 and organization_id = $2`,
          [id, organizationId]
        );
        return (result.rowCount ?? 0) > 0;
      }
      const result = await client.query(`delete from service_providers where id = $1`, [id]);
      return (result.rowCount ?? 0) > 0;
    },

    async listAssignedProviderIdsForProperty(propertyId: string): Promise<string[]> {
      const result = await client.query<{ service_provider_id: string }>(
        `select service_provider_id
         from property_service_providers
         where property_id = $1`,
        [propertyId]
      );
      return result.rows.map((row) => row.service_provider_id);
    },

    async listActiveProvidersForProperty(
      propertyId: string
    ): Promise<ServiceProviderWithCategory[]> {
      const result = await client.query<ProviderRow>(
        `select ${PROVIDER_SELECT}
         from property_service_providers psp
         join service_providers sp on sp.id = psp.service_provider_id
         join service_provider_categories c on c.id = sp.category_id
         left join organizations o on o.id = sp.organization_id
         left join organizations created_by on created_by.id = sp.created_by_organization_id
         where psp.property_id = $1 and sp.status = 'active'
         order by c.sort_order asc, sp.name asc`,
        [propertyId]
      );
      return result.rows.map(mapProviderWithCategory);
    },

    async listAssignmentsForOrganization(
      organizationId: string
    ): Promise<Array<{ propertyId: string; serviceProviderId: string; createdAtIso: string }>> {
      const result = await client.query<AssignmentRow>(
        `select property_id, service_provider_id, created_at
         from property_service_providers
         where organization_id = $1
         order by created_at desc`,
        [organizationId]
      );
      return result.rows.map((row) => ({
        propertyId: row.property_id,
        serviceProviderId: row.service_provider_id,
        createdAtIso: toIso(row.created_at)
      }));
    },

    async assignProvider(input: AssignServiceProviderRecordInput): Promise<void> {
      await client.query(
        `insert into property_service_providers (property_id, service_provider_id, organization_id)
         values ($1, $2, $3)
         on conflict (property_id, service_provider_id) do nothing`,
        [input.propertyId, input.serviceProviderId, input.organizationId]
      );
    },

    async unassignProvider(
      propertyId: string,
      serviceProviderId: string,
      organizationId: string
    ): Promise<boolean> {
      const result = await client.query(
        `delete from property_service_providers
         where property_id = $1 and service_provider_id = $2 and organization_id = $3`,
        [propertyId, serviceProviderId, organizationId]
      );
      return (result.rowCount ?? 0) > 0;
    }
  };
}

export function createServiceProviderRepositoryFromEnv(
  env: DatabaseEnvSource = process.env
): ServiceProviderRepository {
  const envResult = readDatabaseEnv(env);
  if (!envResult.success) {
    throw new Error(envResult.error);
  }

  return createPostgresServiceProviderRepository(getOrCreatePool(envResult.data.connectionString));
}
