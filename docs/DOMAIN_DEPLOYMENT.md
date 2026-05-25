# ClientPad domain and Cloudflare deployment

ClientPad uses four production hostnames:

| Hostname | Purpose | Cloudflare target |
| --- | --- | --- |
| `clientpad.xyz` | Public marketing and docs site | Pages project (`clientpad-marketing`) |
| `docs.clientpad.xyz` | Developer and operator docs | Pages project (`clientpad-marketing`) |
| `app.clientpad.xyz` | Operator dashboard PWA | Pages project (`clientpad-dashboard`) |
| `api.clientpad.xyz` | Cloud API and public API | Worker (`clientpad-api-pages`) |

## DNS

Use Cloudflare DNS for `clientpad.xyz`.

Recommended records:

| Type | Name | Value |
| --- | --- | --- |
| CNAME | `www` | `clientpad-marketing.pages.dev` |
| CNAME | `docs` | `clientpad-marketing.pages.dev` |
| CNAME | `app` | `clientpad-dashboard.pages.dev` |
| Route / Custom domain | `api` | `clientpad-api-pages` worker |

## Marketing site

The marketing package is the public homepage for `clientpad.xyz`.

Build locally:

```bash
pnpm --filter @clientpad/marketing build
```

Output:

```text
packages/marketing/dist
```

The build exports:

- `index.html`
- docs pages under `/docs/*`
- host-aware docs rewrites for `docs.clientpad.xyz`
- `_redirects` for clean docs routes
- `_headers`
- `robots.txt`
- `sitemap.xml`
- `llms.txt`
- `llms-full.txt`

Deploy directly to Cloudflare Pages:

```bash
pnpm run cf:deploy:marketing
```

## Dashboard site

The dashboard remains the operator app and should use:

```text
app.clientpad.xyz
```

Deploy directly to Cloudflare Pages:

```bash
pnpm run cf:deploy:dashboard
```

## Cloud API

The dashboard defaults to the Cloud API root:

```text
https://api.clientpad.xyz/api/cloud/v1
```

The public SDK examples use:

```text
https://api.clientpad.xyz/api/public/v1
```

Set `api.clientpad.xyz` only after the Cloud API host is deployed and ready to answer `/health` and `/readiness`.

Deploy API worker:

```bash
pnpm run cf:deploy:api
```

## GitHub auto-deploy

If your Pages projects are currently connected to GitHub, disable Git integration in Cloudflare Pages and use direct uploads only:

1. Workers & Pages -> project -> Settings -> Builds & deployments
2. Remove/disable Git repository connection
3. Deploy with Wrangler (`cf:deploy:*` scripts)
