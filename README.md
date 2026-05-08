# ClientPad

ClientPad is free, open-source business infrastructure for building lead and client workflows into any application.

This repository ships installable packages instead of a hosted product with subscriptions. Developers bring their own PostgreSQL database, deploy wherever they want, and use API keys as the gateway for application and integration access.

## Packages

- `@abdulmuiz44/clientpad-core`: shared TypeScript types and dependency-free protocol utilities.
- `@abdulmuiz44/clientpad-cli`: local project setup, SQL migrations, and API key creation.
- `@abdulmuiz44/clientpad-server`: fetch-standard public API handler for leads and clients.
- `@abdulmuiz44/clientpad-sdk`: TypeScript SDK for consuming ClientPad public APIs from apps, workers, and scripts.
- `@abdulmuiz44/clientpad-cloud`: hosted control plane for projects, plans, subscriptions, usage, and API keys.

## Install

```bash
pnpm add @abdulmuiz44/clientpad-core @abdulmuiz44/clientpad-server @abdulmuiz44/clientpad-sdk
pnpm add @abdulmuiz44/clientpad-cloud
pnpm add -D @abdulmuiz44/clientpad-cli
```

For a global CLI install:

```bash
pnpm install -g @abdulmuiz44/clientpad-cli
clientpad help
```

## Quick Start

Create a config and run migrations:

```bash
clientpad init
clientpad migrate
```

Create a workspace API key:

```bash
clientpad api-key create --workspace-id <workspace-id> --name "Local app"
```

Use the SDK from an app:

```ts
import { ClientPad } from "@abdulmuiz44/clientpad-sdk";

const clientpad = new ClientPad({
  baseUrl: "https://example.com/api/public/v1",
  apiKey: process.env.CLIENTPAD_API_KEY!,
});

await clientpad.leads.create({
  name: "Ada Customer",
  phone: "+234...",
  source: "Website",
});
```

Expose the public API from any fetch-compatible server runtime:

```ts
import { createClientPadHandler } from "@abdulmuiz44/clientpad-server";

export const handler = createClientPadHandler({
  databaseUrl: process.env.DATABASE_URL!,
  apiKeyPepper: process.env.API_KEY_PEPPER!,
});
```

## Public API

The first stable API surface is versioned under `/api/public/v1`:

- `GET /leads`
- `POST /leads`
- `GET /clients`
- `POST /clients`
- `GET /usage`

API keys are sent with:

```text
Authorization: Bearer <api_key>
```

List responses return:

```ts
{ data: T[]; pagination: { limit: number; offset: number } }
```

Create responses return:

```ts
{ data: { id: string } }
```

## Monetization Model

ClientPad remains fully open source. Self-hosted API keys can be free and unlimited because developers run their own database and infrastructure.

Revenue comes from an optional hosted ClientPad Cloud gateway:

- hosted PostgreSQL and migrations
- managed public API endpoint
- API key dashboard
- monthly request quotas
- per-minute rate limits
- usage analytics and audit logs
- backups, upgrades, and support

Hosted keys use the same API key format and SDK. Usage can be inspected with:

```ts
const usage = await clientpad.usage.retrieve();
```

Self-hosted deployments can leave `monthly_request_limit` and `rate_limit_per_minute` empty for unlimited local usage.

## Development

```bash
pnpm install
npm run typecheck
npm run test:sdk
npm run test:server
npm run test:cloud
npm run build
```

`npm run build` packs all publishable packages into `dist/`.

## Documentation

- [Open-source architecture](docs/OPEN_SOURCE_ARCHITECTURE.md)
- [Public API](docs/PUBLIC_API.md)
- [ClientPad Cloud](docs/CLIENTPAD_CLOUD.md)
- [npm package strategy](docs/NPM_PACKAGE_STRATEGY.md)
- [Publishing checklist](docs/PUBLISHING.md)

## License

MIT
