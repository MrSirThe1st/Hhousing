const { Client } = require("pg");
const fs = require("fs");
const path = require("path");

async function main() {
  const envPath = path.resolve(__dirname, "../../../.env");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
      const match = line.match(/^\s*([\w.\-_]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || "";
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.slice(1, -1);
        }
        process.env[key] = value;
      }
    });
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();

  console.log("Connected to database. Applying migration...");
  try {
    const sql = fs.readFileSync(path.resolve(__dirname, "../../../db/migrations/0047_add_posted_by_to_listings.sql"), "utf-8");
    await client.query(sql);
    console.log("Migration applied successfully!");
  } catch (err) {
    if (err.message.includes("already exists")) {
      console.log("Column show_posted_by already exists. Skipping.");
    } else {
      console.error("Failed to apply migration:", err.message);
    }
  } finally {
    await client.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
