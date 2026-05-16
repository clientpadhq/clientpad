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
- clean-route redirects for `/docs/*`
- `robots.txt`
- `sitemap.xml`
- `llms.txt`
- `llms-full.txt`
- Netlify `_headers`

## Netlify

Use this package as the base directory for the public marketing site:

```text
packages/marketing
```

The package includes `netlify.toml` for the build command and publish directory.

The operator dashboard should stay on `app.clientpad.xyz`; the marketing site should use `clientpad.xyz` and optionally `www.clientpad.xyz`.
