#!/usr/bin/env node
/**
 * Dependency boundary guardrail for publishable packages.
 *
 * Verifies that release-critical packages do not accidentally depend on:
 *   - Hosted cloud internals (supabase, @supabase, next@)
 *   - App-framework-only code (next, nuxt, remix)
 *   - Heavy forbidden dependencies that violate a package's intended role
 *
 * Usage:
 *   node scripts/check-deps.mjs
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

// Packages to enforce strict boundary checks on
const RELEASE_CRITICAL = ["@clientpad/core", "cli", "sdk", "server"];

// Secondary packages — validated but not hard-blocked on CI
const SECONDARY = ["whatsapp", "cloud", "dashboard"];

// Forbidden dependency patterns for ALL publishable packages
const FORBIDDEN_ALL = [
  { pattern: /^supabase$|^@supabase\//, reason: "hosted Supabase dependency not allowed in publishable packages" },
  { pattern: /^next$/, reason: "Next.js framework dependency not allowed in publishable packages" },
  { pattern: /^nuxt$/, reason: "Nuxt framework dependency not allowed in publishable packages" },
  { pattern: /^remix$|^@remix-run\//, reason: "Remix framework dependency not allowed in publishable packages" },
];

// Extra forbidden patterns for release-critical packages only
const FORBIDDEN_CRITICAL = [
  { pattern: /^react$|^react-dom$|^@types\/react/, reason: "React not allowed in release-critical infrastructure packages" },
  { pattern: /^vite$|^@vitejs\//, reason: "Vite not allowed in release-critical infrastructure packages" },
  { pattern: /^express$/, reason: "Express not allowed in release-critical infrastructure packages (use fetch-standard)" },
];

// Allowed dependencies for specific packages (exceptions)
const ALLOWED_EXCEPTIONS = {
  dashboard: [/^react$/, /^react-dom$/, /^@types\/react/, /^vite$/, /^@vitejs\//],
};

let hasErrors = false;
let hasWarnings = false;

async function checkPackage(packageName, isCritical) {
  const pkgPath = path.join(root, "packages", packageName, "package.json");
  let pkg;
  try {
    pkg = JSON.parse(await readFile(pkgPath, "utf8"));
  } catch {
    console.error(`  ✗ Could not read ${pkgPath}`);
    hasErrors = true;
    return;
  }

  const allDeps = {
    ...pkg.dependencies,
    ...pkg.devDependencies,
    ...pkg.peerDependencies,
  };

  const depNames = Object.keys(allDeps);
  const exceptions = ALLOWED_EXCEPTIONS[packageName] ?? [];
  const label = isCritical ? "[CRITICAL]" : "[secondary]";
  let packageClean = true;

  for (const dep of depNames) {
    // Skip workspace deps
    if (dep.startsWith("@clientpadhq/")) continue;

    // Check if this dep is in the allowed exceptions for this package
    const isException = exceptions.some((rx) => rx.test(dep));
    if (isException) continue;

    // Check forbidden-all patterns
    for (const { pattern, reason } of FORBIDDEN_ALL) {
      if (pattern.test(dep)) {
        console.error(`  ✗ ${label} ${packageName}: forbidden dep "${dep}" — ${reason}`);
        hasErrors = true;
        packageClean = false;
      }
    }

    // Check forbidden-critical patterns (only for critical packages)
    if (isCritical) {
      for (const { pattern, reason } of FORBIDDEN_CRITICAL) {
        if (pattern.test(dep)) {
          console.error(`  ✗ ${label} ${packageName}: forbidden dep "${dep}" — ${reason}`);
          hasErrors = true;
          packageClean = false;
        }
      }
    }
  }

  // Validate package.json basics
  if (!pkg.name) {
    console.error(`  ✗ ${label} ${packageName}: missing "name" in package.json`);
    hasErrors = true;
    packageClean = false;
  }
  if (!pkg.version) {
    console.error(`  ✗ ${label} ${packageName}: missing "version" in package.json`);
    hasErrors = true;
    packageClean = false;
  }
  if (!pkg.license) {
    console.warn(`  ⚠ ${label} ${packageName}: missing "license" in package.json`);
    hasWarnings = true;
  }
  if (!pkg.files || pkg.files.length === 0) {
    console.warn(`  ⚠ ${label} ${packageName}: no "files" field — tarball may include unexpected files`);
    hasWarnings = true;
  }

  // Validate README exists
  const { existsSync } = await import("node:fs");
  const readmePath = path.join(root, "packages", packageName, "README.md");
  if (!existsSync(readmePath)) {
    if (isCritical) {
      console.error(`  ✗ ${label} ${packageName}: missing README.md`);
      hasErrors = true;
      packageClean = false;
    } else {
      console.warn(`  ⚠ ${label} ${packageName}: missing README.md`);
      hasWarnings = true;
    }
  }

  if (packageClean) {
    console.log(`  ✓ ${label} ${packageName}: dependency boundaries OK`);
  }
}

console.log("\n=== ClientPad Dependency Boundary Check ===\n");

console.log("Release-critical packages:");
for (const pkg of RELEASE_CRITICAL) {
  await checkPackage(pkg, true);
}

console.log("\nSecondary/experimental packages:");
for (const pkg of SECONDARY) {
  await checkPackage(pkg, false);
}

console.log("");

if (hasErrors) {
  console.error("✗ Dependency boundary check FAILED. Fix the errors above before publishing.\n");
  process.exit(1);
} else if (hasWarnings) {
  console.warn("⚠ Dependency boundary check passed with warnings.\n");
} else {
  console.log("✓ All dependency boundaries are clean.\n");
}
