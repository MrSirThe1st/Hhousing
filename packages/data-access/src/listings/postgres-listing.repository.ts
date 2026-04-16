import { Pool, type QueryResultRow } from "pg";
import type {
  Listing,
  ListingApplication,
  ListingApplicationStatus,
  ListingStatus,
  Property,
  PropertyManagementContext,
  Tenant,
  Unit
} from "@hhousing/domain";
import type {
  ListingApplicationView,
  ManagerListingView,
  PublicListingFilter,
  PublicListingView
} from "@hhousing/api-contracts";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env";
import type {
  CreateListingApplicationRecordInput,
  ListingRepository,
  UpdateListingApplicationStatusRecordInput,
  UpsertListingRecordInput
} from "./listing-record.types";

interface ListingRow extends QueryResultRow {
  id: string;
  organization_id: string;
  property_id: string;
  unit_id: string;
  status: ListingStatus;
  marketing_description: string | null;
  cover_image_url: string | null;
  gallery_image_urls: string[];
  youtube_url: string | null;
  instagram_url: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_featured: boolean;
  show_address: boolean;
  show_rent: boolean;
  show_deposit: boolean;
  show_amenities: boolean;
  show_features: boolean;
  show_bedrooms: boolean;
  show_bathrooms: boolean;
  show_size_sqm: boolean;
  published_at: Date | string | null;
  created_by_user_id: string;
  updated_by_user_id: string;
  created_at: Date | string;
  updated_at: Date | string;
}

interface PropertyRow extends QueryResultRow {
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
}

interface UnitRow extends QueryResultRow {
  unit_id: string;
  unit_organization_id: string;
  unit_property_id: string;
  unit_number: string;
  unit_monthly_rent_amount: string | number;
  unit_deposit_amount: string | number;
  unit_currency_code: string;
  unit_bedroom_count: number | null;
  unit_bathroom_count: string | number | null;
  unit_size_sqm: string | number | null;
  unit_amenities: string[];
  unit_features: string[];
  unit_status: "vacant" | "occupied" | "inactive";
  unit_created_at: Date | string;
}

interface ManagerListingRow extends PropertyRow, UnitRow {
  listing_id: string | null;
  listing_organization_id: string | null;
  listing_property_id: string | null;
  listing_unit_id: string | null;
  listing_status: ListingStatus | null;
  listing_marketing_description: string | null;
  listing_cover_image_url: string | null;
  listing_gallery_image_urls: string[] | null;
  listing_youtube_url: string | null;
  listing_instagram_url: string | null;
  listing_contact_email: string | null;
  listing_contact_phone: string | null;
  listing_is_featured: boolean | null;
  listing_show_address: boolean | null;
  listing_show_rent: boolean | null;
  listing_show_deposit: boolean | null;
  listing_show_amenities: boolean | null;
  listing_show_features: boolean | null;
  listing_show_bedrooms: boolean | null;
  listing_show_bathrooms: boolean | null;
  listing_show_size_sqm: boolean | null;
  listing_published_at: Date | string | null;
  listing_created_by_user_id: string | null;
  listing_updated_by_user_id: string | null;
  listing_created_at: Date | string | null;
  listing_updated_at: Date | string | null;
  application_count: string | number;
  last_application_at: Date | string | null;
}

interface PublicListingRow extends ManagerListingRow {}

interface ApplicationRow extends QueryResultRow {
  application_id: string;
  application_listing_id: string;
  application_organization_id: string;
  application_full_name: string;
  application_email: string;
  application_phone: string;
  application_date_of_birth: string | null;
  application_employment_status: string | null;
  application_job_title: string | null;
  application_employment_info: string | null;
  application_monthly_income: string | number | null;
  application_number_of_occupants: number | null;
  application_notes: string | null;
  application_status: ListingApplicationStatus;
  application_screening_notes: string | null;
  application_requested_info_message: string | null;
  application_reviewed_by_user_id: string | null;
  application_reviewed_at: Date | string | null;
  application_converted_tenant_id: string | null;
  application_created_at: Date | string;
  application_updated_at: Date | string;
}

interface ListingApplicationViewRow extends ApplicationRow, PublicListingRow {
  tenant_id: string | null;
  tenant_organization_id: string | null;
  tenant_auth_user_id: string | null;
  tenant_full_name: string | null;
  tenant_email: string | null;
  tenant_phone: string | null;
  tenant_date_of_birth: string | null;
  tenant_photo_url: string | null;
  tenant_employment_status: string | null;
  tenant_job_title: string | null;
  tenant_monthly_income: string | number | null;
  tenant_number_of_occupants: number | null;
  tenant_created_at: Date | string | null;
}

