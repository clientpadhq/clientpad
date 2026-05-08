# ClientPad Public API

ClientPad exposes versioned workspace APIs for developers and integrations.

## Authentication

Send a workspace API key as a bearer token:

```http
Authorization: Bearer cp_live_<public_prefix>_<secret>
```

API keys are workspace-scoped and permissioned with scopes. Raw keys are shown only once when created.

## TypeScript SDK

Install the SDK in application code:

```bash
pnpm add @abdulmuiz44/clientpad-sdk
```

```ts
import { ClientPad } from "@abdulmuiz44/clientpad-sdk";

const clientpad = new ClientPad({
  baseUrl: "https://example.com/api/public/v1",
  apiKey: process.env.CLIENTPAD_API_KEY!,
});
```

## Server Handler

Expose the public API from your own app with `@abdulmuiz44/clientpad-server`:

```bash
pnpm add @abdulmuiz44/clientpad-server
```

```ts
import { createClientPadHandler } from "@abdulmuiz44/clientpad-server";

export const handler = createClientPadHandler({
  databaseUrl: process.env.DATABASE_URL!,
  apiKeyPepper: process.env.API_KEY_PEPPER!,
});
```

The handler accepts standard `Request` objects and returns standard `Response` objects. It supports both short paths such as `/leads` and full paths such as `/api/public/v1/leads`.

## Usage and Quotas

Hosted ClientPad Cloud keys can be metered. Self-hosted keys can be unlimited by leaving quota columns empty.

```ts
const usage = await clientpad.usage.retrieve();
```

The endpoint returns the current API key's month-to-date usage:

```http
GET /api/public/v1/usage
Authorization: Bearer <api_key>
```

Required scope: `usage:read`

```json
{
  "data": {
    "api_key_id": "api_key_id",
    "workspace_id": "workspace_id",
    "billing_mode": "cloud_free",
    "month": "2026-05-01",
    "request_count": 12,
    "rejected_count": 1,
    "monthly_request_limit": 1000,
    "remaining_requests": 988,
    "rate_limit_per_minute": 60
  }
}
```

When a hosted key exceeds quota or rate limits, the API returns `429`.

## Local Platform Setup

Run PostgreSQL, set environment variables, then apply neutral migrations:

```bash
DATABASE_URL=postgresql://clientpad:clientpad@localhost:5432/clientpad
API_KEY_PEPPER=replace-with-a-long-random-secret
npm run db:migrate
```

Create a development API key for an existing workspace:

```bash
npm run api-key:create -- <workspace_id> "Local dev key" "leads:read,leads:write"
```

## Leads

### List Leads

```http
GET /api/public/v1/leads?limit=50&offset=0&status=new
Authorization: Bearer <api_key>
```

Required scope: `leads:read`

Response:

```json
{
  "data": [
    {
      "id": "uuid",
      "workspace_id": "uuid",
      "name": "Ada Customer",
      "phone": "+234...",
      "source": "WhatsApp",
      "service_interest": "Solar installation",
      "status": "new",
      "owner_user_id": null,
      "next_follow_up_at": null,
      "urgency": null,
      "budget_clue": null,
      "notes": null,
      "created_at": "2026-05-07T00:00:00.000Z",
      "updated_at": "2026-05-07T00:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}
```

## Clients

### List Clients

```http
GET /api/public/v1/clients?limit=50&offset=0&q=ada
Authorization: Bearer <api_key>
```

Required scope: `clients:read`

### Create Client

```http
POST /api/public/v1/clients
Authorization: Bearer <api_key>
Content-Type: application/json
```

Required scope: `clients:write`

Request:

```json
{
  "business_name": "Ada Ventures",
  "primary_contact": "Ada Customer",
  "phone": "+234...",
  "email": "ada@example.com",
  "location": "Lagos",
  "notes": "Prefers WhatsApp updates"
}
```

## OpenAPI

The machine-readable API contract is available at:

```http
GET /api/public/openapi
```

### Upsert Lead

```http
POST /api/public/v1/leads/upsert
Authorization: Bearer <api_key>
Content-Type: application/json
```

Required scope: `leads:write`

Upserts a lead by normalized Nigerian `phone` inside the API key workspace.

Request:

```json
{
  "name": "Ada Customer",
  "phone": "08031234567",
  "source": "WhatsApp",
  "service_interest": "Solar installation",
  "status": "new",
  "notes": "Requested quote for inverter setup"
}
```

Response:

```json
{
  "data": {
    "id": "uuid"
  }
}
```

### Create Lead

```http
POST /api/public/v1/leads
Authorization: Bearer <api_key>
Content-Type: application/json
```

Required scope: `leads:write`

Request:

```json
{
  "name": "Ada Customer",
  "phone": "+234...",
  "source": "WhatsApp",
  "service_interest": "Solar installation",
  "status": "new",
  "notes": "Requested quote for inverter setup"
}
```

Response:

```json
{
  "data": {
    "id": "uuid"
  }
}
```
