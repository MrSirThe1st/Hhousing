import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { faker } from "@faker-js/faker/locale/fr";
import {
  CITIES,
  CURRENCIES,
  SEED_EMAIL_DOMAIN,
  SEED_ID_PREFIX,
  AMENITIES,
  PROPERTY_PHOTO_IDS
} from "./config.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function loadEnvFiles() {
  const roots = [
    path.resolve(__dirname, "../../../../.env"),
    path.resolve(__dirname, "../../../.env.local"),
    path.resolve(__dirname, "../../../.env")
  ];
  for (const filePath of roots) {
    if (!fs.existsSync(filePath)) continue;
    const content = fs.readFileSync(filePath, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^\s*([\w.\-_]+)\s*=\s*(.*)?\s*$/);
      if (!match) continue;
      const key = match[1];
      let value = match[2] || "";
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
  }
}

export function assertSafeToSeed({ allowRemote = false } = {}) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "Refusing to run demo seed: NODE_ENV=production. This script is local/staging only."
    );
  }

  const databaseUrl = process.env.DATABASE_URL || "";
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required.");
  }

  const isLocal =
    /localhost|127\.0\.0\.1|0\.0\.0\.0|host\.docker\.internal/i.test(databaseUrl) ||
    databaseUrl.includes("@db:") ||
    databaseUrl.includes("postgres:5432");

  const stagingHint =
    /staging|stg\.|dev\.|preview|neon\.tech|supabase\.co/i.test(databaseUrl) ||
    process.env.SEED_TARGET === "staging";

  if (!isLocal && !stagingHint && !allowRemote) {
    throw new Error(
      "DATABASE_URL does not look local/staging. Pass --allow-remote to seed a remote non-production DB, or set SEED_TARGET=staging."
    );
  }

  if (/prod|production/i.test(databaseUrl) && !/non[-_]?prod/i.test(databaseUrl)) {
    throw new Error(
      "DATABASE_URL appears to reference production. Refusing to run demo seed."
    );
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for auth user seeding."
    );
  }
}

/** Deterministic seed IDs: seed_{kind}_{padded} */
export function seedId(kind, n, width = 4) {
  return `${SEED_ID_PREFIX}${kind}_${String(n).padStart(width, "0")}`;
}

export function isSeedId(id) {
  return typeof id === "string" && id.startsWith(SEED_ID_PREFIX);
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function chance(p) {
  return Math.random() < p;
}

export function frenchFullName() {
  return `${faker.person.firstName()} ${faker.person.lastName()}`;
}

export function drcPhone() {
  // +243 9X XXX XXXX (mobile)
  const prefix = pick(["81", "82", "83", "84", "85", "89", "90", "97", "99"]);
  const rest = String(randInt(1000000, 9999999));
  return `+243${prefix}${rest}`;
}

export function normalizePhone(phone) {
  return phone.replace(/\D/g, "");
}

export function pickCity() {
  return pick(CITIES);
}

export function streetAddress(city) {
  const streets = [
    "Avenue de la Libération",
    "Boulevard du 30 Juin",
    "Avenue Lumumba",
    "Avenue Kasa-Vubu",
    "Avenue des Aviateurs",
    "Boulevard Triomphal",
    "Avenue Sendwe",
    "Avenue de l'Université",
    "Rue de la Paix",
    "Avenue Père Boka"
  ];
  return `${randInt(1, 240)} ${pick(streets)}, ${pick(city.quartiers)}, ${city.name}`;
}

export function propertyName(city, index) {
  const kinds = [
    "Résidence",
    "Immeuble",
    "Villa",
    "Cour",
    "Compound",
    "Appartements",
    "Galerie"
  ];
  const suffixes = [
    "Mukendi",
    "Oasis",
    "Palmira",
    "Étoile",
    "Horizon",
    "Nyota",
    "Bondeko",
    "Mwinda",
    "Karavia",
    "Gombe Heights"
  ];
  return `${pick(kinds)} ${pick(suffixes)} ${city.name.slice(0, 3).toUpperCase()}-${index}`;
}

export function rentAmount(currency) {
  if (currency === "USD") {
    return Number((randInt(250, 2800) + Math.random()).toFixed(2));
  }
  // CDF roughly 2000–3500 per USD-ish; keep round-ish figures
  return Number((randInt(500000, 6500000)).toFixed(2));
}

export function pickCurrency() {
  // Prefer USD for mid/high, CDF for more "local" mix
  return chance(0.55) ? "USD" : "CDF";
}

export function randomPastDate(daysBackMin, daysBackMax) {
  const days = randInt(daysBackMin, daysBackMax);
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(randInt(7, 20), randInt(0, 59), randInt(0, 59), 0);
  return d;
}

export function toDateOnly(d) {
  return d.toISOString().slice(0, 10);
}

export function toTimestamptz(d) {
  return d.toISOString();
}

export function monthKeysBack(count) {
  const keys = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    keys.push(`${y}-${m}`);
  }
  return keys.reverse();
}

