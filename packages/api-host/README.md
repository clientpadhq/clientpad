# ClientPad API Host

This package was originally used as a Netlify deploy target for `api.clientpad.xyz`.

Current Cloudflare-first deployment uses:

- Worker entrypoint: `deploy/cloudflare/api-pages/_worker.js`
- Worker config: `deploy/cloudflare/api-pages/wrangler.toml`
- Deploy command: `pnpm run cf:deploy:api`

It combines:

- `@clientpad/cloud` at `/api/cloud/v1`
- `@clientpad/server` at `/api/public/v1`

The function is deploy-only and is not published to npm.

Required runtime environment:

- `DATABASE_URL`
- `API_KEY_PEPPER`
- `CLIENTPAD_CLOUD_ADMIN_TOKEN`

The root response returns a small JSON description of the available API surfaces.
