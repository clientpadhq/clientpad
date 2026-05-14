# ClientPad Cloud Production Plan

ClientPad Cloud is the managed gateway that monetizes hosted `CLIENTPAD_API_KEY` usage while keeping the packages free and open source.

New operator signups can bootstrap a workspace, first project, and starter API key so the hosted dashboard does not begin as a shell.

## Production Components

1. PostgreSQL
   - Apply `db/migrations` with `clientpad migrate`.
   - Use managed PostgreSQL or a dedicated PostgreSQL cluster.
   - Do not depend on hosted backend-specific SDKs.

2. Public API
   - Mount `@clientpad/server` at `/api/public/v1`.
   - Developers use this with `CLIENTPAD_API_KEY`.

3. Cloud Control Plane
   - Mount `@clientpad/cloud` at `/api/cloud/v1`.
   - Operators use it to create projects, issue hosted keys, inspect usage, and record billing events.

4. Developer Dashboard
   - Deploy `@clientpad/dashboard` as the web interface.
   - Operators use email/password sessions to log in, create projects, create keys, inspect activity, view plans, and copy quickstart code.
   - Preview mode still exists for sample data and safe exploration.
   - The first-run flow can also bootstrap a workspace bundle and return a live usage summary.

5. Billing
   - Billing provider events are stored in `cloud_billing_events`.
   - Plan limits live in `cloud_plans`.
   - Active subscription state lives in `cloud_subscriptions`.
   - API keys inherit quota from the plan at creation time.
   - Lemon Squeezy checkout can create hosted subscription sessions when `LEMON_SQUEEZY_API_KEY`, `LEMON_SQUEEZY_STORE_ID`, and `LEMON_SQUEEZY_VARIANT_IDS_JSON` are configured.

## Money Flow

Self-hosted developers:

- install packages
- run their own PostgreSQL
- create unlimited local keys
- pay nothing to ClientPad

Hosted developers:

- create a ClientPad Cloud project
- receive `CLIENTPAD_API_KEY`
- use the managed public API URL
- pay when they need higher quota, backups, logs, support, and managed uptime

## Environment

```bash
DATABASE_URL=postgresql://clientpad:clientpad@localhost:5432/clientpad
API_KEY_PEPPER=replace-with-long-random-secret
CLIENTPAD_CLOUD_ADMIN_TOKEN=replace-with-long-random-secret
LEMON_SQUEEZY_API_KEY=ls_test_...
LEMON_SQUEEZY_WEBHOOK_SECRET=whsec_...
LEMON_SQUEEZY_STORE_ID=123456
LEMON_SQUEEZY_VARIANT_IDS_JSON={"developer":"variant_123","business":"variant_456"}
```

`CLIENTPAD_CLOUD_ADMIN_TOKEN` stays on the backend control plane. It is not the dashboard login credential. The hosted dashboard uses cookie-backed operator sessions issued from `@clientpad/cloud`.

For first-time operator setup, expose the Cloud API and have the first operator register or sign in through the dashboard. The dashboard validates `/health`, `/auth/status`, `/auth/login`, `/auth/me`, and `/readiness` before it treats Live mode as connected.

Useful bootstrap and billing-aware routes:

- `/workspaces/bootstrap` creates a workspace, starter project, and starter API key in one request
- `/usage/summary` returns month-to-date requests, rejections, active keys, remaining quota, and plan metadata
- `/billing/checkout-session` creates a Lemon Squeezy checkout session for the selected workspace and plan
- `/billing/portal-session` opens the Lemon Squeezy customer portal for an existing customer
- `/billing/lemonsqueezy/webhook` syncs completed checkout and subscription events back into the cloud tables

## Initial Deploy Checklist

```bash
docker compose up -d postgres
pnpm install
clientpad migrate
npm run typecheck
npm run test:server
npm run test:cloud
npm run test:dashboard
```

Then deploy:

- `/api/public/v1/*` with `@clientpad/server`
- `/api/cloud/v1/*` with `@clientpad/cloud`
- dashboard static app with `@clientpad/dashboard`

## Default Plans

- `free`: 1,000 requests/month, 60 requests/minute
- `developer`: 100,000 requests/month, 300 requests/minute
- `business`: 1,000,000 requests/month, 1,200 requests/minute
- `enterprise`: custom/unlimited
