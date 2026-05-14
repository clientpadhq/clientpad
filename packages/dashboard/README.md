# ClientPad Dashboard

Installable developer and operations web interface for ClientPad Cloud. The dashboard now includes PWA support, WhatsApp onboarding, a service pipeline, phone/name client search, team inbox, revenue reporting, usage, billing, docs, and settings.

The dashboard has two entry modes:

- **Preview mode** uses sample data so operators can explore the UI without connecting a live Cloud API.
- **Live mode** connects to a real ClientPad Cloud endpoint after an operator signs in with email and password. The session is cookie-backed and restored on refresh.

On first run, the dashboard highlights the activation steps for:

1. Connecting the Cloud API
2. Creating or selecting a workspace
3. Bootstrapping the first project and starter API key
4. Connecting WhatsApp
5. Getting the first live lead or conversation

```bash
pnpm add @clientpad/dashboard
```

## Local development

From the repository root:

```bash
pnpm install
pnpm --filter @clientpad/dashboard dev
```

Open the Vite URL, usually `http://localhost:5173`. Use **Preview dashboard** for sample data, or connect to a local/deployed ClientPad Cloud API such as:

```text
http://localhost:3000/api/cloud/v1
```

The dashboard expects the Cloud API health endpoint at `/health` and the operator readiness endpoint at `/readiness`. Both are used to validate live mode before the dashboard claims it is connected.

Live mode uses an operator account, not a raw token prompt. The dashboard does not treat an entered URL as "connected" until the operator signs in and both the health check and readiness check pass.

Preview mode does not require the Cloud API URL or operator credentials. Live mode should only be used by operators who manage the ClientPad Cloud control plane.

### Live bootstrap flow

1. Enter the Cloud API base URL, for example `https://host.com/api/cloud/v1`.
2. Sign in with operator email and password, or create the first operator account if this Cloud deployment has none yet.
3. The dashboard checks `/health`, `/readiness`, and `/auth/me`.
4. If the connection is valid, the dashboard stores the validated session locally and shows readiness state for the selected workspace.
5. Use the activation panel to bootstrap a workspace bundle or use `/workspaces/bootstrap` from the Cloud API directly.
6. Usage summaries expose month-to-date requests, rejections, active keys, and remaining quota for billing-ready tracking.

### Readiness signals

The live dashboard surfaces operator-safe state for:

- cloud health
- operator session acceptance
- workspace selection
- project count
- public API key availability
- WhatsApp configuration
- recent webhook traffic
- payment provider activity

Useful checks:

```bash
pnpm --filter @clientpad/dashboard typecheck
pnpm --filter @clientpad/dashboard build
pnpm --filter @clientpad/dashboard preview
```

## Self-hosted deployment

1. Build the static app:

   ```bash
   pnpm --filter @clientpad/dashboard build
   ```

2. Serve `packages/dashboard/dist` from any static host, CDN, or container web server.
3. Mount `@clientpad/cloud` behind HTTPS at `/api/cloud/v1` or another public URL.
4. Set `CLIENTPAD_CLOUD_ADMIN_TOKEN` in the Cloud API environment as a backend control-plane secret. Do not paste it into the dashboard login screen.
5. Operators sign in with email/password and the Cloud API returns a cookie-backed session.
6. Add a workspace public API key in the dashboard to unlock live inbox and pipeline data.
7. Configure your reverse proxy for SPA fallback so unknown dashboard paths return `index.html`.
8. Keep `/manifest.webmanifest`, `/sw.js`, and `/offline.html` cacheable so Android users can install the app and load the offline shell.
9. For WhatsApp webhooks, point Meta to the generated dashboard webhook URL shown on **Connect WhatsApp** and use the same verify token in your backend webhook handler.

### Operational states

- **Preview mode** means the dashboard is showing simulated data.
- **Live mode** means the dashboard is connected to a real Cloud API through an authenticated operator session.
- **Public API key missing** means inbox and pipeline screens will stay in setup mode.
- **WhatsApp not connected** means the dashboard can show setup steps, but live conversations will not appear until Meta webhooks are configured.
- **Readiness degraded** means the Cloud API is reachable, but at least one live dependency still needs attention before the workspace is operational.
- **Usage summary** means the dashboard can already surface billing-ready request totals and quota headroom.
- **Upgrade plan** launches Stripe Checkout when the Cloud API has Stripe price IDs configured.

## Screens

- Login and installable PWA shell
- Overview
- Connect WhatsApp
- Live Pipeline: New Lead, Quoted, Booked, In Progress, Completed, Paid, Review Requested
- Client search optimized for phone/name lookup
- Team Inbox with conversations, timeline, assignment/mentions, and quick replies
- Revenue dashboard with Paystack/Flutterwave status
- Usage activity
- Usage & Billing
- Projects
- API keys
- Docs quickstart
- Settings
