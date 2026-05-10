# Publishing ClientPad

> [!NOTE]
> **Migration Note:** The canonical npm scope for ClientPad packages has been moved from `@abdulmuiz44/*` to `@clientpadhq/*`.

ClientPad's npm packages are published under the `@clientpadhq` scope.

## Release-Critical Packages (0.1.0)

These packages are enforced in CI and must pass all checks before any release:

| Package | Role |
|---|---|
| `@clientpad/core` | Shared types, zero runtime deps |
| `@clientpad/cli` | Local setup, migrations, API key creation |
| `@clientpad/sdk` | TypeScript SDK for consuming the public API |
| `@clientpad/server` | Fetch-standard public API handler |

## Secondary / Experimental Packages

These packages are validated in CI but are not hard-blocked on the 0.1.0 release path:

| Package | Status |
|---|---|
| `@clientpad/whatsapp` | Validated in CI, secondary for 0.1.0 |
| `@clientpad/cloud` | Validated in CI, secondary for 0.1.0 |
| `@clientpad/dashboard` | Build-validated, secondary for 0.1.0 |

## CI Safety Model

Every push and pull request to `main` runs the following checks automatically:

1. **Typecheck** — all packages typecheck clean
2. **Tests** — sdk, server, whatsapp, cloud tests pass
3. **Dependency boundaries** — no forbidden deps (supabase, next, react in core packages)
4. **Pack dry-run** — release-critical packages pack cleanly with correct file contents
5. **Examples smoke check** — referenced files and docs exist

## Pre-Publish Checklist

Before publishing any package, verify CI is green on `main`, then run locally:

```bash
# 1. Install dependencies
pnpm install

# 2. Run the full CI check locally
npm run ci

# 3. Build all packages
pnpm --filter @clientpad/core build
pnpm --filter @clientpad/sdk build
pnpm --filter @clientpad/whatsapp build
pnpm --filter @clientpad/server build
pnpm --filter @clientpad/cloud build

# 4. Validate dependency boundaries
node scripts/check-deps.mjs

# 5. Validate pack dry-runs
node scripts/validate-packs.mjs

# 6. Inspect tarball contents manually
npm pack --workspace @clientpad/core --dry-run
npm pack --workspace @clientpad/cli --dry-run
npm pack --workspace @clientpad/sdk --dry-run
npm pack --workspace @clientpad/server --dry-run
```

Also confirm no hosted backend or app-framework dependencies leaked in:

```bash
# PowerShell
Select-String -Path package.json,packages/*/package.json -Pattern "supabase|@supabase|next@"

# bash
grep -r "supabase\|next@" package.json packages/*/package.json
```

## Publish

```bash
pnpm --filter @clientpad/core publish --access public
pnpm --filter @clientpad/cli publish --access public
pnpm --filter @clientpad/sdk publish --access public
pnpm --filter @clientpad/server publish --access public
```

Secondary packages (when ready):

```bash
pnpm --filter @clientpad/whatsapp publish --access public
pnpm --filter @clientpad/cloud publish --access public
pnpm --filter @clientpad/dashboard publish --access public
```

## GitHub Release

Tag releases with the package version:

```bash
git tag v0.1.0
git push origin v0.1.0
```

Attach release notes describing CLI commands, migrations, and any breaking schema changes.

## Local Developer Parity

Maintainers can mirror CI locally with these commands:

| Command | What it does |
|---|---|
| `npm run typecheck` | Typecheck all packages |
| `npm run test:sdk` | Build + test SDK |
| `npm run test:server` | Build + test server |
| `npm run test:cloud` | Build + test cloud |
| `npm run test:whatsapp` | Build + test whatsapp |
| `npm run check:deps` | Dependency boundary scan |
| `npm run check:examples` | Examples and docs smoke check |
| `npm run check:packs` | Pack dry-run for release-critical packages |
| `npm run ci` | Full CI-equivalent local check |
| `npm run verify` | Extended verify including all secondary packages |
