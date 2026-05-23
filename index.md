# ClientPad

ClientPad is open-source infrastructure for WhatsApp-first leads, client workflows, API keys, usage tracking, and operator dashboards.

It is designed for developers building business workflows into their own apps. The software stays MIT licensed and self-hostable. Hosted ClientPad Cloud is optional for teams that want managed infrastructure, dashboard access, usage tracking, and billing-ready operations.

## What ClientPad handles

- Public API gateway with workspace-scoped API keys.
- TypeScript SDK for apps, workers, scripts, and integrations.
- WhatsApp lead capture, owner inbox, and pipeline operations.
- PostgreSQL-backed migrations and storage.
- Operator auth, session restore, workspace bootstrap, and API key management.
- Usage tracking for month-to-date requests, rejections, active keys, and quota readiness.
- Hosted billing checkout through Lemon Squeezy for managed Cloud plans.

## Domain layout

- Public site: `https://clientpad.xyz`
- Operator dashboard: `https://app.clientpad.xyz`
- Cloud and public API: `https://api.clientpad.xyz`

## Quick start

```bash
pnpm add @clientpad/sdk
```

```ts
import { ClientPad } from "@clientpad/sdk";

const clientpad = new ClientPad({
  baseUrl: "https://api.clientpad.xyz/api/public/v1",
  apiKey: process.env.CLIENTPAD_API_KEY!,
});

await clientpad.leads.create({
  name: "Ada Customer",
  phone: "+234...",
  source: "WhatsApp",
});
```

## Documentation

- [Public API](/docs/public-api)
- [WhatsApp Magic](/docs/whatsapp-magic)
- [Open-source architecture](/docs/open-source)
- [ClientPad Cloud](/docs/clientpad-cloud)
- [GitHub repository](https://github.com/clientpadhq/clientpad)
