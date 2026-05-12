# ClientPad Public API

ClientPad exposes a versioned REST API for developers and integrations. All endpoints are scoped to a workspace and authenticated with API keys.

## Authentication

Send a workspace API key as a bearer token:

```http
Authorization: Bearer cp_live_<public_prefix>_<secret>
```

API keys are workspace-scoped and permissioned. Raw keys are shown only once when created.

## Endpoints

### Leads

- `GET /api/public/v1/leads` — List leads with pagination
- `POST /api/public/v1/leads` — Create a lead

### Clients

- `GET /api/public/v1/clients` — List clients with pagination
- `POST /api/public/v1/clients` — Create a client

### Usage

- `GET /api/public/v1/usage` — Retrieve API key usage stats

All list responses return `{ data: T[], pagination: { limit, offset } }`. Create responses return `{ data: { id: string } }`.

## TypeScript SDK

```bash
pnpm add @clientpad/sdk
```

```ts
import { ClientPad } from "@clientpad/sdk";

const clientpad = new ClientPad({
  baseUrl: "https://example.com/api/public/v1",
  apiKey: process.env.CLIENTPAD_API_KEY!,
});

// List leads
const { data: leads, pagination } = await clientpad.leads.list({ limit: 20 });

// Create a lead
const { data: { id } } = await clientpad.leads.create({
  name: "Ada Customer",
  phone: "+234...",
  source: "Website",
});

// Check usage
const usage = await clientpad.usage.retrieve();
```

## Rate Limits

Rate limits are configured per API key. Self-hosted deployments can leave limits empty for unlimited local usage. ClientPad Cloud keys have plan-based quotas.

[← Back to ClientPad](/)
