import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationsDir = path.join(root, "db", "migrations");
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to run migrations.");
}

const pool = new pg.Pool({ connectionString });

await pool.query(`
  create table if not exists schema_migrations (
    version text primary key,
    applied_at timestamptz not null default now()
  )
`);

const files = (await readdir(migrationsDir))
  .filter((file) => file.endsWith(".sql"))
  .sort();

for (const file of files) {
  const version = file.replace(/\.sql$/, "");
  const existing = await pool.query("select 1 from schema_migrations where version = $1", [
    version,
  ]);

  if (existing.rowCount) {
    console.log(`Skipping ${file}`);
    continue;
  }

  const sql = await readFile(path.join(migrationsDir, file), "utf8");
  await pool.query("begin");
  try {
    await pool.query(sql);
    await pool.query("insert into schema_migrations (version) values ($1)", [version]);
    await pool.query("commit");
    console.log(`Applied ${file}`);
  } catch (error) {
    await pool.query("rollback");
    throw error;
  }
}

await pool.end();
