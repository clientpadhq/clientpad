# ClientPad Cloud

Hosted control plane for ClientPad projects, plans, subscriptions, API keys, usage, operator auth/session management, and operational health.

In production, this service should live at `api.clientpad.xyz/api/cloud/v1`, while the dashboard lives at `app.clientpad.xyz`.

```bash
pnpm add @clientpad/cloud
```

```ts
import { createClientPadCloudHandler } from "@clientpad/cloud";

export const handler = createClientPadCloudHandler({
  databaseUrl: process.env.DATABASE_URL!,
  apiKeyPepper: process.env.API_KEY_PEPPER!,
  adminToken: process.env.CLIENTPAD_CLOUD_ADMIN_TOKEN!,
  lemonSqueezyApiKey: process.env.LEMON_SQUEEZY_API_KEY,
  lemonSqueezyWebhookSecret: process.env.LEMON_SQUEEZY_WEBHOOK_SECRET,
  lemonSqueezyStoreId: process.env.LEMON_SQUEEZY_STORE_ID,
  lemonSqueezyVariantIds: JSON.parse(process.env.LEMON_SQUEEZY_VARIANT_IDS_JSON ?? "{}"),
  lemonSqueezyBillingUrl: process.env.LEMON_SQUEEZY_BILLING_URL,
});
```

The cloud handler is for your hosted ClientPad Cloud control plane. It is separate from the public API handler in `@clientpad/server`.

This handler is an operator surface, not an end-user login flow. The dashboard should connect to it only in live/operator mode using a Cloud API URL plus an authenticated operator session. The raw `CLIENTPAD_CLOUD_ADMIN_TOKEN` is a backend secret, not the browser login UX.

New operator signups create the operator account, workspace, starter project, and starter API key together so hosted deployments can become usable immediately. Existing operators can also bootstrap another workspace bundle through `/workspaces/bootstrap`.

## Routes

- `GET /health`
- `GET /openapi.json`
- `GET /plans`
- `GET /auth/status`
- `POST /auth/login`
- `POST /auth/register`
- `GET /auth/me`
- `POST /auth/logout`
- `GET /workspaces`
- `POST /workspaces`
- `POST /workspaces/bootstrap`
- `POST /projects`
- `GET /projects`
- `POST /api-keys`
- `GET /usage`
- `GET /usage/summary`
- `POST /billing/events`
- `POST /billing/checkout-session`
- `POST /billing/portal-session`
- `POST /billing/lemonsqueezy/webhook`

Public routes used by the dashboard bootstrap flow:

- `/health`
- `/openapi.json`
- `/plans`
- `/auth/status`
- `/auth/login`
- `/auth/register`

All other operator routes require either a valid operator session cookie or the backend `CLIENTPAD_CLOUD_ADMIN_TOKEN`:

```text
Authorization: Bearer <CLIENTPAD_CLOUD_ADMIN_TOKEN>
```

Use `/health` for dashboard connectivity checks and `/openapi.json` for operator or docs tooling. Public developers should work through the public API key gateway exposed by `@clientpad/server` and `@clientpad/sdk`.

Use `/auth/status` to determine whether this deployment still needs its first operator account. Use `/auth/login` and `/auth/register` for live dashboard sign-in. The Cloud API issues a cookie-backed session that the dashboard restores on refresh.

Use `/readiness` from the dashboard live bootstrap flow to inspect operator-safe cloud state. It returns:

- workspace and project counts
- public API key availability
- WhatsApp configuration status
- recent webhook activity
- payment provider activity

`/readiness` does not expose secrets or raw configuration values. In live mode it requires a valid operator session or the backend control-plane token.

Use `/usage/summary` when you need billing-ready workspace totals:

- current month request count
- rejected requests
- active API key count
- remaining request quota
- plan and rate-limit metadata

Use `/billing/checkout-session` to create a Lemon Squeezy checkout session for the selected workspace and plan. Use `/billing/portal-session` to open the Lemon Squeezy customer portal for an existing customer. Use `/billing/lemonsqueezy/webhook` to keep subscriptions and billing events synchronized after checkout.
