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
pnpm add @abdulmuiz44/clientpad-core
```

## Publish Flow

```bash
pnpm install
pnpm --filter @clientpad/cli pack
pnpm --filter @clientpad/cli publish --access public
```

Before publishing, create the npm organization or scope owner for `@clientpad`.

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
