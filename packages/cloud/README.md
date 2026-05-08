# ClientPad Cloud

Hosted control plane for ClientPad projects, plans, subscriptions, API keys, usage, and operational health.

```bash
pnpm add @abdulmuiz44/clientpad-cloud
```

```ts
import { createClientPadCloudHandler } from "@abdulmuiz44/clientpad-cloud";

export const handler = createClientPadCloudHandler({
  databaseUrl: process.env.DATABASE_URL!,
  apiKeyPepper: process.env.API_KEY_PEPPER!,
  adminToken: process.env.CLIENTPAD_CLOUD_ADMIN_TOKEN!,
});
```

The cloud handler is for your hosted ClientPad Cloud control plane. It is separate from the public API handler in `@abdulmuiz44/clientpad-server`.

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
