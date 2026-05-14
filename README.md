# ClientPad

ClientPad is free, open-source business infrastructure for building lead and client workflows into any application.

This repository ships installable packages instead of a hosted product with subscriptions. Developers bring their own PostgreSQL database, deploy wherever they want, and use API keys as the gateway for application and integration access.

## Packages

- `@clientpad/core`: shared TypeScript types and dependency-free protocol utilities.
- `@clientpad/cli`: local project setup, SQL migrations, and API key creation.
- `@clientpad/server`: fetch-standard public API handler for leads and clients.
- `@clientpad/sdk`: TypeScript SDK for consuming ClientPad public APIs from apps, workers, and scripts.
- `@clientpad/whatsapp`: WhatsApp automation, lead capture, booking flows, payments, and review prompts for service businesses.
- `@clientpad/cloud`: hosted control plane for projects, plans, subscriptions, usage, API keys, and operator auth/session management.
- `@clientpad/dashboard`: developer web dashboard for projects, API keys, usage, billing, docs, preview/live operator access, and WhatsApp operations.

The dashboard opens in **Preview** mode for sample data or **Live** mode after an operator signs in to ClientPad Cloud with email and password. Live mode validates both `/health` and `/readiness` before it claims the cloud is connected. New operator signups create an operator account, workspace, starter project, and starter API key in one pass so the hosted dashboard can move from empty to usable quickly.

## Install

```bash
pnpm add @clientpad/core @clientpad/server @clientpad/sdk
pnpm add @clientpad/cloud @clientpad/dashboard
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

## WhatsApp Magic for Nigerian Service Businesses

Go from WhatsApp chaos to organized leads, bookings, payments, and reviews in under 10 minutes.

ClientPad stays open and self-hostable: the WhatsApp package plugs into the same PostgreSQL-backed server, migrations, API keys, SDK, and optional ClientPad Cloud gateway already described above. Use it to turn everyday WhatsApp conversations into structured CRM activity without giving up local deployment control.

### Quick start

```bash
clientpad init --whatsapp
clientpad migrate
clientpad whatsapp:setup
clientpad whatsapp:flows salon
```

### Webhook server

Wire the WhatsApp webhook into any fetch-compatible runtime alongside the public ClientPad API:

```ts
import { createClientPadHandler } from "@clientpad/server";
import { createWhatsAppWebhookHandler } from "@clientpad/whatsapp";

const clientpad = createClientPadHandler({
  databaseUrl: process.env.DATABASE_URL!,
  apiKeyPepper: process.env.API_KEY_PEPPER!,
});

export const whatsappWebhook = createWhatsAppWebhookHandler({
  databaseUrl: process.env.DATABASE_URL!,
  verifyToken: process.env.WHATSAPP_VERIFY_TOKEN!,
  appSecret: process.env.WHATSAPP_APP_SECRET!,
  accessToken: process.env.WHATSAPP_ACCESS_TOKEN!,
  defaultWorkspaceId: process.env.CLIENTPAD_WORKSPACE_ID!,
  clientpad,
});
```

If you prefer server-integrated routing, mount the same WhatsApp config next to your existing `createClientPadHandler` route and point Meta's webhook URL at that endpoint.

### Demo GIFs

- `docs/assets/demo-whatsapp-salon.gif`: salon owner connects WhatsApp, receives a booking, sends a Paystack link, and watches the pipeline update to paid.
- `docs/assets/demo-whatsapp-mechanic.gif`: customer sends a car issue, shares location, owner sends a quote, and the job moves to in progress.
- `docs/assets/demo-dashboard-pipeline.gif`: mobile PWA pipeline updating live from WhatsApp button clicks.

### WhatsApp documentation

- [WhatsApp Magic guide](docs/WHATSAPP_MAGIC.md)
- [WhatsApp CSV import](docs/WHATSAPP_CSV_IMPORT.md)
- [WhatsApp payments in Nigeria](docs/WHATSAPP_PAYMENTS_NIGERIA.md)
- [WhatsApp examples](examples/whatsapp/README.md)

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
- operator readiness and health validation
- API key dashboard
- monthly request quotas
- per-minute rate limits
- usage analytics and audit logs
- backups, upgrades, and support
- Lemon Squeezy Checkout and customer portal for hosted subscriptions

Hosted dashboard access is separate from the public API key flow:

- operators sign in to the Cloud dashboard with email and password
- the Cloud API issues a cookie-backed operator session
- the dashboard restores that session on refresh
- the raw `CLIENTPAD_CLOUD_ADMIN_TOKEN` stays on the backend as an operator/control-plane secret, not a browser login credential
- new signups bootstrap a workspace, starter project, and starter API key so usage tracking starts immediately

Hosted keys use the same API key format and SDK. Usage can be inspected with:

```ts
const usage = await clientpad.usage.retrieve();
```

Cloud usage summaries also surface month-to-date request totals, rejections, active API keys, and remaining quota so billing can be built on top of actual usage instead of guesswork.

Hosted billing uses Lemon Squeezy checkout for subscriptions when `@clientpad/cloud` is configured with a Lemon Squeezy API key, store ID, webhook secret, and plan variant IDs.

Self-hosted deployments can leave `monthly_request_limit` and `rate_limit_per_minute` empty for unlimited local usage.

## Development

```bash
pnpm install
npm run typecheck
npm run test:sdk
npm run test:server
npm run test:cloud
npm run test:dashboard
npm run build
```

`npm run build` packs all publishable packages into `dist/`.

### CI parity

Run the same checks CI runs, locally:

```bash
# Full CI-equivalent check (typecheck + tests + dep boundaries + examples)
npm run ci

# Extended verify (includes secondary packages)
npm run verify

# Individual checks
npm run check:deps       # dependency boundary scan
npm run check:examples   # docs and examples smoke check
npm run check:packs      # pack dry-run for release-critical packages
```

### Release-critical packages

The following packages are enforced in CI and must pass all checks before publishing:

- `@clientpad/core`
- `@clientpad/cli`
- `@clientpad/sdk`
- `@clientpad/server`

Secondary packages (`whatsapp`, `cloud`, `dashboard`) are validated in CI but are not hard-blocked on the 0.1.0 release path.

See [docs/PUBLISHING.md](docs/PUBLISHING.md) for the full release safety workflow.

## Documentation

- [Open-source architecture](docs/OPEN_SOURCE_ARCHITECTURE.md)
- [Public API](docs/PUBLIC_API.md)
- [ClientPad Cloud](docs/CLIENTPAD_CLOUD.md)
- [npm package strategy](docs/NPM_PACKAGE_STRATEGY.md)
- [Publishing checklist](docs/PUBLISHING.md)

## License

MIT
