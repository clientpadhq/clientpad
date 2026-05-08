# ClientPad Server

Fetch-standard server handlers for ClientPad public APIs.

## Install

```bash
pnpm add @abdulmuiz44/clientpad-server
```

## Basic Usage

```ts
import { createClientPadHandler } from "@abdulmuiz44/clientpad-server";

export const handler = createClientPadHandler({
  databaseUrl: process.env.DATABASE_URL!,
  apiKeyPepper: process.env.API_KEY_PEPPER!,
});
```

The handler accepts a standard `Request` and returns a standard `Response`.

## Next.js Route Handler

```ts
import { createClientPadHandler } from "@abdulmuiz44/clientpad-server";

const handler = createClientPadHandler({
  databaseUrl: process.env.DATABASE_URL!,
  apiKeyPepper: process.env.API_KEY_PEPPER!,
});

export const GET = handler;
export const POST = handler;
```

Mount it under routes that forward to:

```text
/api/public/v1/leads
/api/public/v1/clients
/api/public/v1/usage
```

## Supported Routes

- `GET /leads`
- `POST /leads`
- `GET /clients`
- `POST /clients`
- `GET /usage`

The handler also accepts full public API paths such as `/api/public/v1/leads`.

## Usage Metering

The server records API key usage in PostgreSQL and enforces optional limits:

- `monthly_request_limit`
- `rate_limit_per_minute`
- `billing_mode`

Leaving limits empty keeps self-hosted deployments unlimited. Hosted ClientPad Cloud deployments can set limits on API keys and return `429` when a key exceeds quota.
