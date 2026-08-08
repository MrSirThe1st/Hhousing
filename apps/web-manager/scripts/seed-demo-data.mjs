#!/usr/bin/env node
/**
 * Hhousing demo data seeder
 *
 * Safe, tagged seed for local + staging only.
 * - IDs prefixed with seed_
 * - Auth emails @seed.demo
 * - Never deletes/overwrites non-seed data
 *
 * Usage (repo root):
 *   pnpm seed:demo
 *   pnpm seed:demo:wipe
 *   pnpm seed:demo:refresh
 *   pnpm seed:demo -- --allow-remote
 *
 * Requires: DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import pg from "pg";
import { createClient } from "@supabase/supabase-js";
import { SEED_PASSWORD } from "./seed-demo/config.mjs";
import {
  assertSafeToSeed,
  loadEnvFiles,
  tableHasSeedData,
  wipeSeedData
} from "./seed-demo/lib.mjs";
import { runSeed } from "./seed-demo/generate.mjs";

function parseArgs(argv) {
  const args = new Set(argv.slice(2));
  return {
    wipe: args.has("--wipe-seed-data"),
    seedAfterWipe: args.has("--seed") || args.has("--force"),
    allowRemote: args.has("--allow-remote"),
    help: args.has("--help") || args.has("-h")
  };
}

function printHelp() {
  console.log(`Hhousing demo seeder

Options:
  --wipe-seed-data   Delete only seed_* / @seed.demo data
  --seed             With --wipe-seed-data: re-seed after wipe
  --force            Alias for --seed (wipe + re-seed)
  --allow-remote     Allow non-local DATABASE_URL (staging)
  --help             Show this help

Safety:
  Refuses NODE_ENV=production
  Refuses production-looking DATABASE_URL
  Never touches non-seed rows
`);
}

function printCredentials(credentials) {
  console.log("\n========================================");
  console.log("  SEED LOGIN CREDENTIALS");
  console.log("  Shared password:", SEED_PASSWORD);
  console.log("========================================");
  for (const c of credentials) {
    console.log(`\n[${c.type}] ${c.email}`);
    console.log(`  password: ${c.password}`);
    if (c.userId) console.log(`  user_id:  ${c.userId}`);
    if (c.note) console.log(`  note:     ${c.note}`);
  }
  console.log("\n========================================\n");
}

async function main() {
  loadEnvFiles();
  const opts = parseArgs(process.argv);

  if (opts.help) {
    printHelp();
    process.exit(0);
  }

  assertSafeToSeed({ allowRemote: opts.allowRemote });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    const hasSeed = await tableHasSeedData(client);

    if (opts.wipe) {
      await wipeSeedData(client, supabase);
      if (!opts.seedAfterWipe) {
        console.log("Wipe complete. Pass --wipe-seed-data --seed to wipe and re-seed.");
        return;
      }
    } else if (hasSeed) {
      console.log(
        "Seed data already present (organizations id like seed_%). Skipping insert."
      );
      console.log("Use --wipe-seed-data --seed to refresh demo data.");
      console.log("\nKnown demo password:", SEED_PASSWORD);
      console.log("Emails: admin@seed.demo, pm1@seed.demo, tenant1@seed.demo, ...");
      return;
    }

    console.log("Starting demo seed...");
    const { credentials, summary } = await runSeed(client);

    console.log("\nSeed complete:");
    for (const [k, v] of Object.entries(summary)) {
      console.log(`  ${k}: ${v}`);
    }
    printCredentials(credentials);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error("\nSeed failed:", err.message || err);
  if (err.stack) console.error(err.stack);
  process.exit(1);
});
