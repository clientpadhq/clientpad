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

## Cloudflare direct deploy

Deploy this package directly to Cloudflare Pages from repository root:

```bash
pnpm run cf:deploy:marketing
```

See `docs/CLOUDFLARE_DEPLOYMENT.md` for project setup, API token requirements, and direct-upload workflow details.

The operator dashboard should stay on `app.clientpad.xyz`; the marketing site should use `clientpad.xyz` and optionally `www.clientpad.xyz`; documentation can use `docs.clientpad.xyz`.
