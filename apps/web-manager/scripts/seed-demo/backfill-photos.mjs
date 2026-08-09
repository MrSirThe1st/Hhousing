/**
 * One-shot: replace seed_* property / listing photos
 * with curated Unsplash housing images (instead of picsum scenery).
 *
 * Usage: node apps/web-manager/scripts/seed-demo/backfill-photos.mjs [--allow-remote]
 */
import pg from "pg";
import {
  assertSafeToSeed,
  loadEnvFiles,
  propertyPhotoUrls
} from "./lib.mjs";

loadEnvFiles();
assertSafeToSeed({ allowRemote: process.argv.includes("--allow-remote") });

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const props = await client.query(
    `select id from properties where id like 'seed_%' order by id`
  );

  let propUpdated = 0;
  for (const row of props.rows) {
    const urls = propertyPhotoUrls(row.id, 1 + (Math.abs(hashCode(row.id)) % 3));
    await client.query(`update properties set photo_urls = $1 where id = $2`, [urls, row.id]);
    propUpdated += 1;
  }
  console.log("properties updated:", propUpdated);

  const listings = await client.query(
    `select l.id, l.property_id, p.photo_urls
     from listings l
     join properties p on p.id = l.property_id
     where l.organization_id like 'seed_%'`
  );

  let listingUpdated = 0;
  for (const row of listings.rows) {
    const photos = Array.isArray(row.photo_urls) ? row.photo_urls : [];
    // If property photos empty somehow, synthesize from listing id
    const urls = photos.length ? photos : propertyPhotoUrls(row.id, 2);
    await client.query(
      `update listings
       set cover_image_url = $1,
           gallery_image_urls = $2
       where id = $3`,
      [urls[0] ?? null, urls.slice(1), row.id]
    );
    listingUpdated += 1;
  }
  console.log("listings updated:", listingUpdated);

  const tenRes = await client.query(`
    update tenants t
    set photo_url = format(
      'https://randomuser.me/api/portraits/%s/%s.jpg',
      case when abs(hashtext(t.id)) % 2 = 0 then 'men' else 'women' end,
      abs(hashtext(t.id)) % 100
    )
    where t.id like 'seed_%'
  `);
  console.log("tenants updated:", tenRes.rowCount);

  const sampleP = await client.query(
    `select id, photo_urls from properties where id like 'seed_%' limit 1`
  );
  const sampleL = await client.query(
    `select id, cover_image_url, gallery_image_urls from listings where organization_id like 'seed_%' limit 1`
  );
  console.log("sample property:", sampleP.rows[0]);
  console.log("sample listing:", sampleL.rows[0]);
} finally {
  await client.end();
}

function hashCode(s) {
  let h = 0;
  for (let i = 0; i < String(s).length; i++) h = (h * 31 + String(s).charCodeAt(i)) | 0;
  return h;
}
