# ClientPad Cloud

ClientPad Cloud is the optional hosted gateway for teams that do not want to run the infrastructure themselves.

The open-source packages remain MIT licensed and self-hostable. Cloud monetization is attached to managed infrastructure: operator auth, hosted API access, workspace bootstrap, API keys, usage tracking, readiness diagnostics, and Lemon Squeezy checkout.

## Production domains

- Public site: `https://clientpad.xyz`
- Operator dashboard: `https://app.clientpad.xyz`
- Cloud API: `https://api.clientpad.xyz/api/cloud/v1`
- Public API: `https://api.clientpad.xyz/api/public/v1`

## What Cloud provides

1. Operator signup, login, session restore, and logout.
2. Workspace and starter project bootstrap.
3. Workspace-scoped public API key creation.
4. Readiness checks for Cloud, auth, workspace, API key, WhatsApp, and billing state.
5. Usage summaries for month-to-date requests, active keys, rejections, and quota readiness.
6. Lemon Squeezy checkout and portal links for hosted billing.

## Self-hosted vs hosted

Self-hosted deployments run their own PostgreSQL database, migrations, server, and dashboard. Self-hosted API keys can remain free and unlimited because the developer owns the infrastructure.

Hosted Cloud is the commercial path. Businesses pay for managed infrastructure, operational reliability, usage visibility, and support around the same open-source packages.

## SDK example

```ts
import { ClientPad } from "@clientpad/sdk";

const clientpad = new ClientPad({
  baseUrl: "https://api.clientpad.xyz/api/public/v1",
  apiKey: process.env.CLIENTPAD_API_KEY!,
});

const usage = await clientpad.usage.retrieve();
```

[Back to ClientPad](/)
