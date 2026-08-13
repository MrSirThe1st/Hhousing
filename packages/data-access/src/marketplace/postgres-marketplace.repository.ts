import { Pool, type QueryResultRow } from "pg";
import type {
  MarketplaceProfile,
  SavedListing,
  UserMarketingPreferences,
  ViewingRequest,
  ViewingRequestStatus
} from "@hhousing/domain";
import { readDatabaseEnv, type DatabaseEnvSource } from "../database/database-env";
import { createPostgresListingRepository } from "../listings/postgres-listing.repository";
import type {
  MarketplaceApplicationView,
  MarketplaceRepository,
  MarketplaceViewingRequestView,
  SavedListingView,
  UpdateMarketplaceProfileInput,
  UpsertMarketingPreferencesInput,
  UpsertMarketplaceProfileInput
} from "./marketplace-record.types";

interface ProfileRow extends QueryResultRow {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

interface MarketingRow extends QueryResultRow {
  user_id: string;
  email_new_listings: boolean;
  email_haraka_news: boolean;
  whatsapp_new_listings: boolean;
  whatsapp_haraka_news: boolean;
  whatsapp_phone: string | null;
  email_opted_in_at: Date | string | null;
  email_opted_out_at: Date | string | null;
  whatsapp_opted_in_at: Date | string | null;
  whatsapp_opted_out_at: Date | string | null;
  updated_at: Date | string;
}

interface SavedRow extends QueryResultRow {
  id: string;
  user_id: string;
  listing_id: string;
  created_at: Date | string;
}

interface ApplicationListRow extends QueryResultRow {
  application_id: string;
  listing_id: string;
  status: string;
  full_name: string;
  email: string;
  phone: string;
  created_at: Date | string;
}

interface ViewingRow extends QueryResultRow {
  id: string;
  listing_id: string;
  organization_id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone: string;
  preferred_date: string | null;
  message: string | null;
  status: ViewingRequestStatus;
  created_at: Date | string;
  updated_at: Date | string;
}

function toIso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function mapProfile(row: ProfileRow): MarketplaceProfile {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    phone: row.phone,
    email: row.email,
    createdAtIso: toIso(row.created_at),
    updatedAtIso: toIso(row.updated_at)
  };
}

function mapMarketing(row: MarketingRow): UserMarketingPreferences {
  return {
    userId: row.user_id,
    emailNewListings: row.email_new_listings,
    emailHarakaNews: row.email_haraka_news,
    whatsappNewListings: row.whatsapp_new_listings,
    whatsappHarakaNews: row.whatsapp_haraka_news,
    whatsappPhone: row.whatsapp_phone,
    emailOptedInAtIso: row.email_opted_in_at ? toIso(row.email_opted_in_at) : null,
    emailOptedOutAtIso: row.email_opted_out_at ? toIso(row.email_opted_out_at) : null,
    whatsappOptedInAtIso: row.whatsapp_opted_in_at ? toIso(row.whatsapp_opted_in_at) : null,
    whatsappOptedOutAtIso: row.whatsapp_opted_out_at ? toIso(row.whatsapp_opted_out_at) : null,
    updatedAtIso: toIso(row.updated_at)
  };
}

function mapSaved(row: SavedRow): SavedListing {
  return {
    id: row.id,
    userId: row.user_id,
    listingId: row.listing_id,
    createdAtIso: toIso(row.created_at)
  };
}

function mapViewing(row: ViewingRow): ViewingRequest {
  return {
    id: row.id,
    listingId: row.listing_id,
    organizationId: row.organization_id,
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    preferredDate: row.preferred_date,
    message: row.message,
    status: row.status,
    createdAtIso: toIso(row.created_at),
    updatedAtIso: toIso(row.updated_at)
  };
}

