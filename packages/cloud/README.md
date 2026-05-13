# ClientPad Cloud

Hosted control plane for ClientPad projects, plans, subscriptions, API keys, usage, and operational health.

```bash
pnpm add @clientpad/cloud
```

```ts
import { createClientPadCloudHandler } from "@clientpad/cloud";

export const handler = createClientPadCloudHandler({
  databaseUrl: process.env.DATABASE_URL!,
  apiKeyPepper: process.env.API_KEY_PEPPER!,
  adminToken: process.env.CLIENTPAD_CLOUD_ADMIN_TOKEN!,
});
```

The cloud handler is for your hosted ClientPad Cloud control plane. It is separate from the public API handler in `@clientpad/server`.

This handler is an operator surface, not an end-user login flow. The dashboard should connect to it only in live/operator mode using a Cloud API URL and `CLIENTPAD_CLOUD_ADMIN_TOKEN`.

## Routes

- `GET /health`
- `GET /openapi.json`
- `GET /plans`
- `POST /projects`
- `GET /projects`
- `POST /api-keys`
- `GET /usage`
- `POST /billing/events`

All routes except `/health`, `/openapi.json`, and `/plans` require:

```text
Authorization: Bearer <CLIENTPAD_CLOUD_ADMIN_TOKEN>
```

Use `/health` for dashboard connectivity checks and `/openapi.json` for operator or docs tooling. Public developers should work through the public API key gateway exposed by `@clientpad/server` and `@clientpad/sdk`.
