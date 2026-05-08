# ClientPad

ClientPad is free, open-source business infrastructure for building lead and client workflows into any application.

This repository now ships installable packages instead of a hosted product with subscriptions. Developers bring their own PostgreSQL database, deploy wherever they want, and use API keys as the gateway for application and integration access.

## Packages

- `@abdulmuiz44/clientpad-core`: shared TypeScript types and dependency-free protocol utilities.
- `@clientpad/cli`: local project setup, SQL migrations, and API key creation.
- `@clientpad/server`: fetch-standard public API handler for leads and clients.
- `@clientpad/sdk`: TypeScript SDK for consuming ClientPad public APIs from apps, workers, and scripts.

## Install

```bash
pnpm add @abdulmuiz44/clientpad-core @clientpad/server @clientpad/sdk
pnpm add -D @clientpad/cli
```

For a global CLI install:

```bash
pnpm install -g @clientpad/cli
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
import { ClientPad } from "@clientpad/sdk";

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
import { createClientPadHandler } from "@clientpad/server";

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

## Development

```bash
pnpm install
npm run typecheck
npm run test:sdk
npm run test:server
npm run build
```

`npm run build` packs all publishable packages into `dist/`.

## Documentation

- [Open-source architecture](docs/OPEN_SOURCE_ARCHITECTURE.md)
- [Public API](docs/PUBLIC_API.md)
- [npm package strategy](docs/NPM_PACKAGE_STRATEGY.md)
- [Publishing checklist](docs/PUBLISHING.md)

## License

MIT
