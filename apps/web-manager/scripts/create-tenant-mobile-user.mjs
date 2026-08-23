import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";
import pg from "pg";
import { randomUUID } from "crypto";

const envPath = path.resolve("apps/web-manager/.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");

function getEnvVar(name) {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, "m"));
  return match ? match[1].trim() : null;
}

function normalizeTenantPhoneNumber(rawPhone) {
  const digits = rawPhone.replace(/\D/g, "");
  if (digits.length === 0) return null;
  if (digits.startsWith("243") && digits.length >= 11) return digits;
  if (digits.startsWith("0") && digits.length >= 10) return `243${digits.slice(1)}`;
  if (digits.length === 9) return `243${digits}`;
  if (digits.length >= 10 && digits.length <= 15) return digits;
  return null;
}

function buildSyntheticEmail(phoneNormalized) {
  return `${phoneNormalized}@phone.tenant.harakaproperty.local`;
}

const supabaseUrl = getEnvVar("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");
const databaseUrl = getEnvVar("DATABASE_URL");

const phoneArg = process.argv[2] ?? "976792066";
const password = process.argv[3] ?? "111111111";
const fullName = process.argv[4] ?? "Michel Test Tenant";

if (!supabaseUrl || !serviceRoleKey || !databaseUrl) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or DATABASE_URL in .env.local");
  process.exit(1);
}

const phoneNormalized = normalizeTenantPhoneNumber(phoneArg);
if (!phoneNormalized) {
  console.error("Invalid phone number:", phoneArg);
  process.exit(1);
}

const phoneE164 = `+${phoneNormalized}`;
const syntheticEmail = buildSyntheticEmail(phoneNormalized);

async function findSupabaseUserByEmail(supabase, email) {
  const { data, error } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) throw error;
  const normalized = email.toLowerCase();
  return data.users.find((user) => user.email?.toLowerCase() === normalized) ?? null;
}

async function upsertSupabaseUser(supabase, { email, password, phone }) {
  const existing = await findSupabaseUserByEmail(supabase, email);
  if (existing) {
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, {
      email,
      password,
      email_confirm: true,
      user_metadata: { phone }
    });
    if (error) throw error;
    return data.user.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { phone }
  });
  if (error) throw error;
  return data.user.id;
}

async function run() {
  const pool = new pg.Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false }
  });
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  try {
    const existingTenant = await pool.query(
      `select id, organization_id, auth_user_id, full_name, account_status
       from tenants
       where phone_normalized = $1`,
      [phoneNormalized]
    );

    let tenantId;
    let organizationId;
    let authUserId;

    if (existingTenant.rows[0]) {
      tenantId = existingTenant.rows[0].id;
      organizationId = existingTenant.rows[0].organization_id;
      authUserId = existingTenant.rows[0].auth_user_id;
      console.log(`Found existing tenant ${tenantId}`);
    } else {
      const orgResult = await pool.query(
        `select id, name from organizations order by created_at asc limit 1`
      );
      if (!orgResult.rows[0]) {
        throw new Error("No organization found in database");
      }
      organizationId = orgResult.rows[0].id;
      tenantId = randomUUID();
      await pool.query(
        `insert into tenants (
           id, organization_id, auth_user_id, full_name, email, phone, phone_normalized
         ) values ($1, $2, null, $3, null, $4, $5)`,
        [tenantId, organizationId, fullName, phoneE164, phoneNormalized]
      );
      console.log(`Created tenant ${tenantId} in org ${orgResult.rows[0].name}`);
    }

    authUserId = await upsertSupabaseUser(supabase, {
      email: syntheticEmail,
      password,
      phone: phoneE164
    });
    console.log(`Supabase user ready: ${authUserId}`);

    const membershipExisting = await pool.query(
      `select id from organization_memberships where user_id = $1 and organization_id = $2`,
      [authUserId, organizationId]
    );
    if (!membershipExisting.rows[0]) {
      await pool.query(
        `insert into organization_memberships (
           id, organization_id, user_id, role, status, can_own_properties
         ) values ($1, $2, $3, 'tenant', 'active', false)`,
        [randomUUID(), organizationId, authUserId]
      );
      console.log("Created tenant organization membership");
    } else {
      console.log("Organization membership already exists");
    }

    const linked = await pool.query(
      `update tenants
       set auth_user_id = $1,
           phone = $2,
           phone_normalized = $3,
           account_status = 'active'
       where id = $4 and organization_id = $5
       returning id, auth_user_id`,
      [authUserId, phoneE164, phoneNormalized, tenantId, organizationId]
    );

    if (!linked.rows[0]?.auth_user_id) {
      throw new Error("Failed to link tenant auth user");
    }

    const loginCheck = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        apikey: getEnvVar("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ?? getEnvVar("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? ""
      },
      body: JSON.stringify({ email: syntheticEmail, password })
    });

    if (!loginCheck.ok) {
      const text = await loginCheck.text();
      throw new Error(`Login verification failed: ${loginCheck.status} ${text}`);
    }

    console.log("------------------------");
    console.log("Mobile login ready");
    console.log(`PHONE: ${phoneNormalized.slice(3)} (or ${phoneE164})`);
    console.log(`PASSWORD: ${password}`);
    console.log(`TENANT_ID: ${tenantId}`);
    console.log("------------------------");
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
