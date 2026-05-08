import { createHash, randomBytes } from "node:crypto";
import pg from "pg";

const [
  ,
  ,
  workspaceId,
  name = "Development API key",
  scopesArg = "leads:read,leads:write",
] = process.argv;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required.");
}

if (!process.env.API_KEY_PEPPER) {
  throw new Error("API_KEY_PEPPER is required.");
}

if (!workspaceId) {
  throw new Error("Usage: node scripts/create-api-key.mjs <workspace_id> [name] [comma_scopes]");
}

const publicPrefix = randomBytes(6).toString("hex");
const secret = randomBytes(24).toString("base64url");
const rawKey = `cp_live_${publicPrefix}_${secret}`;
const keyHash = createHash("sha256")
  .update(`${process.env.API_KEY_PEPPER}:${rawKey}`)
  .digest("hex");
const scopes = scopesArg
  .split(",")
  .map((scope) => scope.trim())
  .filter(Boolean);

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const result = await pool.query(
  `
    insert into api_keys (workspace_id, name, public_prefix, key_hash, scopes)
    values ($1, $2, $3, $4, $5)
    returning id
  `,
  [workspaceId, name, publicPrefix, keyHash, scopes]
);
await pool.end();

console.log(JSON.stringify({ id: result.rows[0].id, key: rawKey, scopes }, null, 2));
