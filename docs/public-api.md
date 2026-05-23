# ClientPad Public API

ClientPad exposes a versioned REST API for developers and integrations. Endpoints are scoped to a workspace and authenticated with API keys.

## Authentication

Send a workspace API key as a bearer token:

```http
Authorization: Bearer cp_live_<public_prefix>_<secret>
```

API keys are shown only once when created. Store them in server-side environment variables.

## Base URL

Hosted Cloud:

```text
https://api.clientpad.xyz/api/public/v1
```

Self-hosted deployments should point the SDK at their own `/api/public/v1` route.

## Endpoints

### Leads

- `GET /leads` lists leads with pagination.
- `POST /leads` creates a lead.

### Clients

- `GET /clients` lists clients with pagination.
- `POST /clients` creates a client.

### Usage

- `GET /usage` returns API key usage stats.

List responses return `{ data: T[], pagination: { limit, offset } }`. Create responses return `{ data: { id: string } }`.

## TypeScript SDK

```bash
pnpm add @clientpad/sdk
```

```ts
import { ClientPad } from "@clientpad/sdk";

const clientpad = new ClientPad({
  baseUrl: "https://api.clientpad.xyz/api/public/v1",
  apiKey: process.env.CLIENTPAD_API_KEY!,
});

const { data: leads } = await clientpad.leads.list({ limit: 20 });

const { data: created } = await clientpad.leads.create({
  name: "Ada Customer",
  phone: "+234...",
  source: "Website",
});

const usage = await clientpad.usage.retrieve();
```

## Rate limits

Self-hosted deployments can leave limits empty for unlimited local usage. Hosted Cloud keys use workspace quota and rate-limit settings backed by usage tracking.

[Back to ClientPad](/)
