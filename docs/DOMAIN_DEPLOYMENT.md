# ClientPad domain and Render deployment

ClientPad production should run on Render services with Cloudflare DNS only.

## Production hostnames

| Hostname | Purpose | Render target |
| --- | --- | --- |
| `clientpad.xyz` | Public marketing site | `clientpad-frontend.onrender.com` |
| `www.clientpad.xyz` | Public marketing alias | `clientpad-frontend.onrender.com` |
| `docs.clientpad.xyz` | Developer/operator docs | `clientpad-docs.onrender.com` |
| `platform.clientpad.xyz` | Operator dashboard PWA | `clientpad-app.onrender.com` |
| `api.clientpad.xyz` | Cloud API + public API | `clientpad-api.onrender.com` |

## DNS (Cloudflare)

Use CNAME records pointing to Render targets:

| Type | Name | Value |
| --- | --- | --- |
| CNAME | `@` or `clientpad.xyz` (flattened) | `clientpad-frontend.onrender.com` |
| CNAME | `www` | `clientpad-frontend.onrender.com` |
| CNAME | `docs` | `clientpad-docs.onrender.com` |
| CNAME | `app` | `clientpad-app.onrender.com` |
| CNAME | `api` | `clientpad-api.onrender.com` |

Important:

1. Remove old Pages/Worker custom-domain bindings from Cloudflare if they still own these hostnames.
2. Use DNS-only mode while validating cutover.
3. Purge Cloudflare cache after target changes.

## Deploy commands

From repo root:

```bash
pnpm run render:deploy:api
pnpm run render:deploy:frontend
pnpm run render:deploy:docs
pnpm run render:deploy:app
```

Trigger all services:

```bash
pnpm run render:deploy:all
```

List Render services available to your API key:

```bash
pnpm run render:services
```

## Post-deploy verification

Run smoke checks:

```bash
pnpm run smoke:domains
```

Run API readiness verification:

```bash
pnpm run verify:api:readiness
```
