# ClientPad Dashboard

Installable developer and operations web interface for ClientPad Cloud. The dashboard now includes PWA support, WhatsApp onboarding, a service pipeline, phone/name client search, team inbox, revenue reporting, usage, billing, docs, and settings.

```bash
pnpm add @abdulmuiz44/clientpad-dashboard
```

## Local development

From the repository root:

```bash
pnpm install
pnpm --filter @abdulmuiz44/clientpad-dashboard dev
```

Open the Vite URL, usually `http://localhost:5173`. Use **Preview dashboard** for sample data, or connect to a local/deployed ClientPad Cloud API such as:

```text
http://localhost:3000/api/cloud/v1
```

The dashboard expects the Cloud API health endpoint at `/health` and uses `CLIENTPAD_CLOUD_ADMIN_TOKEN` as the operator login token.

Useful checks:

```bash
pnpm --filter @abdulmuiz44/clientpad-dashboard typecheck
pnpm --filter @abdulmuiz44/clientpad-dashboard build
pnpm --filter @abdulmuiz44/clientpad-dashboard preview
```

## Self-hosted deployment

1. Build the static app:

   ```bash
   pnpm --filter @abdulmuiz44/clientpad-dashboard build
   ```

2. Serve `packages/dashboard/dist` from any static host, CDN, or container web server.
3. Mount `@abdulmuiz44/clientpad-cloud` behind HTTPS at `/api/cloud/v1` or another public URL.
4. Set `CLIENTPAD_CLOUD_ADMIN_TOKEN` in the Cloud API environment and share it only with operators.
5. Configure your reverse proxy for SPA fallback so unknown dashboard paths return `index.html`.
6. Keep `/manifest.webmanifest`, `/sw.js`, and `/offline.html` cacheable so Android users can install the app and load the offline shell.
7. For WhatsApp webhooks, point Meta to the generated dashboard webhook URL shown on **Connect WhatsApp** and use the same verify token in your backend webhook handler.

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
