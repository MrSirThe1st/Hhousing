import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Read .env.local
const envPath = path.resolve("apps/web-manager/.env.local");
const envContent = fs.readFileSync(envPath, "utf-8");

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`^${name}=(.*)$`, "m"));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnvVar("NEXT_PUBLIC_SUPABASE_URL");
const serviceRoleKey = getEnvVar("SUPABASE_SERVICE_ROLE_KEY");

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const email = `test-user-${Date.now()}@example.com`;
const password = "Password123!";

async function run() {
  console.log(`Creating test user: ${email}`);
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "Test User Admin" }
  });

  if (error) {
    console.error("Error creating user:", error);
    process.exit(1);
  }

  console.log("Successfully created user:", data.user.id);
  console.log("------------------------");
  console.log(`EMAIL: ${email}`);
  console.log(`PASSWORD: ${password}`);
  console.log("------------------------");
}

run();
