/**
 * One-shot cleanup: remove leftover seeded maintenance data (and related tasks).
 *
 * Safe: only touches seed_* organization rows.
 *
 * Usage:
 *   node apps/web-manager/scripts/seed-demo/cleanup-maintenance.mjs [--allow-remote]
 */
import pg from "pg";
import { SEED_ID_PREFIX } from "./config.mjs";
import { assertSafeToSeed, loadEnvFiles } from "./lib.mjs";

loadEnvFiles();
assertSafeToSeed({ allowRemote: process.argv.includes("--allow-remote") });

const orgFilter = `organization_id like '${SEED_ID_PREFIX}%'`;

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query("begin");

  const steps = [
    {
      label: "tasks (maintenance follow-ups)",
      sql: `delete from tasks
            where ${orgFilter}
              and (
                system_code = 'maintenance_follow_up'
                or related_entity_type = 'maintenance_request'
                or maintenance_request_id is not null
                or system_key like 'maintenance:%'
              )`
    },
    {
      label: "calendar_events (maintenance)",
      sql: `delete from calendar_events
            where ${orgFilter}
              and (
                event_type = 'maintenance'
                or related_entity_type = 'maintenance_request'
                or maintenance_request_id is not null
              )`
    },
    {
      label: "maintenance_request_events",
      sql: `delete from maintenance_request_events where ${orgFilter}`
    },
    {
      label: "maintenance_requests",
      sql: `delete from maintenance_requests where ${orgFilter}`
    },
    {
      label: "member_functions (MAINTENANCE_MANAGER)",
      sql: `delete from member_functions
            where function_id in (
              select id from team_functions
              where ${orgFilter} and function_code = 'MAINTENANCE_MANAGER'
            )`
    },
    {
      label: "team_functions (MAINTENANCE_MANAGER)",
      sql: `delete from team_functions
            where ${orgFilter} and function_code = 'MAINTENANCE_MANAGER'`
    }
  ];

  for (const step of steps) {
    try {
      const result = await client.query(step.sql);
      console.log(`${step.label}: ${result.rowCount ?? 0} rows`);
    } catch (error) {
      if (error?.code === "42P01") {
        console.log(`${step.label}: skipped (table missing)`);
        continue;
      }
      throw error;
    }
  }

  await client.query("commit");
  console.log("Maintenance seed cleanup complete.");
} catch (error) {
  await client.query("rollback");
  console.error("Cleanup failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
