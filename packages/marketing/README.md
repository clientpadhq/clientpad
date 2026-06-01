# @clientpad/marketing

Public marketing and docs site for `clientpad.xyz`.

## Local development

```bash
pnpm --filter @clientpad/marketing dev
```

The local server runs on `http://localhost:3099`.

## Static build

```bash
pnpm --filter @clientpad/marketing build
```

The static build is written to:

```text
packages/marketing/dist
```

The build includes:

- static HTML docs pages
- public pages for about, Cloud, pricing, developers, WhatsApp, open source, contact, security, privacy, and terms
- host-aware rewrites for `docs.clientpad.xyz`
- clean-route redirects for `/docs/*`
- `robots.txt`
- `sitemap.xml`
- `llms.txt`
- `llms-full.txt`
- `_headers`

## Render deploy

Deploy this package to Render from repository root:

```bash
pnpm run render:deploy:frontend
pnpm run render:deploy:docs
```

See `docs/RENDER_DEPLOYMENT.md` for service setup, API token requirements, and deployment workflow details.

The docs static service sets `CLIENTPAD_SITE_VARIANT=docs` and `MARKETING_BASE_URL=https://docs.clientpad.xyz` so `docs.clientpad.xyz/` serves the docs home page from the shared marketing bundle while keeping the rest of the docs routes intact and generating docs-host canonical metadata.

The operator dashboard should stay on `platform.clientpad.xyz`; the marketing site should use `clientpad.xyz` and optionally `www.clientpad.xyz`; docs should use `docs.clientpad.xyz`.
