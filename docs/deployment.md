# Deployment

## Domains

- `clientpad.xyz`: public marketing site from `@clientpad/marketing`.
- `docs.clientpad.xyz`: docs host backed by the same marketing package docs routes.
- `app.clientpad.xyz`: operator dashboard PWA.
- `api.clientpad.xyz`: Cloud API and public API host.

## Netlify checks

- Marketing build: `pnpm --filter @clientpad/marketing build`.
- Dashboard build: `pnpm --filter @clientpad/dashboard build`.
- Use Netlify DNS while certificates are provisioning.
- Do not point `api.clientpad.xyz` until the API host answers `/health` and `/readiness`.
