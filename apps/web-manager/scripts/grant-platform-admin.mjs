/**
 * Grant platform_admin access to an existing Supabase user by email.
 *
 * Usage (from repo root):
 *   node apps/web-manager/scripts/grant-platform-admin.mjs user@example.com
 *
 * Requires DATABASE_URL (and optionally loads apps/web-manager/.env.local or root .env).
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

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

const email = process.argv[2]?.trim();
if (!email) {
  console.error("Usage: node apps/web-manager/scripts/grant-platform-admin.mjs <email>");
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const client = new pg.Client({ connectionString: databaseUrl });

async function main() {
  await client.connect();

  const userResult = await client.query(
    `select id::text as id, email from auth.users where lower(email) = lower($1) limit 1`,
    [email]
  );
  const user = userResult.rows[0];
  if (!user) {
    console.error(`No auth.users row found for email: ${email}`);
    process.exit(1);
  }

  await client.query(
    `insert into platform_admins (user_id, status, created_at, created_by_user_id)
     values ($1::uuid, 'active', now(), null)
     on conflict (user_id) do update set status = 'active'`,
    [user.id]
  );

  console.log(`Granted platform_admin to ${user.email} (${user.id})`);
  console.log("Sign in at /login — you will be redirected to /admin");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await client.end();
  });