export function unitAmenities() {
  const count = randInt(2, 5);
  const shuffled = [...AMENITIES].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function seedEmail(local) {
  return `${local}@${SEED_EMAIL_DOMAIN}`;
}

/**
 * Stable public housing image URLs (no Storage upload).
 * Picks from a curated Unsplash house/apartment pool so catalogue
 * photos look like logements instead of random picsum scenery.
 */
export function unsplashHousingUrl(photoId, width = 960, height = 640) {
  return `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=${width}&h=${height}&q=80`;
}

export function propertyPhotoUrls(seedKey, count = null) {
  const n = count ?? randInt(1, 3);
  const base = Math.abs(hashString(String(seedKey)));
  const urls = [];
  for (let i = 0; i < n; i++) {
    const id = PROPERTY_PHOTO_IDS[(base + i * 7) % PROPERTY_PHOTO_IDS.length];
    urls.push(unsplashHousingUrl(id));
  }
  return urls;
}

/** Stable portrait-style photo for a tenant. */
export function tenantPhotoUrl(seedKey) {
  // Mix gender folders; index 0–99 is a fixed catalog on randomuser.me
  const folder = chance(0.5) ? "men" : "women";
  const idx = Math.abs(hashString(String(seedKey))) % 100;
  return `https://randomuser.me/api/portraits/${folder}/${idx}.jpg`;
}

function hashString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return h;
}

/**
 * Bulk insert using multi-row VALUES.
 * rows: array of plain objects; columns: ordered column names.
 */
export async function bulkInsert(client, table, columns, rows, { batchSize = 400 } = {}) {
  if (!rows.length) return 0;
  let inserted = 0;
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const values = [];
    const params = [];
    let p = 1;
    for (const row of batch) {
      const placeholders = [];
      for (const col of columns) {
        placeholders.push(`$${p++}`);
        params.push(row[col] ?? null);
      }
      values.push(`(${placeholders.join(",")})`);
    }
    const sql = `insert into ${table} (${columns.join(",")}) values ${values.join(",")}`;
    await client.query(sql, params);
    inserted += batch.length;
  }
  return inserted;
}

export async function tableHasSeedData(client) {
  const result = await client.query(
    `select 1 from organizations where id like $1 limit 1`,
    [`${SEED_ID_PREFIX}%`]
  );
  return result.rowCount > 0;
}

/**
 * Wipe only tagged seed data. Never touches non-seed rows.
 */
export async function wipeSeedData(client, supabase) {
  console.log("Wiping tagged seed data (seed_* / @seed.demo only)...");

  await client.query("begin");
  try {
    const orgFilter = `organization_id like '${SEED_ID_PREFIX}%'`;
    const idFilter = `id like '${SEED_ID_PREFIX}%'`;

    // Child tables by org membership / seed ids
    const statements = [
      `delete from property_service_providers where ${orgFilter} or service_provider_id like '${SEED_ID_PREFIX}%'`,
      `delete from service_providers where ${idFilter}`,
      `delete from listing_applications where ${orgFilter}`,
      `delete from listings where ${orgFilter}`,
      `delete from messages where ${orgFilter}`,
      `delete from conversations where ${orgFilter}`,
      `delete from documents where ${orgFilter}`,
      `delete from tasks where ${orgFilter} and (system_code = 'maintenance_follow_up' or related_entity_type = 'maintenance_request' or maintenance_request_id is not null)`,
      `delete from calendar_events where ${orgFilter} and (event_type = 'maintenance' or related_entity_type = 'maintenance_request' or maintenance_request_id is not null)`,
      `delete from maintenance_request_events where ${orgFilter}`,
      `delete from maintenance_requests where ${orgFilter}`,
      `delete from member_functions where function_id in (select id from team_functions where ${orgFilter} and function_code = 'MAINTENANCE_MANAGER')`,
      `delete from team_functions where ${orgFilter} and function_code = 'MAINTENANCE_MANAGER'`,
      `delete from expenses where ${orgFilter}`,
      `delete from invoice_payment_applications where ${orgFilter}`,
      `delete from invoices where ${orgFilter}`,
      `delete from finance_ledger_entries where ${orgFilter}`,
      `delete from lease_credit_balances where ${orgFilter}`,
      `delete from payments where ${orgFilter}`,
      `delete from lease_charge_templates where ${orgFilter}`,
      `delete from leases where ${orgFilter}`,
      `delete from tenants where ${orgFilter}`,
      `delete from units where ${orgFilter}`,
      `delete from properties where ${orgFilter}`,
      `delete from member_functions where ${orgFilter}`,
      `delete from organization_memberships where ${orgFilter}`,
      `delete from team_functions where ${orgFilter}`,
      `delete from owner_portal_accesses where ${orgFilter}`,
      `delete from owner_invitations where ${orgFilter}`,
      `delete from owners where ${orgFilter}`,
      `delete from organizations where ${idFilter}`
    ];

    for (const sql of statements) {
      try {
        const res = await client.query(sql);
        if (res.rowCount) {
          console.log(`  ${sql.split(" ")[2]}: ${res.rowCount} rows`);
        }
      } catch (err) {
        // Table may not exist in older DBs — skip quietly if relation missing
        if (err?.code === "42P01") {
          console.log(`  skip missing table in: ${sql.split(" ")[2]}`);
          continue;
        }
        throw err;
      }
    }

    // Platform admin grant for seed admin (if present)
    await client.query(
      `delete from platform_admins pa
       using auth.users u
       where pa.user_id = u.id
         and lower(u.email) like $1`,
      [`%@${SEED_EMAIL_DOMAIN}`]
    );

    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  }

  // Auth users (@seed.demo) via Admin API — never deletes other emails
  console.log("Removing @seed.demo auth users...");
  let page = 1;
  const perPage = 200;
  const toDelete = [];
  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    for (const u of users) {
      if (u.email && u.email.toLowerCase().endsWith(`@${SEED_EMAIL_DOMAIN}`)) {
        toDelete.push(u.id);
      }
    }
    if (users.length < perPage) break;
    page += 1;
    if (page > 50) break;
  }

  for (const id of toDelete) {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) {
      console.warn(`  failed to delete auth user ${id}: ${error.message}`);
    }
  }
  console.log(`  deleted ${toDelete.length} auth users`);
}

export { faker, CURRENCIES };