export function createPostgresMarketplaceRepository(client: Pool): MarketplaceRepository {
  const listingRepo = createPostgresListingRepository(client);

  return {
    async getProfileByUserId(userId: string): Promise<MarketplaceProfile | null> {
      const result = await client.query<ProfileRow>(
        `select user_id, full_name, phone, email, created_at, updated_at
         from marketplace_profiles
         where user_id = $1`,
        [userId]
      );
      return result.rows[0] ? mapProfile(result.rows[0]) : null;
    },

    async upsertProfile(input: UpsertMarketplaceProfileInput): Promise<MarketplaceProfile> {
      const result = await client.query<ProfileRow>(
        `insert into marketplace_profiles (user_id, full_name, phone, email)
         values ($1, $2, $3, $4)
         on conflict (user_id) do update set
           full_name = coalesce(excluded.full_name, marketplace_profiles.full_name),
           phone = coalesce(excluded.phone, marketplace_profiles.phone),
           email = coalesce(excluded.email, marketplace_profiles.email),
           updated_at = now()
         returning user_id, full_name, phone, email, created_at, updated_at`,
        [input.userId, input.fullName ?? null, input.phone ?? null, input.email ?? null]
      );
      return mapProfile(result.rows[0]);
    },

    async updateProfile(input: UpdateMarketplaceProfileInput): Promise<MarketplaceProfile | null> {
      const result = await client.query<ProfileRow>(
        `update marketplace_profiles set
           full_name = coalesce($2, full_name),
           phone = coalesce($3, phone),
           email = coalesce($4, email),
           updated_at = now()
         where user_id = $1
         returning user_id, full_name, phone, email, created_at, updated_at`,
        [input.userId, input.fullName ?? null, input.phone ?? null, input.email ?? null]
      );
      return result.rows[0] ? mapProfile(result.rows[0]) : null;
    },

    async getMarketingPreferences(userId: string): Promise<UserMarketingPreferences | null> {
      const result = await client.query<MarketingRow>(
        `select *
         from user_marketing_preferences
         where user_id = $1`,
        [userId]
      );
      return result.rows[0] ? mapMarketing(result.rows[0]) : null;
    },

    async upsertMarketingPreferences(
      input: UpsertMarketingPreferencesInput
    ): Promise<UserMarketingPreferences> {
      const emailNew = input.emailNewListings ?? false;
      const emailNews = input.emailHarakaNews ?? false;
      const waNew = input.whatsappNewListings ?? false;
      const waNews = input.whatsappHarakaNews ?? false;
      const emailEnabled = emailNew || emailNews;
      const waEnabled = waNew || waNews;

      const result = await client.query<MarketingRow>(
        `insert into user_marketing_preferences (
           user_id, email_new_listings, email_haraka_news,
           whatsapp_new_listings, whatsapp_haraka_news, whatsapp_phone,
           email_opted_in_at, email_opted_out_at,
           whatsapp_opted_in_at, whatsapp_opted_out_at
         ) values (
           $1, $2, $3, $4, $5, $6,
           case when $7 then now() else null end,
           case when $7 then null else now() end,
           case when $8 then now() else null end,
           case when $8 then null else now() end
         )
         on conflict (user_id) do update set
           email_new_listings = excluded.email_new_listings,
           email_haraka_news = excluded.email_haraka_news,
           whatsapp_new_listings = excluded.whatsapp_new_listings,
           whatsapp_haraka_news = excluded.whatsapp_haraka_news,
           whatsapp_phone = coalesce(excluded.whatsapp_phone, user_marketing_preferences.whatsapp_phone),
           email_opted_in_at = case
             when excluded.email_new_listings or excluded.email_haraka_news then coalesce(user_marketing_preferences.email_opted_in_at, now())
             else user_marketing_preferences.email_opted_in_at
           end,
           email_opted_out_at = case
             when excluded.email_new_listings or excluded.email_haraka_news then null
             else now()
           end,
           whatsapp_opted_in_at = case
             when excluded.whatsapp_new_listings or excluded.whatsapp_haraka_news then coalesce(user_marketing_preferences.whatsapp_opted_in_at, now())
             else user_marketing_preferences.whatsapp_opted_in_at
           end,
           whatsapp_opted_out_at = case
             when excluded.whatsapp_new_listings or excluded.whatsapp_haraka_news then null
             else now()
           end,
           updated_at = now()
         returning *`,
        [input.userId, emailNew, emailNews, waNew, waNews, input.whatsappPhone ?? null, emailEnabled, waEnabled]
      );
      return mapMarketing(result.rows[0]);
    },

    async listSavedListings(userId: string): Promise<SavedListingView[]> {
      const result = await client.query<SavedRow>(
        `select id, user_id, listing_id, created_at
         from saved_listings
         where user_id = $1
         order by created_at desc`,
        [userId]
      );

      const views: SavedListingView[] = [];
      for (const row of result.rows) {
        const listing = await listingRepo.getPublicListingById(row.listing_id);
        views.push({
          saved: mapSaved(row),
          listing,
          available: listing !== null
        });
      }
      return views;
    },

    async isListingSaved(userId: string, listingId: string): Promise<boolean> {
      const result = await client.query<{ exists: boolean }>(
        `select exists(
           select 1 from saved_listings where user_id = $1 and listing_id = $2
         ) as exists`,
        [userId, listingId]
      );
      return Boolean(result.rows[0]?.exists);
    },

    async listSavedListingIds(userId: string): Promise<string[]> {
      const result = await client.query<{ listing_id: string }>(
        `select listing_id from saved_listings where user_id = $1`,
        [userId]
      );
      return result.rows.map((row) => row.listing_id);
    },

    async saveListing(id: string, userId: string, listingId: string): Promise<SavedListing> {
      const result = await client.query<SavedRow>(
        `insert into saved_listings (id, user_id, listing_id)
         values ($1, $2, $3)
         on conflict (user_id, listing_id) do update set listing_id = excluded.listing_id
         returning id, user_id, listing_id, created_at`,
        [id, userId, listingId]
      );
      return mapSaved(result.rows[0]);
    },

    async unsaveListing(userId: string, listingId: string): Promise<boolean> {
      const result = await client.query(
        `delete from saved_listings where user_id = $1 and listing_id = $2`,
        [userId, listingId]
      );
      return (result.rowCount ?? 0) > 0;
    },

    async listApplicationsForUser(userId: string): Promise<MarketplaceApplicationView[]> {
      const result = await client.query<ApplicationListRow>(
        `select id as application_id, listing_id, status, full_name, email, phone, created_at
         from listing_applications
         where user_id = $1
         order by created_at desc`,
        [userId]
      );

      const views: MarketplaceApplicationView[] = [];
      for (const row of result.rows) {
        const listing = await listingRepo.getPublicListingById(row.listing_id);
        views.push({
          applicationId: row.application_id,
          listingId: row.listing_id,
          status: row.status,
          fullName: row.full_name,
          email: row.email,
          phone: row.phone,
          createdAtIso: toIso(row.created_at),
          listing,
          available: listing !== null
        });
      }
      return views;
    },

    async listViewingRequestsForUser(userId: string): Promise<MarketplaceViewingRequestView[]> {
      const result = await client.query<ViewingRow>(
        `select id, listing_id, organization_id, user_id, full_name, email, phone,
                preferred_date, message, status, created_at, updated_at
         from viewing_requests
         where user_id = $1
         order by created_at desc`,
        [userId]
      );

      const views: MarketplaceViewingRequestView[] = [];
      for (const row of result.rows) {
        const listing = await listingRepo.getPublicListingById(row.listing_id);
        views.push({
          request: mapViewing(row),
          listing,
          available: listing !== null
        });
      }
      return views;
    }
  };
}

export function createMarketplaceRepositoryFromEnv(env: DatabaseEnvSource = process.env): MarketplaceRepository {
  const envResult = readDatabaseEnv(env);
  if (!envResult.success) {
    throw new Error(envResult.error);
  }
  const client = new Pool({ connectionString: envResult.data.connectionString });
  return createPostgresMarketplaceRepository(client);
}
