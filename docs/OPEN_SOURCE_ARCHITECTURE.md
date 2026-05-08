# ClientPad Open-Source Architecture

ClientPad is a free, open-source, self-hostable product. The default architecture should avoid proprietary platform dependencies and should be easy for developers to run, inspect, modify, and extend.

## Database Direction

ClientPad should use standard open-source PostgreSQL as its primary database.

- Default production database: PostgreSQL
- Local development database: PostgreSQL through Docker Compose
- No proprietary database platform dependency
- Database migrations should live in a neutral path such as `db/migrations`
- Application authorization should be enforced in server-side code, not delegated to hosted database policies

New features should use the PostgreSQL platform layer and API-key gateway.

## Auth Direction

ClientPad should own its authentication and authorization layer.

- Users are stored in the application database
- Sessions are issued by the application
- Password auth should use a modern password hash such as Argon2id
- Magic links can be implemented through an email provider selected by the deployer
- Workspace access stays role-based: owner, admin, staff

## API Key Gateway

Developers and external tools should access ClientPad through API keys.

API keys are the gateway for machine-to-machine access, integrations, imports, automations, and third-party apps.

Recommended API key model:

- Keys belong to a workspace
- Keys are created and revoked by owner/admin users
- Raw keys are shown only once
- Store only a hash of the key, never the raw key
- Give each key a short public prefix for lookup and support
- Support scopes such as `leads:read`, `leads:write`, `clients:read`, `invoices:write`, `jobs:write`, `reports:read`
- Track `last_used_at`, `last_used_ip`, `created_by`, `expires_at`, and `revoked_at`
- Accept keys through `Authorization: Bearer <api_key>`

Suggested key format:

```text
cp_live_<public_prefix>_<secret>
cp_test_<public_prefix>_<secret>
```

## Public API Direction

External developers should build on top of stable versioned APIs.

- `/api/public/v1/leads`
- `/api/public/v1/clients`
- `/api/public/v1/deals`
- `/api/public/v1/quotes`
- `/api/public/v1/invoices`
- `/api/public/v1/jobs`
- `/api/public/v1/tasks`
- `/api/public/v1/reminders`

Every public API request should resolve a workspace through the API key, then enforce scope and workspace boundaries before touching data.

## Infrastructure Package Plan

1. Add PostgreSQL driver, migration tooling, and a database access layer.
2. Keep SQL migrations in `db/migrations`.
3. Provide reusable package migrations through `@clientpad/cli`.
4. Add app-owned users, sessions, and workspace membership checks.
5. Add API key tables and middleware.
6. Publish public APIs, OpenAPI specs, and SDK-ready contracts.
7. Publish the CLI to GitHub and the npm registry.

## Third-Party Services

Third-party integrations should be optional and user-provided. The infrastructure packages should work without paid ClientPad-controlled services.
