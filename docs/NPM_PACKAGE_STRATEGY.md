# ClientPad NPM Package Strategy

ClientPad's infrastructure starts with a CLI package developers can install globally:

```bash
pnpm install -g @clientpad/cli
```

The package name is `@clientpad/cli` because npm scoped packages require a slash. The installed binary is:

```bash
clientpad
```

## Commands

```bash
clientpad init
clientpad migrate
clientpad api-key create <workspace_id> "Development key" "leads:read,leads:write"
clientpad doctor
```

## Package Principles

- Fully open source
- No proprietary backend dependency
- PostgreSQL-first
- API-key gateway for integrations
- Usable from any app stack
- Published to GitHub and the npm registry

## Package Contents

- CLI binary: `clientpad`
- PostgreSQL migrations
- API key gateway schema
- Project initialization templates
- Migration runner
- API key creation utility

## Core Package

Shared dependency-free types and protocol utilities are published as:

```bash
pnpm add @clientpad/core
```

## Publish Flow

```bash
pnpm install
node scripts/check-deps.mjs
pnpm --filter @clientpad/core build
pnpm --filter @clientpad/cli pack
pnpm --filter @clientpad/cli publish --access public
```

Before publishing, run the full CI check locally:

```bash
npm run ci
```

This validates typecheck, tests, dependency boundaries, and examples in one command.

Create the npm organization or scope owner for `@clientpad` before first publish.

## SDK Package

Developers should install the runtime SDK inside applications:

```bash
pnpm add @clientpad/sdk
```

The SDK is HTTP-only, uses native `fetch`, and currently supports leads and clients.

## Server Package

Developers should install the server package to expose ClientPad APIs from their own apps:

```bash
pnpm add @clientpad/server
```

The server package exports a fetch-standard handler and currently supports leads and clients.

## Cloud Package

Hosted control planes should install:

```bash
pnpm add @clientpad/cloud
```

The cloud package handles managed projects, public plans, subscriptions, hosted API key issuance, usage dashboards, billing event intake, and health checks.

## Dashboard Package

The hosted developer interface ships as:

```bash
pnpm add @clientpad/dashboard
```

It provides login, overview, projects, API key creation, usage activity, billing plan views, docs quickstart, and cloud connection settings.

## Hosted Gateway Revenue

The npm packages stay open source. Paid usage happens through an optional hosted gateway:

- developers install the SDK for free
- self-hosted API keys are free
- hosted ClientPad Cloud API keys can be metered
- quotas are enforced by `@clientpad/server`
- usage is exposed through `clientpad.usage.retrieve()`

This lets developers start locally and pay only when they choose managed infrastructure.
