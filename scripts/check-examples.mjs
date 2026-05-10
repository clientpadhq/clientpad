#!/usr/bin/env node
/**
 * Examples and docs smoke check.
 *
 * Validates that:
 *   - Referenced example files exist
 *   - Key docs files are present
 *   - WhatsApp flow JSON files are valid JSON
 *   - CLI binary entry point exists
 *
 * Usage:
 *   node scripts/check-examples.mjs
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

let hasErrors = false;

function check(filePath, label) {
  const full = path.join(root, filePath);
  if (!existsSync(full)) {
    console.error(`  ✗ Missing: ${filePath}${label ? ` (${label})` : ""}`);
    hasErrors = true;
    return false;
  }
  console.log(`  ✓ ${filePath}`);
  return true;
}

function checkJson(filePath, label) {
  const full = path.join(root, filePath);
  if (!existsSync(full)) {
    console.error(`  ✗ Missing: ${filePath}${label ? ` (${label})` : ""}`);
    hasErrors = true;
    return false;
  }
  try {
    JSON.parse(readFileSync(full, "utf8"));
    console.log(`  ✓ ${filePath} (valid JSON)`);
    return true;
  } catch (e) {
    console.error(`  ✗ Invalid JSON: ${filePath} — ${e.message}`);
    hasErrors = true;
    return false;
  }
}

console.log("\n=== ClientPad Examples & Docs Smoke Check ===\n");

console.log("Core docs:");
check("README.md", "root README");
check("Plan.md", "product plan");
check("docs/PUBLISHING.md", "publishing guide");
check("docs/NPM_PACKAGE_STRATEGY.md", "npm strategy");
check("docs/PUBLIC_API.md", "public API docs");
check("docs/OPEN_SOURCE_ARCHITECTURE.md", "architecture docs");
check("CONTRIBUTING.md", "contributing guide");
check("LICENSE", "license file");

console.log("\nPackage READMEs:");
check("packages/clientpad-core/README.md");
check("packages/cli/README.md");
check("packages/sdk/README.md");
check("packages/server/README.md");
check("packages/cloud/README.md");
check("packages/whatsapp/README.md");

console.log("\nCLI binary:");
check("packages/cli/bin/clientpad.mjs", "CLI entry point");

console.log("\nMigrations:");
check("packages/cli/migrations/0000_platform_core.sql");
check("packages/cli/migrations/0001_api_key_gateway.sql");
check("packages/cli/migrations/0002_api_key_usage_metering.sql");

console.log("\nExamples:");
check("examples/express/server.mjs");
check("examples/hono/server.ts");
check("examples/node/usage.mjs");
check("examples/whatsapp/server.mjs");
check("examples/whatsapp/README.md");

console.log("\nWhatsApp flow JSON files:");
checkJson("examples/whatsapp/flows/salon.json");
checkJson("examples/whatsapp/flows/mechanic.json");
checkJson("examples/whatsapp/flows/tailor.json");

console.log("\nDocker Compose:");
check("docker-compose.yml", "local dev PostgreSQL");

console.log("");

if (hasErrors) {
  console.error("✗ Examples smoke check FAILED. Fix the missing files above.\n");
  process.exit(1);
} else {
  console.log("✓ All examples and docs checks passed.\n");
}
