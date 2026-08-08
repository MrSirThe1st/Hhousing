/**
 * One-shot: create listings for vacant seed_* units that have none yet.
 * Does not wipe existing non-seed listings.
 *
 * Usage: node apps/web-manager/scripts/seed-demo/backfill-listings.mjs
 */
import pg from "pg";
import {
  LISTING_DESCRIPTIONS,
  LOGINABLE,
  SEED_EMAIL_DOMAIN,
  VOLUME
} from "./config.mjs";
import {
  assertSafeToSeed,
  bulkInsert,
  chance,
  drcPhone,
  frenchFullName,
  loadEnvFiles,
  normalizePhone,
  pick,
  randInt,
  randomPastDate,
  seedId,
  toTimestamptz
} from "./lib.mjs";

loadEnvFiles();
assertSafeToSeed({ allowRemote: process.argv.includes("--allow-remote") });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const existing = await client.query(
    `select count(*)::int as n from listings where organization_id like 'seed_%'`
  );
  if (existing.rows[0].n > 0) {
    console.log(`Seed listings already present (${existing.rows[0].n}). Nothing to do.`);
    process.exit(0);
  }

  const unitsRes = await client.query(`
    select
      u.id,
      u.organization_id,
      u.property_id,
      u.currency_code,
      u.monthly_rent_amount,
      p.name as property_name,
      p.city,
      p.photo_urls,
      p.status as property_status
    from units u
    join properties p on p.id = u.property_id and p.organization_id = u.organization_id
    where u.organization_id like 'seed_%'
      and u.status = 'vacant'
      and p.status = 'active'
      and not exists (
        select 1 from listings l where l.unit_id = u.id
      )
  `);

  const membersRes = await client.query(`
    select distinct on (om.organization_id)
      om.organization_id,
      om.user_id
    from organization_memberships om
    where om.organization_id like 'seed_%'
      and om.status = 'active'
    order by om.organization_id, om.created_at asc
  `);
  const creatorByOrg = new Map(membersRes.rows.map((r) => [r.organization_id, r.user_id]));

  const loginableEmails = LOGINABLE.operators.map((o) => o.email.toLowerCase());
  const authRes = await client.query(
    `select id::text as id, lower(email) as email
     from auth.users
     where lower(email) = any($1::text[])`,
    [loginableEmails]
  );
  const authByEmail = new Map(authRes.rows.map((r) => [r.email, r.id]));

  const listings = [];
  const listingApplications = [];
  let lstSeq = 1;
  let appSeq = 1;

  for (const unit of unitsRes.rows) {
    const publish = chance(VOLUME.listingPublishRate);
    const draft = !publish && chance(VOLUME.listingDraftRate);
    if (!publish && !draft) continue;

    const created = randomPastDate(3, 90);
    const status = publish ? "published" : "draft";
    const photos = Array.isArray(unit.photo_urls) ? unit.photo_urls : [];
    const creatorId = creatorByOrg.get(unit.organization_id);
    if (!creatorId) continue;

    const loginableEmail =
      LOGINABLE.operators.find((o) => authByEmail.get(o.email.toLowerCase()) === creatorId)?.email ??
      null;
    const listingId = seedId("lst", lstSeq++);

    listings.push({
      id: listingId,
      organization_id: unit.organization_id,
      property_id: unit.property_id,
      unit_id: unit.id,
      status,
      marketing_description: pick(LISTING_DESCRIPTIONS),
      cover_image_url: photos[0] ?? null,
      gallery_image_urls: photos.slice(1),
      youtube_url: null,
      instagram_url: null,
      contact_email: chance(0.7)
        ? loginableEmail ?? `contact+${String(unit.city || "rdc").toLowerCase()}@${SEED_EMAIL_DOMAIN}`
        : null,
      contact_phone: chance(0.85) ? drcPhone() : null,
      is_featured: status === "published" && chance(VOLUME.featuredListingRate),
      show_address: chance(0.35),
      show_rent: true,
      show_deposit: chance(0.85),
      show_amenities: true,
      show_features: true,
      show_bedrooms: true,
      show_bathrooms: true,
      show_size_sqm: true,
      show_posted_by: chance(0.4),
      published_at: status === "published" ? toTimestamptz(created) : null,
      created_by_user_id: creatorId,
      updated_by_user_id: creatorId,
      created_at: toTimestamptz(created),
      updated_at: toTimestamptz(created)
    });

    if (status === "published" && chance(VOLUME.listingApplicationChance)) {
      const appCount = randInt(1, 3);
      for (let a = 0; a < appCount; a++) {
        const appCreated = new Date(created.getTime() + randInt(1, 20) * 86400000);
        const appStatus = pick([
          "submitted",
          "submitted",
          "under_review",
          "approved",
          "rejected",
          "needs_more_info"
        ]);
        listingApplications.push({
          id: seedId("lap", appSeq++),
          listing_id: listingId,
          organization_id: unit.organization_id,
          full_name: frenchFullName(),
          email: `applicant${appSeq}@example.com`,
          phone: normalizePhone(drcPhone()),
          date_of_birth: null,
          employment_status: pick(["salarié", "indépendant", "fonctionnaire", null]),
          job_title: chance(0.6) ? pick(["Comptable", "Ingénieur", "Commerçant", "Enseignant"]) : null,
          employment_info: chance(0.4) ? "Profil candidat seed demo." : null,
          monthly_income: chance(0.55)
            ? Number(unit.monthly_rent_amount) * randInt(3, 7)
            : null,
          number_of_occupants: pick([1, 1, 2, 2, 3, 4]),
          notes: chance(0.3) ? "Intéressé(e) par une visite rapide." : null,
          status: appStatus,
          screening_notes:
            appStatus === "under_review" || appStatus === "approved" || appStatus === "rejected"
              ? "Notes de screening seed."
              : null,
          requested_info_message:
            appStatus === "needs_more_info" ? "Merci de fournir une fiche de paie récente." : null,
          reviewed_by_user_id: appStatus === "submitted" ? null : creatorId,
          reviewed_at:
            appStatus === "submitted"
              ? null
              : toTimestamptz(new Date(appCreated.getTime() + randInt(1, 5) * 86400000)),
          converted_tenant_id: null,
          created_at: toTimestamptz(appCreated),
          updated_at: toTimestamptz(appCreated)
        });
      }
    }
  }

  console.log(
    `Vacant listable units: ${unitsRes.rows.length}; creating ${listings.length} listings...`
  );

  await bulkInsert(
    client,
    "listings",
    [
      "id",
      "organization_id",
      "property_id",
      "unit_id",
      "status",
      "marketing_description",
      "cover_image_url",
      "gallery_image_urls",
      "youtube_url",
      "instagram_url",
      "contact_email",
      "contact_phone",
      "is_featured",
      "show_address",
      "show_rent",
      "show_deposit",
      "show_amenities",
      "show_features",
      "show_bedrooms",
      "show_bathrooms",
      "show_size_sqm",
      "show_posted_by",
      "published_at",
      "created_by_user_id",
      "updated_by_user_id",
      "created_at",
      "updated_at"
    ],
    listings,
    { batchSize: 300 }
  );

  await bulkInsert(
    client,
    "listing_applications",
    [
      "id",
      "listing_id",
      "organization_id",
      "full_name",
      "email",
      "phone",
      "date_of_birth",
      "employment_status",
      "job_title",
      "employment_info",
      "monthly_income",
      "number_of_occupants",
      "notes",
      "status",
      "screening_notes",
      "requested_info_message",
      "reviewed_by_user_id",
      "reviewed_at",
      "converted_tenant_id",
      "created_at",
      "updated_at"
    ],
    listingApplications,
    { batchSize: 300 }
  );

  const published = listings.filter((l) => l.status === "published").length;
  console.log(
    `Done. listings=${listings.length} published=${published} applications=${listingApplications.length}`
  );
} finally {
  await client.end();
}