export interface ListingQueryable {
  query<Row extends QueryResultRow>(
    text: string,
    values?: readonly unknown[]
  ): Promise<{ rows: Row[]; rowCount?: number | null }>;
}

const poolCache = new Map<string, Pool>();
let propertyOwnershipSchemaPromise: Promise<PropertyOwnershipSchema> | null = null;

interface PropertyOwnershipSchema {
  relationIdColumn: "client_id" | "owner_id";
  relationNameColumn: "client_name" | "owner_name";
}

async function getPropertyOwnershipSchema(client: ListingQueryable): Promise<PropertyOwnershipSchema> {
  if (!propertyOwnershipSchemaPromise) {
    propertyOwnershipSchemaPromise = (async () => {
      const result = await client.query<{ column_name: string }>(
        `select column_name
         from information_schema.columns
         where table_schema = current_schema()
           and table_name = 'properties'
           and column_name in ('client_id', 'client_name', 'owner_id', 'owner_name')`
      );

      const columnNames = new Set(result.rows.map((row) => row.column_name));
      if (columnNames.has("owner_id") && columnNames.has("owner_name")) {
        return {
          relationIdColumn: "owner_id",
          relationNameColumn: "owner_name"
        };
      }

      return {
        relationIdColumn: "client_id",
        relationNameColumn: "client_name"
      };
    })();
  }

  return propertyOwnershipSchemaPromise;
}

function propertyRelationIdSelect(schema: PropertyOwnershipSchema): string {
  return `p.${schema.relationIdColumn} as property_client_id`;
}

function propertyRelationNameSelect(schema: PropertyOwnershipSchema): string {
  return `p.${schema.relationNameColumn} as property_client_name`;
}

