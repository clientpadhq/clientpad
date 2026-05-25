# Cloudflare-first deployment (direct upload, no GitHub auto-deploy)

This repository can deploy directly to Cloudflare using Wrangler.

## 1) Prerequisites

- Cloudflare account with access to `clientpad.xyz`
- API token with:
  - Workers Scripts: Edit
  - Workers Routes: Edit (if you add routes)
  - Cloudflare Pages: Edit
  - Account settings read access for your account
- `CLOUDFLARE_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`

Optional:

- `CLOUDFLARE_MARKETING_PROJECT` (default: `clientpad-marketing`)
- `CLOUDFLARE_DASHBOARD_PROJECT` (default: `clientpad-dashboard`)
- `CLOUDFLARE_PAGES_BRANCH` (default: `main`)

## 2) Initialize Pages projects once

```bash
pnpm run cf:init
```

This creates two direct-upload Pages projects:

- marketing: `clientpad-marketing`
- dashboard: `clientpad-dashboard`

## 3) Deploy directly to Cloudflare

Deploy API worker:

```bash
pnpm run cf:deploy:api
```

Deploy marketing site:

```bash
pnpm run cf:deploy:marketing
```

Deploy dashboard:

```bash
pnpm run cf:deploy:dashboard
```

Deploy both Pages projects:

```bash
pnpm run cf:deploy:pages
```

Deploy API + marketing + dashboard:

```bash
pnpm run cf:deploy:all
```

## 4) Disable GitHub auto-deploy (Cloudflare dashboard)

For each Pages project (`clientpad-marketing`, `clientpad-dashboard`):

1. Open **Workers & Pages** in Cloudflare.
2. Open the project.
3. Go to **Settings** > **Builds & deployments**.
4. Remove or disable the Git repository integration.
5. Keep the project as **Direct Upload** and deploy via Wrangler only.

After this, pushes to GitHub will not trigger Pages deploys.

## 5) Domain mapping

Map these hostnames to the Cloudflare projects/services:

- `clientpad.xyz` -> marketing Pages project
- `docs.clientpad.xyz` -> marketing Pages project
- `app.clientpad.xyz` -> dashboard Pages project
- `api.clientpad.xyz` -> Worker `clientpad-api-pages` (or a route you configure)

## Notes

- Worker config lives at `deploy/cloudflare/api-pages/wrangler.toml`.
- Deployment helper script lives at `scripts/deploy-cloudflare.mjs`.
- The helper uses `pnpm dlx wrangler@4`, so no global Wrangler install is required.
