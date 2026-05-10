#!/usr/bin/env node
/**
 * Pack dry-run validation for publishable packages.
 *
 * Runs `npm pack --dry-run` for each release-critical package and validates:
 *   - Pack succeeds (build artifacts exist)
 *   - dist/ output is present
 *   - README.md is included
 *   - No .env, secret, or app-only files leak into the tarball
 *
 * Usage:
 *   node scripts/validate-packs.mjs
 *   node scripts/validate-packs.mjs --critical-only
 */

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const criticalOnly = process.argv.includes("--critical-only");

const RELEASE_CRITICAL = ["clientpad-core", "cli", "sdk", "server"];
const SECONDARY = criticalOnly ? [] : ["whatsapp", "cloud"];

// Files that must NEVER appear in a published tarball
const FORBIDDEN_IN_TARBALL = [
  /\.env$/,
  /\.env\.local/,
  /secret/i,
  /private/i,
  /\.pem$/,
  /tsconfig\.tsbuildinfo/,
  /node_modules/,
  /\.next\//,
  /src\/.*\.ts$/, // source TypeScript should not be in tarball (only dist)
];

// Files that MUST be present in a published tarball
const REQUIRED_IN_TARBALL = {
  "clientpad-core": ["dist/index.js", "dist/index.d.ts", "README.md"],
  cli: ["bin/clientpad.mjs", "README.md"],
  sdk: ["dist/index.js", "dist/index.d.ts", "README.md"],
  server: ["dist/index.js", "dist/index.d.ts", "README.md"],
  whatsapp: ["dist/index.js", "dist/index.d.ts", "README.md"],
  cloud: ["dist/index.js", "dist/index.d.ts", "README.md"],
};

let hasErrors = false;

async function runPackDryRun(packageName) {
  const pkgDir = path.join(root, "packages", packageName);

  // Check dist exists (except cli which uses bin/)
  if (packageName !== "cli") {
    const distDir = path.join(pkgDir, "dist");
    if (!existsSync(distDir)) {
      console.error(`  ✗ ${packageName}: dist/ directory missing — run build first`);
      hasErrors = true;
      return;
    }
  }

  return new Promise((resolve) => {
    const child = spawn("npm", ["pack", "--dry-run"], {
      cwd: pkgDir,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => (stdout += d));
    child.stderr.on("data", (d) => (stderr += d));

    child.on("exit", (code) => {
      if (code !== 0) {
        console.error(`  ✗ ${packageName}: npm pack --dry-run failed (exit ${code})`);
        if (stderr) console.error(`    ${stderr.trim().split("\n").join("\n    ")}`);
        hasErrors = true;
        resolve();
        return;
      }

      // Parse the file list from npm pack --dry-run output
      const lines = (stdout + stderr)
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);

      // npm pack --dry-run lists files like: "npm notice 471B README.md" or "package/dist/index.js"
      const packedFiles = lines
        .filter((l) => {
          // Match both new format (npm notice) and old format (package/)
          return l.startsWith("package/") || (l.startsWith("npm notice ") && l.match(/\s+\d+(\.\d+)?[kB]+\s+/));
        })
        .map((l) => {
          // Handle old format: "package/dist/index.js"
          if (l.startsWith("package/")) {
            return l.replace(/^package\//, "").trim();
          }
          // Handle new format: "npm notice 471B README.md" -> extract filename after size
          const match = l.match(/npm notice\s+[\d.]+[kB]+\s+(.+)/);
          return match ? match[1].trim() : null;
        })
        .filter(Boolean);

      // Check for forbidden files
      let packageClean = true;
      for (const file of packedFiles) {
        for (const pattern of FORBIDDEN_IN_TARBALL) {
          if (pattern.test(file)) {
            console.error(`  ✗ ${packageName}: forbidden file in tarball: "${file}"`);
            hasErrors = true;
            packageClean = false;
          }
        }
      }

      // Check required files are present
      const required = REQUIRED_IN_TARBALL[packageName] ?? [];
      for (const req of required) {
        if (!packedFiles.some((f) => f === req || f.startsWith(req))) {
          console.error(`  ✗ ${packageName}: required file missing from tarball: "${req}"`);
          hasErrors = true;
          packageClean = false;
        }
      }

      if (packageClean) {
        const fileCount = packedFiles.length;
        console.log(`  ✓ ${packageName}: pack dry-run OK (${fileCount} files)`);
      }

      resolve();
    });
  });
}

console.log("\n=== ClientPad Pack Dry-Run Validation ===\n");

console.log("Release-critical packages:");
for (const pkg of RELEASE_CRITICAL) {
  await runPackDryRun(pkg);
}

if (SECONDARY.length > 0) {
  console.log("\nSecondary packages:");
  for (const pkg of SECONDARY) {
    await runPackDryRun(pkg);
  }
}

console.log("");

if (hasErrors) {
  console.error("✗ Pack validation FAILED. Fix the errors above before publishing.\n");
  process.exit(1);
} else {
  console.log("✓ All pack validations passed.\n");
}