function propertyRelationGroupBy(schema: PropertyOwnershipSchema): string {
  return `p.${schema.relationIdColumn}, p.${schema.relationNameColumn}`;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

function toNumber(value: string | number): number {
  return typeof value === "number" ? value : Number(value);
}

function mapProperty(row: PropertyRow): Property {
  const ownerType = row.property_management_context === "owned" ? "organization" : "client";
  const ownerId = ownerType === "organization"
    ? `own_org_${row.property_organization_id}`
    : (row.property_client_id ?? `own_org_${row.property_organization_id}`);
  const ownerName = ownerType === "organization" ? "Organisation" : (row.property_client_name ?? row.property_name);

  return {
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
    ownerId,
    ownerName,
    ownerType,
    clientId: ownerType === "client" ? ownerId : null,
    clientName: ownerType === "client" ? ownerName : null,
    status: row.property_status,
    createdAtIso: toIso(row.property_created_at)
  };
}

function mapUnit(row: UnitRow): Unit {
  return {
    id: row.unit_id,
    organizationId: row.unit_organization_id,
    propertyId: row.unit_property_id,
    unitNumber: row.unit_number,
    monthlyRentAmount: toNumber(row.unit_monthly_rent_amount),
    depositAmount: toNumber(row.unit_deposit_amount),
    currencyCode: row.unit_currency_code,
    bedroomCount: row.unit_bedroom_count,
    bathroomCount: row.unit_bathroom_count === null ? null : toNumber(row.unit_bathroom_count),
    sizeSqm: row.unit_size_sqm === null ? null : toNumber(row.unit_size_sqm),
    amenities: row.unit_amenities,
    features: row.unit_features,
    status: row.unit_status,
    createdAtIso: toIso(row.unit_created_at)
  };
}

function mapListing(row: ListingRow): Listing {
  return {
    id: row.id,
    organizationId: row.organization_id,
    propertyId: row.property_id,
    unitId: row.unit_id,
    status: row.status,
    marketingDescription: row.marketing_description,
    coverImageUrl: row.cover_image_url,
    galleryImageUrls: row.gallery_image_urls,
    youtubeUrl: row.youtube_url,
    instagramUrl: row.instagram_url,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    isFeatured: row.is_featured,
    visibility: {
      showAddress: row.show_address,
      showRent: row.show_rent,
      showDeposit: row.show_deposit,
      showAmenities: row.show_amenities,
      showFeatures: row.show_features,
      showBedrooms: row.show_bedrooms,
      showBathrooms: row.show_bathrooms,
      showSizeSqm: row.show_size_sqm
    },
    publishedAtIso: row.published_at ? toIso(row.published_at) : null,
    createdByUserId: row.created_by_user_id,
    updatedByUserId: row.updated_by_user_id,
    createdAtIso: toIso(row.created_at),
    updatedAtIso: toIso(row.updated_at)
  };
}

function mapListingFromJoinedRow(row: ManagerListingRow): Listing | null {
  if (!row.listing_id || !row.listing_organization_id || !row.listing_property_id || !row.listing_unit_id || !row.listing_status || !row.listing_created_by_user_id || !row.listing_updated_by_user_id || !row.listing_created_at || !row.listing_updated_at) {
    return null;
  }

  return mapListing({
    id: row.listing_id,
    organization_id: row.listing_organization_id,
    property_id: row.listing_property_id,
    unit_id: row.listing_unit_id,
    status: row.listing_status,
    marketing_description: row.listing_marketing_description,
    cover_image_url: row.listing_cover_image_url,
    gallery_image_urls: row.listing_gallery_image_urls ?? [],
    youtube_url: row.listing_youtube_url,
    instagram_url: row.listing_instagram_url,
    contact_email: row.listing_contact_email,
    contact_phone: row.listing_contact_phone,
    is_featured: row.listing_is_featured ?? false,
    show_address: row.listing_show_address ?? false,
    show_rent: row.listing_show_rent ?? true,
    show_deposit: row.listing_show_deposit ?? true,
    show_amenities: row.listing_show_amenities ?? true,
    show_features: row.listing_show_features ?? true,
    show_bedrooms: row.listing_show_bedrooms ?? true,
    show_bathrooms: row.listing_show_bathrooms ?? true,
    show_size_sqm: row.listing_show_size_sqm ?? true,
    published_at: row.listing_published_at,
    created_by_user_id: row.listing_created_by_user_id,
    updated_by_user_id: row.listing_updated_by_user_id,
    created_at: row.listing_created_at,
    updated_at: row.listing_updated_at
  });
}

function mapApplication(row: ApplicationRow): ListingApplication {
  return {
    id: row.application_id,
    listingId: row.application_listing_id,
    organizationId: row.application_organization_id,
    fullName: row.application_full_name,
    email: row.application_email,
    phone: row.application_phone,
    dateOfBirth: row.application_date_of_birth ?? null,
    employmentStatus: row.application_employment_status ?? null,
    jobTitle: row.application_job_title ?? null,
    employmentInfo: row.application_employment_info,
    monthlyIncome: row.application_monthly_income === null ? null : toNumber(row.application_monthly_income),
    numberOfOccupants: row.application_number_of_occupants ?? null,
    notes: row.application_notes,
    status: row.application_status,
    screeningNotes: row.application_screening_notes,
    requestedInfoMessage: row.application_requested_info_message,
    reviewedByUserId: row.application_reviewed_by_user_id,
    reviewedAtIso: row.application_reviewed_at ? toIso(row.application_reviewed_at) : null,
    convertedTenantId: row.application_converted_tenant_id,
    createdAtIso: toIso(row.application_created_at),
    updatedAtIso: toIso(row.application_updated_at)
  };
}

function mapTenant(row: ListingApplicationViewRow): Tenant | null {
  if (!row.tenant_id || !row.tenant_organization_id || !row.tenant_full_name || !row.tenant_created_at) {
    return null;
  }

  return {
    id: row.tenant_id,
    organizationId: row.tenant_organization_id,
    authUserId: row.tenant_auth_user_id,
    fullName: row.tenant_full_name,
    email: row.tenant_email,
    phone: row.tenant_phone,
    dateOfBirth: row.tenant_date_of_birth,
    photoUrl: row.tenant_photo_url,
    employmentStatus: row.tenant_employment_status ?? null,
    jobTitle: row.tenant_job_title ?? null,
    monthlyIncome: row.tenant_monthly_income === null || row.tenant_monthly_income === undefined ? null : Number(row.tenant_monthly_income),
    numberOfOccupants: row.tenant_number_of_occupants ?? null,
    createdAtIso: toIso(row.tenant_created_at)
  };
}

function mapPublicListing(row: PublicListingRow): PublicListingView {
  const property = mapProperty(row);
  const unit = mapUnit(row);
  const listing = mapListingFromJoinedRow(row);

  if (!listing) {
    throw new Error("LISTING_REQUIRED");
  }

  const title = property.propertyType === "multi_unit"
    ? `${property.name} · Unité ${unit.unitNumber}`
    : property.name;

  return {
    listing,
    property,
    unit,
    title,
    locationLabel: `${property.city}, ${property.countryCode}`,
    priceLabel: `${unit.monthlyRentAmount.toLocaleString("fr-FR")} ${unit.currencyCode} / mois`,
    sharePath: `/listing/${listing.id}`
  };
}

function getOrCreatePool(connectionString: string): Pool {
  const existing = poolCache.get(connectionString);
  if (existing) {
    return existing;
  }

  const pool = new Pool({ connectionString, max: 5 });
  poolCache.set(connectionString, pool);
  return pool;
}

function listingSelectClause(): string {
  return `
    l.id as listing_id,
    l.organization_id as listing_organization_id,
    l.property_id as listing_property_id,
    l.unit_id as listing_unit_id,
    l.status as listing_status,
    l.marketing_description as listing_marketing_description,
    l.cover_image_url as listing_cover_image_url,
    l.gallery_image_urls as listing_gallery_image_urls,
    l.youtube_url as listing_youtube_url,
    l.instagram_url as listing_instagram_url,
    l.contact_email as listing_contact_email,
    l.contact_phone as listing_contact_phone,
    l.is_featured as listing_is_featured,
    l.show_address as listing_show_address,
    l.show_rent as listing_show_rent,
    l.show_deposit as listing_show_deposit,
    l.show_amenities as listing_show_amenities,
    l.show_features as listing_show_features,
    l.show_bedrooms as listing_show_bedrooms,
    l.show_bathrooms as listing_show_bathrooms,
    l.show_size_sqm as listing_show_size_sqm,
    l.published_at as listing_published_at,
    l.created_by_user_id as listing_created_by_user_id,
    l.updated_by_user_id as listing_updated_by_user_id,
    l.created_at as listing_created_at,
    l.updated_at as listing_updated_at`;
}

function propertyUnitJoinClause(): string {
  return `
    from properties p
    inner join units u on u.property_id = p.id and u.organization_id = p.organization_id
    left join listings l on l.unit_id = u.id and l.organization_id = p.organization_id`;
}

export function createPostgresListingRepository(client: ListingQueryable): ListingRepository {
  return {
    async upsertListing(input: UpsertListingRecordInput): Promise<Listing> {
      const result = await client.query<ListingRow>(
        `insert into listings (
          id, organization_id, property_id, unit_id, status,
          marketing_description, cover_image_url, gallery_image_urls,
          youtube_url, instagram_url, contact_email, contact_phone,
          is_featured, show_address, show_rent, show_deposit,
          show_amenities, show_features, show_bedrooms, show_bathrooms, show_size_sqm,
          published_at, created_by_user_id, updated_by_user_id
        ) values (
          $1, $2, $3, $4, $5,
          $6, $7, $8,
          $9, $10, $11, $12,
          $13, $14, $15, $16,
          $17, $18, $19, $20, $21,
          $22, $23, $24
        )
        on conflict (unit_id) do update
        set property_id = excluded.property_id,
            status = excluded.status,
            marketing_description = excluded.marketing_description,
            cover_image_url = excluded.cover_image_url,
            gallery_image_urls = excluded.gallery_image_urls,
            youtube_url = excluded.youtube_url,
            instagram_url = excluded.instagram_url,
            contact_email = excluded.contact_email,
            contact_phone = excluded.contact_phone,
            is_featured = excluded.is_featured,
            show_address = excluded.show_address,
            show_rent = excluded.show_rent,
            show_deposit = excluded.show_deposit,
            show_amenities = excluded.show_amenities,
            show_features = excluded.show_features,
            show_bedrooms = excluded.show_bedrooms,
            show_bathrooms = excluded.show_bathrooms,
            show_size_sqm = excluded.show_size_sqm,
            published_at = excluded.published_at,
            updated_by_user_id = excluded.updated_by_user_id,
            updated_at = now()
        returning
          id, organization_id, property_id, unit_id, status,
          marketing_description, cover_image_url, gallery_image_urls,
          youtube_url, instagram_url, contact_email, contact_phone,
          is_featured, show_address, show_rent, show_deposit,
          show_amenities, show_features, show_bedrooms, show_bathrooms, show_size_sqm,
          published_at, created_by_user_id, updated_by_user_id, created_at, updated_at`,
        [
          input.id,
          input.organizationId,
          input.propertyId,
          input.unitId,
          input.status,
          input.marketingDescription,
          input.coverImageUrl,
          input.galleryImageUrls,
          input.youtubeUrl,
          input.instagramUrl,
          input.contactEmail,
          input.contactPhone,
          input.isFeatured,
          input.showAddress,
          input.showRent,
          input.showDeposit,
          input.showAmenities,
          input.showFeatures,
          input.showBedrooms,
          input.showBathrooms,
          input.showSizeSqm,
          input.publishedAtIso,
          input.createdByUserId,
          input.updatedByUserId
        ]
      );

      return mapListing(result.rows[0]);
    },

    async getListingById(listingId: string, organizationId: string): Promise<Listing | null> {
      const result = await client.query<ListingRow>(
        `select
           id, organization_id, property_id, unit_id, status,
           marketing_description, cover_image_url, gallery_image_urls,
           youtube_url, instagram_url, contact_email, contact_phone,
           is_featured, show_address, show_rent, show_deposit,
           show_amenities, show_features, show_bedrooms, show_bathrooms, show_size_sqm,
           published_at, created_by_user_id, updated_by_user_id, created_at, updated_at
         from listings
         where id = $1 and organization_id = $2`,
        [listingId, organizationId]
      );

      return result.rows[0] ? mapListing(result.rows[0]) : null;
    },

    async getListingByUnitId(unitId: string, organizationId: string): Promise<Listing | null> {
      const result = await client.query<ListingRow>(
        `select
           id, organization_id, property_id, unit_id, status,
           marketing_description, cover_image_url, gallery_image_urls,
           youtube_url, instagram_url, contact_email, contact_phone,
           is_featured, show_address, show_rent, show_deposit,
           show_amenities, show_features, show_bedrooms, show_bathrooms, show_size_sqm,
           published_at, created_by_user_id, updated_by_user_id, created_at, updated_at
         from listings
         where unit_id = $1 and organization_id = $2`,
        [unitId, organizationId]
      );

      return result.rows[0] ? mapListing(result.rows[0]) : null;
    },

    async listManagerListings(organizationId: string, managementContext?: PropertyManagementContext): Promise<ManagerListingView[]> {
      const schema = await getPropertyOwnershipSchema(client);
      const values: unknown[] = [organizationId];
      const clauses = ["p.organization_id = $1", "p.status = 'active'", "(u.status = 'vacant' or l.status = 'published')"];

      void managementContext;

      const result = await client.query<ManagerListingRow>(
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
           ${propertyRelationIdSelect(schema)},
           ${propertyRelationNameSelect(schema)},
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
           u.created_at as unit_created_at,
           ${listingSelectClause()},
           count(a.id) as application_count,
           max(a.created_at) as last_application_at
         ${propertyUnitJoinClause()}
         left join listing_applications a on a.listing_id = l.id
         where ${clauses.join(" and ")}
         group by
           p.id, p.organization_id, p.name, p.address, p.city, p.country_code, p.management_context,
           p.property_type, p.year_built, p.photo_urls, ${propertyRelationGroupBy(schema)}, p.status, p.created_at,
           u.id, u.organization_id, u.property_id, u.unit_number, u.monthly_rent_amount, u.deposit_amount,
           u.currency_code, u.bedroom_count, u.bathroom_count, u.size_sqm, u.amenities, u.features, u.status, u.created_at,
           l.id, l.organization_id, l.property_id, l.unit_id, l.status, l.marketing_description, l.cover_image_url,
           l.gallery_image_urls, l.youtube_url, l.instagram_url, l.contact_email, l.contact_phone, l.is_featured,
           l.show_address, l.show_rent, l.show_deposit, l.show_amenities, l.show_features, l.show_bedrooms,
           l.show_bathrooms, l.show_size_sqm, l.published_at, l.created_by_user_id, l.updated_by_user_id, l.created_at, l.updated_at
         order by
           case when l.status = 'published' then 0 else 1 end,
           coalesce(l.is_featured, false) desc,
           p.name asc,
           u.unit_number asc`,
        values
      );

      return result.rows.map((row) => ({
        property: mapProperty(row),
        unit: mapUnit(row),
        listing: mapListingFromJoinedRow(row),
        applicationCount: toNumber(row.application_count),
        lastApplicationAtIso: row.last_application_at ? toIso(row.last_application_at) : null
      }));
    },

    async listPublicListings(filter?: PublicListingFilter): Promise<PublicListingView[]> {
      const schema = await getPropertyOwnershipSchema(client);
      const values: unknown[] = [];
      const clauses = ["p.status = 'active'", "u.status = 'vacant'", "l.status = 'published'"];

      if (filter?.propertyType) {
        values.push(filter.propertyType);
        clauses.push(`p.property_type = $${values.length}`);
      }

      if (filter?.city) {
        values.push(`%${filter.city.trim().toLowerCase()}%`);
        clauses.push(`lower(p.city) like $${values.length}`);
      }

      if (filter?.q) {
        values.push(`%${filter.q.trim().toLowerCase()}%`);
        clauses.push(`(
          lower(p.name) like $${values.length}
          or lower(p.city) like $${values.length}
          or lower(u.unit_number) like $${values.length}
          or lower(coalesce(l.marketing_description, '')) like $${values.length}
        )`);
      }

      if (filter?.minRent !== null && filter?.minRent !== undefined) {
        values.push(filter.minRent);
        clauses.push(`u.monthly_rent_amount >= $${values.length}`);
      }

      if (filter?.maxRent !== null && filter?.maxRent !== undefined) {
        values.push(filter.maxRent);
        clauses.push(`u.monthly_rent_amount <= $${values.length}`);
      }

      if (filter?.featuredOnly) {
        clauses.push("l.is_featured = true");
      }

      const result = await client.query<PublicListingRow>(
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
           ${propertyRelationIdSelect(schema)},
           ${propertyRelationNameSelect(schema)},
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
           u.created_at as unit_created_at,
           ${listingSelectClause()},
           0 as application_count,
           null as last_application_at
         ${propertyUnitJoinClause()}
         where ${clauses.join(" and ")}
         order by l.is_featured desc, coalesce(l.published_at, l.updated_at) desc, p.name asc, u.unit_number asc`,
        values
      );

      return result.rows.map(mapPublicListing);
    },

    async getPublicListingById(listingId: string): Promise<PublicListingView | null> {
      const schema = await getPropertyOwnershipSchema(client);
      const result = await client.query<PublicListingRow>(
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
           ${propertyRelationIdSelect(schema)},
           ${propertyRelationNameSelect(schema)},
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
           u.created_at as unit_created_at,
           ${listingSelectClause()},
           0 as application_count,
           null as last_application_at
         ${propertyUnitJoinClause()}
         where l.id = $1 and p.status = 'active' and u.status = 'vacant' and l.status = 'published'`,
        [listingId]
      );

      return result.rows[0] ? mapPublicListing(result.rows[0]) : null;
    },

    async createApplication(input: CreateListingApplicationRecordInput): Promise<ListingApplication> {
      const result = await client.query<ApplicationRow>(
        `insert into listing_applications (
           id, listing_id, organization_id, full_name, email, phone,
           date_of_birth, employment_status, job_title, employment_info, monthly_income, number_of_occupants, notes
         ) values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         returning
           id as application_id,
           listing_id as application_listing_id,
           organization_id as application_organization_id,
           full_name as application_full_name,
           email as application_email,
           phone as application_phone,
           date_of_birth as application_date_of_birth,
           employment_status as application_employment_status,
           job_title as application_job_title,
           employment_info as application_employment_info,
           monthly_income as application_monthly_income,
           number_of_occupants as application_number_of_occupants,
           notes as application_notes,
           status as application_status,
           screening_notes as application_screening_notes,
           requested_info_message as application_requested_info_message,
           reviewed_by_user_id as application_reviewed_by_user_id,
           reviewed_at as application_reviewed_at,
           converted_tenant_id as application_converted_tenant_id,
           created_at as application_created_at,
           updated_at as application_updated_at`,
        [
          input.id,
          input.listingId,
          input.organizationId,
          input.fullName,
          input.email,
          input.phone,
          input.dateOfBirth,
          input.employmentStatus,
          input.jobTitle,
          input.employmentInfo,
          input.monthlyIncome,
          input.numberOfOccupants,
          input.notes
        ]
      );

      return mapApplication(result.rows[0]);
    },

    async getApplicationById(applicationId: string, organizationId: string): Promise<ListingApplicationView | null> {
      const schema = await getPropertyOwnershipSchema(client);
      const result = await client.query<ListingApplicationViewRow>(
        `select
           a.id as application_id,
           a.listing_id as application_listing_id,
           a.organization_id as application_organization_id,
           a.full_name as application_full_name,
           a.email as application_email,
           a.phone as application_phone,
           a.date_of_birth as application_date_of_birth,
           a.employment_status as application_employment_status,
           a.job_title as application_job_title,
           a.employment_info as application_employment_info,
           a.monthly_income as application_monthly_income,
           a.number_of_occupants as application_number_of_occupants,
           a.notes as application_notes,
           a.status as application_status,
           a.screening_notes as application_screening_notes,
           a.requested_info_message as application_requested_info_message,
           a.reviewed_by_user_id as application_reviewed_by_user_id,
           a.reviewed_at as application_reviewed_at,
           a.converted_tenant_id as application_converted_tenant_id,
           a.created_at as application_created_at,
           a.updated_at as application_updated_at,
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
           ${propertyRelationIdSelect(schema)},
           ${propertyRelationNameSelect(schema)},
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
           u.created_at as unit_created_at,
           ${listingSelectClause()},
           0 as application_count,
           null as last_application_at,
           t.id as tenant_id,
           t.organization_id as tenant_organization_id,
           t.auth_user_id as tenant_auth_user_id,
           t.full_name as tenant_full_name,
           t.email as tenant_email,
           t.phone as tenant_phone,
           t.date_of_birth as tenant_date_of_birth,
           t.photo_url as tenant_photo_url,
           t.employment_status as tenant_employment_status,
           t.job_title as tenant_job_title,
           t.monthly_income as tenant_monthly_income,
           t.number_of_occupants as tenant_number_of_occupants,
           t.created_at as tenant_created_at
         from listing_applications a
         inner join listings l on l.id = a.listing_id
         inner join properties p on p.id = l.property_id and p.organization_id = l.organization_id
         inner join units u on u.id = l.unit_id and u.organization_id = l.organization_id
         left join tenants t on t.id = a.converted_tenant_id and t.organization_id = a.organization_id
         where a.id = $1 and a.organization_id = $2`,
        [applicationId, organizationId]
      );

      const row = result.rows[0];
      if (!row) {
        return null;
      }

      return {
        application: mapApplication(row),
        listing: mapPublicListing(row).listing,
        property: mapProperty(row),
        unit: mapUnit(row),
        convertedTenant: mapTenant(row)
      };
    },

    async listApplications(organizationId: string, managementContext?: PropertyManagementContext): Promise<ListingApplicationView[]> {
      const schema = await getPropertyOwnershipSchema(client);
      const values: unknown[] = [organizationId];
      const clauses = ["a.organization_id = $1"];

      void managementContext;

      const result = await client.query<ListingApplicationViewRow>(
        `select
           a.id as application_id,
           a.listing_id as application_listing_id,
           a.organization_id as application_organization_id,
           a.full_name as application_full_name,
           a.email as application_email,
           a.phone as application_phone,
           a.date_of_birth as application_date_of_birth,
           a.employment_status as application_employment_status,
           a.job_title as application_job_title,
           a.employment_info as application_employment_info,
           a.monthly_income as application_monthly_income,
           a.number_of_occupants as application_number_of_occupants,
           a.notes as application_notes,
           a.status as application_status,
           a.screening_notes as application_screening_notes,
           a.requested_info_message as application_requested_info_message,
           a.reviewed_by_user_id as application_reviewed_by_user_id,
           a.reviewed_at as application_reviewed_at,
           a.converted_tenant_id as application_converted_tenant_id,
           a.created_at as application_created_at,
           a.updated_at as application_updated_at,
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
           ${propertyRelationIdSelect(schema)},
           ${propertyRelationNameSelect(schema)},
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
           u.created_at as unit_created_at,
           ${listingSelectClause()},
           0 as application_count,
           null as last_application_at,
           t.id as tenant_id,
           t.organization_id as tenant_organization_id,
           t.auth_user_id as tenant_auth_user_id,
           t.full_name as tenant_full_name,
           t.email as tenant_email,
           t.phone as tenant_phone,
           t.date_of_birth as tenant_date_of_birth,
           t.photo_url as tenant_photo_url,
           t.employment_status as tenant_employment_status,
           t.job_title as tenant_job_title,
           t.monthly_income as tenant_monthly_income,
           t.number_of_occupants as tenant_number_of_occupants,
           t.created_at as tenant_created_at
         from listing_applications a
         inner join listings l on l.id = a.listing_id
         inner join properties p on p.id = l.property_id and p.organization_id = l.organization_id
         inner join units u on u.id = l.unit_id and u.organization_id = l.organization_id
         left join tenants t on t.id = a.converted_tenant_id and t.organization_id = a.organization_id
         where ${clauses.join(" and ")}
         order by a.created_at desc`,
        values
      );

      return result.rows.map((row) => ({
        application: mapApplication(row),
        listing: mapPublicListing(row).listing,
        property: mapProperty(row),
        unit: mapUnit(row),
        convertedTenant: mapTenant(row)
      }));
    },

    async updateApplicationStatus(input: UpdateListingApplicationStatusRecordInput): Promise<ListingApplication | null> {
      const result = await client.query<ApplicationRow>(
        `update listing_applications
         set status = $3,
             screening_notes = $4,
             requested_info_message = $5,
             reviewed_by_user_id = $6,
             reviewed_at = $7,
             updated_at = now()
         where id = $1 and organization_id = $2
         returning
           id as application_id,
           listing_id as application_listing_id,
           organization_id as application_organization_id,
           full_name as application_full_name,
           email as application_email,
           phone as application_phone,
           date_of_birth as application_date_of_birth,
           employment_status as application_employment_status,
           job_title as application_job_title,
           employment_info as application_employment_info,
           monthly_income as application_monthly_income,
           number_of_occupants as application_number_of_occupants,
           notes as application_notes,
           status as application_status,
           screening_notes as application_screening_notes,
           requested_info_message as application_requested_info_message,
           reviewed_by_user_id as application_reviewed_by_user_id,
           reviewed_at as application_reviewed_at,
           converted_tenant_id as application_converted_tenant_id,
           created_at as application_created_at,
           updated_at as application_updated_at`,
        [
          input.applicationId,
          input.organizationId,
          input.status,
          input.screeningNotes,
          input.requestedInfoMessage,
          input.reviewedByUserId,
          input.reviewedAtIso
        ]
      );

      return result.rows[0] ? mapApplication(result.rows[0]) : null;
    },

    async markApplicationConverted(applicationId: string, organizationId: string, tenantId: string): Promise<ListingApplication | null> {
      const result = await client.query<ApplicationRow>(
        `update listing_applications
         set status = 'converted',
             converted_tenant_id = $3,
             updated_at = now()
         where id = $1 and organization_id = $2
         returning
           id as application_id,
           listing_id as application_listing_id,
           organization_id as application_organization_id,
           full_name as application_full_name,
           email as application_email,
           phone as application_phone,
           date_of_birth as application_date_of_birth,
           employment_status as application_employment_status,
           job_title as application_job_title,
           employment_info as application_employment_info,
           monthly_income as application_monthly_income,
           number_of_occupants as application_number_of_occupants,
           notes as application_notes,
           status as application_status,
           screening_notes as application_screening_notes,
           requested_info_message as application_requested_info_message,
           reviewed_by_user_id as application_reviewed_by_user_id,
           reviewed_at as application_reviewed_at,
           converted_tenant_id as application_converted_tenant_id,
           created_at as application_created_at,
           updated_at as application_updated_at`,
        [applicationId, organizationId, tenantId]
      );

      return result.rows[0] ? mapApplication(result.rows[0]) : null;
    },

    async getConvertedTenant(applicationId: string, organizationId: string): Promise<Tenant | null> {
      const result = await client.query<ListingApplicationViewRow>(
        `select
           t.id as tenant_id,
           t.organization_id as tenant_organization_id,
           t.auth_user_id as tenant_auth_user_id,
           t.full_name as tenant_full_name,
           t.email as tenant_email,
           t.phone as tenant_phone,
           t.date_of_birth as tenant_date_of_birth,
           t.photo_url as tenant_photo_url,
           t.employment_status as tenant_employment_status,
           t.job_title as tenant_job_title,
           t.monthly_income as tenant_monthly_income,
           t.number_of_occupants as tenant_number_of_occupants,
           t.created_at as tenant_created_at,
           null as application_id,
           null as application_listing_id,
           null as application_organization_id,
           null as application_full_name,
           null as application_email,
           null as application_phone,
           null as application_date_of_birth,
           null as application_employment_status,
           null as application_job_title,
           null as application_employment_info,
           null as application_monthly_income,
           null as application_number_of_occupants,
           null as application_notes,
           null as application_status,
           null as application_screening_notes,
           null as application_requested_info_message,
           null as application_reviewed_by_user_id,
           null as application_reviewed_at,
           null as application_converted_tenant_id,
           now() as application_created_at,
           now() as application_updated_at,
           '' as property_id,
           '' as property_organization_id,
           '' as property_name,
           '' as property_address,
           '' as property_city,
           '' as property_country_code,
           'owned' as property_management_context,
           'single_unit' as property_type,
           null as property_year_built,
           '{}'::text[] as property_photo_urls,
           null as property_client_id,
           null as property_client_name,
           'active' as property_status,
           now() as property_created_at,
           '' as unit_id,
           '' as unit_organization_id,
           '' as unit_property_id,
           '' as unit_number,
           0 as unit_monthly_rent_amount,
           0 as unit_deposit_amount,
           'CDF' as unit_currency_code,
           null as unit_bedroom_count,
           null as unit_bathroom_count,
           null as unit_size_sqm,
           '{}'::text[] as unit_amenities,
           '{}'::text[] as unit_features,
           'vacant' as unit_status,
           now() as unit_created_at,
           null as listing_id,
           null as listing_organization_id,
           null as listing_property_id,
           null as listing_unit_id,
           null as listing_status,
           null as listing_marketing_description,
           null as listing_cover_image_url,
           null as listing_gallery_image_urls,
           null as listing_youtube_url,
           null as listing_instagram_url,
           null as listing_contact_email,
           null as listing_contact_phone,
           null as listing_is_featured,
           null as listing_show_address,
           null as listing_show_rent,
           null as listing_show_deposit,
           null as listing_show_amenities,
           null as listing_show_features,
           null as listing_show_bedrooms,
           null as listing_show_bathrooms,
           null as listing_show_size_sqm,
           null as listing_published_at,
           null as listing_created_by_user_id,
           null as listing_updated_by_user_id,
           null as listing_created_at,
           null as listing_updated_at,
           0 as application_count,
           null as last_application_at
         from listing_applications a
         inner join tenants t on t.id = a.converted_tenant_id and t.organization_id = a.organization_id
         where a.id = $1 and a.organization_id = $2`,
        [applicationId, organizationId]
      );

      return result.rows[0] ? mapTenant(result.rows[0]) : null;
    }
  };
}

export function createListingRepositoryFromEnv(env: DatabaseEnvSource): ListingRepository {
  const envResult = readDatabaseEnv(env);
  if (!envResult.success) {
    throw new Error(envResult.error);
  }

  return createPostgresListingRepository(getOrCreatePool(envResult.data.connectionString));
}