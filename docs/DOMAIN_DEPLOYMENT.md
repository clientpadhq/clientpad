# ClientPad domain and Netlify deployment

ClientPad uses three production hostnames:

| Hostname | Purpose | Netlify site |
| --- | --- | --- |
| `clientpad.xyz` | Public marketing and docs site | Marketing site |
| `app.clientpad.xyz` | Operator dashboard PWA | Dashboard site |
| `api.clientpad.xyz` | Cloud API and public API | Cloud API host |

## DNS

The domain should use Netlify DNS while it is hosted on Netlify. In the registrar, set the nameservers to the nameservers Netlify gives for `clientpad.xyz`.

Recommended records in Netlify DNS:

| Type | Name | Value |
| --- | --- | --- |
| NETLIFY | `clientpad.xyz` | Marketing Netlify site |
| CNAME | `www` | Marketing Netlify site hostname |
| CNAME | `app` | Dashboard Netlify site hostname |
| CNAME | `api` | Cloud API host |

If Netlify is still provisioning the certificate, custom-domain edits can be locked until the certificate job finishes. Wait for the certificate state to complete before changing the primary domain.

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
- `_redirects` for clean docs routes
- `_headers`
- `robots.txt`
- `sitemap.xml`
- `llms.txt`
- `llms-full.txt`

For a separate Netlify marketing site, set the Netlify base directory to:

```text
packages/marketing
```

The package includes `packages/marketing/netlify.toml`.

## Dashboard site

The dashboard remains the operator app and should use:

```text
app.clientpad.xyz
```

The root `netlify.toml` currently builds the dashboard package and publishes the dashboard SPA.

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
