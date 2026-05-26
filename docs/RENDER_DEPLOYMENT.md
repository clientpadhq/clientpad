# Render-first deployment

ClientPad production deployment is Render-first.

## Required environment variables

- `RENDER_API_KEY`
- `RENDER_API_SERVICE_NAME` (default `clientpad-api`)
- `RENDER_FRONTEND_SERVICE_NAME` (default `clientpad-frontend`)
- `RENDER_DOCS_SERVICE_NAME` (default `clientpad-docs`)
- `RENDER_APP_SERVICE_NAME` (default `clientpad-app`)

## Deploy commands

```bash
pnpm run render:services
pnpm run render:deploy:api
pnpm run render:deploy:frontend
pnpm run render:deploy:docs
pnpm run render:deploy:app
pnpm run render:deploy:all
```

Use `--clear-cache` when forcing a clean build:

```bash
node scripts/deploy-render.mjs frontend --clear-cache
```

## Verification

### Domain smoke tests

```bash
pnpm run smoke:domains
```

### API readiness

```bash
pnpm run verify:api:readiness
```

For authenticated key checks, set:

- `CLIENTPAD_PUBLIC_API_KEY`
