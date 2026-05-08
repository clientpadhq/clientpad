# ClientPad Cloud Production Plan

ClientPad Cloud is the managed gateway that monetizes hosted `CLIENTPAD_API_KEY` usage while keeping the packages free and open source.

## Production Components

1. PostgreSQL
   - Apply `db/migrations` with `clientpad migrate`.
   - Use managed PostgreSQL or a dedicated PostgreSQL cluster.
   - Do not depend on hosted backend-specific SDKs.

2. Public API
   - Mount `@abdulmuiz44/clientpad-server` at `/api/public/v1`.
   - Developers use this with `CLIENTPAD_API_KEY`.

3. Cloud Control Plane
   - Mount `@abdulmuiz44/clientpad-cloud` at `/api/cloud/v1`.
   - Operators use it to create projects, issue hosted keys, inspect usage, and record billing events.

4. Developer Dashboard
   - Deploy `@abdulmuiz44/clientpad-dashboard` as the web interface.
   - Developers and operators use it to log in, create projects, create keys, inspect activity, view plans, and copy quickstart code.

5. Billing
   - Billing provider events are stored in `cloud_billing_events`.
   - Plan limits live in `cloud_plans`.
   - Active subscription state lives in `cloud_subscriptions`.
   - API keys inherit quota from the plan at creation time.

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
```

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

- `/api/public/v1/*` with `@abdulmuiz44/clientpad-server`
- `/api/cloud/v1/*` with `@abdulmuiz44/clientpad-cloud`
- dashboard static app with `@abdulmuiz44/clientpad-dashboard`

## Default Plans

- `free`: 1,000 requests/month, 60 requests/minute
- `developer`: 100,000 requests/month, 300 requests/minute
- `business`: 1,000,000 requests/month, 1,200 requests/minute
- `enterprise`: custom/unlimited
