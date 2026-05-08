#!/usr/bin/env node
import { createHash, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const command = process.argv[2];
const args = process.argv.slice(3);
const whatsappFlowNames = ["salon", "mechanic", "tailor"];

const helpText = `ClientPad CLI

Usage:
  clientpad init [directory]
  clientpad init --whatsapp [directory]
  clientpad migrate [--migrations-dir <path>]
  clientpad api-key create <workspace_id> [name] [comma_scopes]
  clientpad api-key create --workspace-id <id> [--name <name>] [--scopes <comma_scopes>] [--billing-mode <mode>] [--monthly-request-limit <number>] [--rate-limit-per-minute <number>]
  clientpad api-key usage <api_key_id>
  clientpad whatsapp:setup
  clientpad whatsapp:flows [salon|mechanic|tailor]
  clientpad doctor
  clientpad help

Environment:
  DATABASE_URL      PostgreSQL connection string
  API_KEY_PEPPER   Secret pepper used when hashing API keys
`;

function readOption(name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  return args[index + 1] || fallback;
}

function readAnyOption(names, fallback) {
  for (const name of names) {
    const value = readOption(name, undefined);
    if (value !== undefined) return value;
  }
  return fallback;
}

async function initProject() {
  const includeWhatsapp = args.includes("--whatsapp");
  const targetArg = args.find((arg) => arg !== "--whatsapp" && !arg.startsWith("--"));
  const target = path.resolve(targetArg || ".");
  await mkdir(target, { recursive: true });
  await mkdir(path.join(target, "db", "migrations"), { recursive: true });

  await copyFile(
    path.join(packageRoot, "templates", "env.example"),
    path.join(target, ".env.example")
  );
  await copyFile(
    path.join(packageRoot, "templates", "clientpad.config.json"),
    path.join(target, "clientpad.config.json")
  );

  const migrations = await readdir(path.join(packageRoot, "migrations"));
  for (const migration of migrations.filter((file) => file.endsWith(".sql"))) {
    await copyFile(
      path.join(packageRoot, "migrations", migration),
      path.join(target, "db", "migrations", migration)
    );
  }

  if (includeWhatsapp) {
    await copyWhatsappTemplates(target);
  }

  console.log(`ClientPad initialized in ${target}${includeWhatsapp ? " with WhatsApp starter files" : ""}`);
}

async function copyWhatsappTemplates(target) {
  const files = [
    [".env.whatsapp.example", ".env.whatsapp.example"],
    [path.join("examples", "whatsapp", "server.mjs"), path.join("examples", "whatsapp", "server.mjs")],
    ...whatsappFlowNames.map((name) => [
      path.join("examples", "whatsapp", "flows", `${name}.json`),
      path.join("examples", "whatsapp", "flows", `${name}.json`),
    ]),
  ];

  for (const [sourceRelativePath, destinationRelativePath] of files) {
    const destination = path.join(target, destinationRelativePath);
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(path.join(packageRoot, "templates", sourceRelativePath), destination);
  }
}

async function migrate() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is required.");

  const migrationsDir = path.resolve(
    readOption("--migrations-dir", path.join(process.cwd(), "db", "migrations"))
  );
  if (!existsSync(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
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
}

async function createApiKey() {
  const positional = args.slice(1).filter((arg) => !arg.startsWith("--"));
  const workspaceId = readOption("--workspace-id", positional[0]);
  const name = readOption("--name", positional[1] || "Development API key");
  const scopesArg = readOption("--scopes", positional[2] || "leads:read,leads:write,usage:read");
  const billingMode = readOption("--billing-mode", "self_hosted");
  const monthlyRequestLimit = parseNullableInteger(readOption("--monthly-request-limit", ""));
  const rateLimitPerMinute = parseNullableInteger(readOption("--rate-limit-per-minute", ""));
  const connectionString = process.env.DATABASE_URL;
  const pepper = process.env.API_KEY_PEPPER;

  if (!connectionString) throw new Error("DATABASE_URL is required.");
  if (!pepper) throw new Error("API_KEY_PEPPER is required.");
  if (!workspaceId) {
    throw new Error("Usage: clientpad api-key create <workspace_id> [name] [comma_scopes]");
  }

  const publicPrefix = randomBytes(6).toString("hex");
  const secret = randomBytes(24).toString("base64url");
  const rawKey = `cp_live_${publicPrefix}_${secret}`;
  const keyHash = createHash("sha256").update(`${pepper}:${rawKey}`).digest("hex");
  const scopes = scopesArg.split(",").map((scope) => scope.trim()).filter(Boolean);

  const pool = new pg.Pool({ connectionString });
  const result = await pool.query(
    `
      insert into api_keys (
        workspace_id,
        name,
        public_prefix,
        key_hash,
        scopes,
        billing_mode,
        monthly_request_limit,
        rate_limit_per_minute
      )
      values ($1, $2, $3, $4, $5, $6, $7, $8)
      returning id
    `,
    [
      workspaceId,
      name,
      publicPrefix,
      keyHash,
      scopes,
      billingMode,
      monthlyRequestLimit,
      rateLimitPerMinute,
    ]
  );
  await pool.end();

  console.log(
    JSON.stringify(
      {
        id: result.rows[0].id,
        key: rawKey,
        scopes,
        billing_mode: billingMode,
        monthly_request_limit: monthlyRequestLimit,
        rate_limit_per_minute: rateLimitPerMinute,
      },
      null,
      2
    )
  );
}

async function getApiKeyUsage() {
  const apiKeyId = args[1];
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) throw new Error("DATABASE_URL is required.");
  if (!apiKeyId) throw new Error("Usage: clientpad api-key usage <api_key_id>");

  const pool = new pg.Pool({ connectionString });
  const result = await pool.query(
    `
      select
        api_key_id,
        workspace_id,
        month,
        request_count,
        rejected_count,
        created_at,
        updated_at
      from api_key_usage_months
      where api_key_id = $1
      order by month desc
      limit 12
    `,
    [apiKeyId]
  );
  await pool.end();

  console.log(JSON.stringify({ data: result.rows }, null, 2));
}

function whatsappSetup() {
  console.log(`WhatsApp setup checklist

1. Create a Meta developer app at https://developers.facebook.com/apps/.
2. Add the WhatsApp product to the app.
3. Copy the WhatsApp Phone Number ID into WHATSAPP_PHONE_NUMBER_ID.
4. Configure your webhook callback URL, for example:
   https://your-domain.example/webhooks/whatsapp
5. Set a webhook verify token and save it as WHATSAPP_VERIFY_TOKEN.
6. Create a permanent or system-user access token and save it as WHATSAPP_ACCESS_TOKEN.
7. Set WHATSAPP_APP_SECRET so the webhook server can verify signed Meta requests.
8. Configure ClientPad API access with CLIENTPAD_PUBLIC_API_BASE_URL and CLIENTPAD_API_KEY.
9. Add payment keys as needed: PAYSTACK_SECRET_KEY and/or FLUTTERWAVE_SECRET_KEY.
10. Run clientpad migrate.
11. Start the webhook server:
    node examples/whatsapp/server.mjs

Tip: clientpad init --whatsapp [directory] copies .env.whatsapp.example, a dependency-light Node webhook server, and starter flows.`);
}

async function whatsappFlows() {
  const flowName = args.find((arg) => whatsappFlowNames.includes(arg));
  if (!flowName) {
    throw new Error(`Usage: clientpad whatsapp:flows [${whatsappFlowNames.join("|")}] [--output <file>|--dir <directory>]`);
  }

  const flowPath = path.join(
    packageRoot,
    "templates",
    "examples",
    "whatsapp",
    "flows",
    `${flowName}.json`
  );
  const flow = await readFile(flowPath, "utf8");
  const outputFile = readAnyOption(["--output", "--out"], "");
  const outputDir = readAnyOption(["--dir", "--write"], "");

  if (outputFile && outputDir) {
    throw new Error("Use either --output <file> or --dir <directory>, not both.");
  }

  if (outputFile) {
    const destination = path.resolve(outputFile);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, flow);
    console.log(`Wrote ${flowName} WhatsApp flow to ${destination}`);
    return;
  }

  if (outputDir) {
    const destination = path.resolve(outputDir, `${flowName}.json`);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, flow);
    console.log(`Wrote ${flowName} WhatsApp flow to ${destination}`);
    return;
  }

  console.log(flow);
}

async function doctor() {
  const checks = [
    ["DATABASE_URL", Boolean(process.env.DATABASE_URL)],
    ["API_KEY_PEPPER", Boolean(process.env.API_KEY_PEPPER)],
  ];
  for (const [name, ok] of checks) {
    console.log(`${ok ? "ok" : "missing"} ${name}`);
  }

  if (process.env.DATABASE_URL) {
    const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
    await pool.query("select 1");
    await pool.end();
    console.log("ok PostgreSQL connection");
  }
}

async function main() {
  if (!command || command === "help" || command === "--help" || command === "-h") {
    console.log(helpText);
    return;
  }

  if (command === "init") return initProject();
  if (command === "migrate") return migrate();
  if (command === "doctor") return doctor();
  if (command === "api-key" && args[0] === "create") return createApiKey();
  if (command === "api-key" && args[0] === "usage") return getApiKeyUsage();
  if (command === "whatsapp:setup") return whatsappSetup();
  if (command === "whatsapp:flows") return whatsappFlows();

  throw new Error(`Unknown command: ${command}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});

function parseNullableInteger(value) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Expected positive integer but received: ${value}`);
  }
  return parsed;
}
