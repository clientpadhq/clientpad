# ClientPad Cloud

ClientPad Cloud is the optional managed gateway that provides hosted infrastructure for ClientPad projects. The open-source packages remain free and MIT-licensed — Cloud adds hosting, management, and billing.

## Components

1. **Managed PostgreSQL** — Database hosting with automated migrations
2. **Public API Gateway** — Managed endpoint at your Cloud URL
3. **Control Plane** — Project management, API key issuance, and usage tracking
4. **Developer Dashboard** — Web interface for projects, keys, usage, and billing
5. **Billing** — Plan-based subscriptions with request quotas and rate limits

## Plans

| Plan | Requests/month | Rate Limit | Projects |
|------|---------------|------------|----------|
| Free | 1,000 | 60/min | 1 |
| Developer | 100,000 | 300/min | 3 |
| Pro | 10,000,000 | 1,200/min | 10 |
| Business | 50,000,000 | 5,000/min | 50 |

## Self-Hosted vs Cloud

Self-hosted deployments run your own PostgreSQL and server. API keys are free and unlimited — you control the infrastructure.

ClientPad Cloud adds managed hosting, automated backups, usage analytics, rate limiting, and a dashboard. You pay for the infrastructure, not the software.

## Quick Start

```ts
import { ClientPad } from "@clientpad/sdk";

const clientpad = new ClientPad({
  baseUrl: "https://your-project.clientpad.cloud/api/public/v1",
  apiKey: process.env.CLIENTPAD_API_KEY!,
});
```

[← Back to ClientPad](/)
