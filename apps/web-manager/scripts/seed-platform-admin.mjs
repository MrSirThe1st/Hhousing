/**
 * Seed the first platform admin: create Supabase auth user (if needed) + platform_admins row.
 *
 * Usage (from repo root):
 *   node apps/web-manager/scripts/seed-platform-admin.mjs
 *   node apps/web-manager/scripts/seed-platform-admin.mjs admin@example.com 'YourSecurePassword123!'
 *
 * Env (optional defaults):
 *   PLATFORM_ADMIN_EMAIL
 *   PLATFORM_ADMIN_PASSWORD
 *   PLATFORM_ADMIN_NAME (default: "Platform Admin")
 *
 * Requires:
 *   DATABASE_URL
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *
 * After seeding, sign in at /login — middleware routes platform admins to /admin.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";
import { createClient } from "@supabase/supabase-js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }
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
    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

loadEnvFile(path.resolve(__dirname, "../../../.env"));
loadEnvFile(path.resolve(__dirname, "../.env.local"));

const email = (process.argv[2] || process.env.PLATFORM_ADMIN_EMAIL || "").trim();
const password = process.argv[3] || process.env.PLATFORM_ADMIN_PASSWORD || "";
const fullName = (process.env.PLATFORM_ADMIN_NAME || "Platform Admin").trim();

if (!email || !password) {
  console.error(`Usage: node apps/web-manager/scripts/seed-platform-admin.mjs <email> <password>

Or set PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD in .env`);
  process.exit(1);
}

if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!databaseUrl || !supabaseUrl || !serviceRoleKey) {
  console.error("DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY are required.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

const pgClient = new pg.Client({ connectionString: databaseUrl });

async function findUserIdByEmail(client, userEmail) {
  const result = await client.query(
    `select id::text as id, email from auth.users where lower(email) = lower($1) limit 1`,
    [userEmail]
  );
  return result.rows[0] ?? null;
}

async function ensurePlatformAdminTable(client) {
  const result = await client.query(
    `select to_regclass('public.platform_admins') as table_name`
  );
  if (!result.rows[0]?.table_name) {
    console.error(
      "platform_admins table not found. Apply db/migrations/0056_platform_admin.sql first."
    );
    process.exit(1);
  }
}

async function grantPlatformAdmin(client, userId) {
  await client.query(
    `insert into platform_admins (user_id, status, created_at, created_by_user_id)
     values ($1::uuid, 'active', now(), null)
     on conflict (user_id) do update set status = 'active'`,
    [userId]
  );
}

async function main() {
  await pgClient.connect();
  await ensurePlatformAdminTable(pgClient);

  let user = await findUserIdByEmail(pgClient, email);
  let created = false;

  if (!user) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName }
    });

    if (error) {
      console.error("Failed to create Supabase user:", error.message);
      process.exit(1);
    }

    user = { id: data.user.id, email: data.user.email ?? email };
    created = true;
  } else {
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      password,
      user_metadata: { full_name: fullName }
    });
    if (error) {
      console.warn(`User exists but password update failed: ${error.message}`);
      console.warn("Granting platform_admin anyway — use existing password or reset in Supabase.");
    }
  }

  await grantPlatformAdmin(pgClient, user.id);

  console.log("Platform admin seeded successfully.");
  console.log("------------------------");
  console.log(`EMAIL:    ${user.email}`);
  console.log(`PASSWORD: ${created ? password : "(unchanged if update failed — see above)"}`);
  console.log(`USER ID:  ${user.id}`);
  console.log("------------------------");
  console.log("Sign in at /login — you will be routed to /admin.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await pgClient.end();
  });
