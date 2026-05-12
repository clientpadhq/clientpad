# ClientPad — Open-Source WhatsApp-First CRM Infrastructure

ClientPad is open-source WhatsApp-first CRM infrastructure for service businesses and developers building client workflows. It turns WhatsApp conversations into leads, bookings, payments, follow-ups, reviews, and client pipelines.

**License**: MIT  
**Repository**: [github.com/clientpadhq/clientpad](https://github.com/clientpadhq/clientpad)

## What ClientPad handles

- **Lead Capture** — WhatsApp messages automatically create leads with contact info, source, and intent detection.
- **Service Bookings** — Clients request and confirm bookings through WhatsApp. Pipeline stages track every job.
- **Provider-Based Payments** — Payment links and confirmations through supported payment providers. Track paid status in the pipeline.
- **Smart Follow-Ups** — Automated follow-up prompts and review requests after service completion.
- **Client Pipeline** — Visual pipeline: New Lead → Quoted → Booked → In Progress → Completed → Paid → Review Requested.
- **Team Inbox** — Shared WhatsApp inbox with assignment, AI-suggested replies, and owner-approval workflows.

## Built for developers

- **REST API** — Versioned public API at `/api/public/v1`. Leads, clients, and usage endpoints with bearer token auth.
- **TypeScript SDK** — `@clientpad/sdk` provides a typed client for Node.js, Deno, Bun, and edge runtimes.
- **CLI Tool** — `clientpad init`, `migrate`, `api-key create`, and WhatsApp project scaffolding.
- **PostgreSQL** — Bring your own database. No vendor lock-in. Run migrations locally and deploy anywhere.

## Optional ClientPad Cloud

Hosted PostgreSQL, managed API endpoint, usage analytics, rate limiting, and a developer dashboard. Self-hosted API keys remain free and unlimited.

## Quick Start

```bash
pnpm add @clientpad/core @clientpad/server @clientpad/sdk
```

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

## Documentation

- [WhatsApp Magic](/docs/whatsapp-magic) — WhatsApp automation for service businesses
- [Public API](/docs/public-api) — REST API reference
- [Open-Source Architecture](/docs/open-source) — Package structure and design
- [ClientPad Cloud](/docs/clientpad-cloud) — Hosted infrastructure option
- [GitHub Repository](https://github.com/clientpadhq/clientpad)
