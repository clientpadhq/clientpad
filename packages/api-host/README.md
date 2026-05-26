# ClientPad API Host

This package is the Render deploy target for `api.clientpad.xyz`.

Production deploy flow:

- Service name: `clientpad-api`
- Start command: `node packages/api-host/render-server.mjs`
- Deploy command: `pnpm run render:deploy:api`

It combines:

- `@clientpad/cloud` at `/api/cloud/v1`
- `@clientpad/server` at `/api/public/v1`

The function is deploy-only and is not published to npm.

Required runtime environment:

- `DATABASE_URL`
- `API_KEY_PEPPER`
- `CLIENTPAD_CLOUD_ADMIN_TOKEN`

Health and readiness endpoints:

- `/health`
- `/readiness`

The root response returns a JSON description of the available API surfaces.
