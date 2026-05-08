#!/usr/bin/env node
import { createHash, randomBytes } from "node:crypto";
import { existsSync } from "node:fs";
import { copyFile, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { normalizeNigerianPhoneNumber } from "@abdulmuiz44/clientpad-core/phone";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const command = process.argv[2];
const args = process.argv.slice(3);

const helpText = `ClientPad CLI

Usage:
  clientpad init [directory]
  clientpad migrate [--migrations-dir <path>]
  clientpad api-key create <workspace_id> [name] [comma_scopes]
  clientpad api-key create --workspace-id <id> [--name <name>] [--scopes <comma_scopes>] [--billing-mode <mode>] [--monthly-request-limit <number>] [--rate-limit-per-minute <number>]
  clientpad api-key usage <api_key_id>
  clientpad whatsapp:import <file.csv> --workspace-id <id>
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

async function initProject() {
  const target = path.resolve(args[0] || ".");
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

  console.log(`ClientPad initialized in ${target}`);
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

async function importWhatsAppCsv() {
  const filePath = args[0];
  const workspaceId = readOption("--workspace-id", "");
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) throw new Error("DATABASE_URL is required.");
  if (!filePath || filePath.startsWith("--") || !workspaceId) {
    throw new Error("Usage: clientpad whatsapp:import <file.csv> --workspace-id <id>");
  }

  const csv = await readFile(path.resolve(filePath), "utf8");
  const rows = parseCsv(csv);
  if (!rows.length) throw new Error("CSV file is empty.");

  const [headerRow, ...dataRows] = rows;
  const headers = headerRow.map((header) => header.trim().toLowerCase());
  const requiredColumns = ["name", "phone"];
  const missingColumns = requiredColumns.filter((column) => !headers.includes(column));
  if (missingColumns.length) {
    throw new Error(`CSV is missing required column(s): ${missingColumns.join(", ")}`);
  }

  const pool = new pg.Pool({ connectionString });
  const seenPhones = new Set();
  const sampleInvalidRows = [];
  let importedCount = 0;
  let skippedDuplicateCount = 0;
  let invalidPhoneCount = 0;

  await pool.query("begin");
  try {
    for (const [index, values] of dataRows.entries()) {
      const record = rowToRecord(headers, values);
      const normalizedPhone = normalizeNigerianPhoneNumber(record.phone);
      const rowNumber = index + 2;

      if (!normalizedPhone) {
        invalidPhoneCount += 1;
        if (sampleInvalidRows.length < 5) {
          sampleInvalidRows.push({ row: rowNumber, phone: record.phone ?? "" });
        }
        continue;
      }

      if (seenPhones.has(normalizedPhone)) {
        skippedDuplicateCount += 1;
        continue;
      }
      seenPhones.add(normalizedPhone);

      const name = optionalCsvValue(record.name) ?? normalizedPhone;
      const lastMessage = optionalCsvValue(record.last_message);
      const lastMessageAt = parseCsvTimestamp(record.last_message_at);
      const source = optionalCsvValue(record.source) ?? "whatsapp_csv";
      const serviceInterest = optionalCsvValue(record.service_interest);
      const notes = optionalCsvValue(record.notes);

      const leadResult = await pool.query(
        `
          insert into leads (
            workspace_id,
            name,
            phone,
            source,
            service_interest,
            notes
          )
          values ($1, $2, $3, $4, $5, $6)
          on conflict (workspace_id, phone)
          do update set
            name = coalesce(nullif(excluded.name, ''), leads.name),
            source = coalesce(excluded.source, leads.source),
            service_interest = coalesce(excluded.service_interest, leads.service_interest),
            notes = coalesce(excluded.notes, leads.notes),
            updated_at = now()
          returning id
        `,
        [workspaceId, name, normalizedPhone, source, serviceInterest, notes]
      );
      const leadId = leadResult.rows[0]?.id;
      importedCount += 1;

      if (lastMessage) {
        const conversationResult = await pool.query(
          `
            insert into whatsapp_conversations (
              workspace_id,
              lead_id,
              phone,
              contact_name,
              source,
              last_message_at
            )
            values ($1, $2, $3, $4, $5, coalesce($6::timestamptz, now()))
            returning id
          `,
          [workspaceId, leadId, normalizedPhone, name, source, lastMessageAt]
        );
        const conversationId = conversationResult.rows[0]?.id;

        await pool.query(
          `
            insert into whatsapp_messages (
              workspace_id,
              conversation_id,
              lead_id,
              phone,
              direction,
              body,
              sent_at,
              raw_payload
            )
            values ($1, $2, $3, $4, 'inbound', $5, coalesce($6::timestamptz, now()), $7::jsonb)
          `,
          [
            workspaceId,
            conversationId,
            leadId,
            normalizedPhone,
            lastMessage,
            lastMessageAt,
            JSON.stringify({ csv_row: rowNumber }),
          ]
        );
      }
    }

    await pool.query("commit");
  } catch (error) {
    await pool.query("rollback");
    throw error;
  } finally {
    await pool.end();
  }

  console.log(
    JSON.stringify(
      {
        imported_count: importedCount,
        skipped_duplicate_count: skippedDuplicateCount,
        invalid_phone_count: invalidPhoneCount,
        sample_invalid_rows: sampleInvalidRows,
      },
      null,
      2
    )
  );
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
  if (command === "whatsapp:import") return importWhatsAppCsv();
  if (command === "api-key" && args[0] === "create") return createApiKey();
  if (command === "api-key" && args[0] === "usage") return getApiKeyUsage();

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


function parseCsv(csv) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const next = csv[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(field);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      field = "";
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value.trim() !== "")) rows.push(row);
  return rows;
}

function rowToRecord(headers, values) {
  const record = {};
  for (const [index, header] of headers.entries()) {
    record[header] = values[index] ?? "";
  }
  return record;
}

function optionalCsvValue(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseCsvTimestamp(value) {
  const normalized = optionalCsvValue(value);
  if (!normalized) return null;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}
