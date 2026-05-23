# Open-Source Architecture

ClientPad is free, open-source, self-hostable business infrastructure. Developers can run it locally, deploy it anywhere, inspect the code, and build on top of the packages.

## Database

- PostgreSQL is the primary database.
- Migrations live in the repository and run through the CLI.
- There is no Supabase dependency or proprietary database platform requirement.
- Authorization is enforced by the application layer.

## Operator auth

ClientPad Cloud owns the operator auth layer:

- Operator users are stored in the application database.
- Passwords are hashed before storage.
- Sessions are issued by the Cloud API.
- The hosted dashboard restores sessions on refresh.
- Workspace access is checked server-side.

## API key gateway

Integrations use workspace-scoped API keys:

```text
Authorization: Bearer cp_live_<prefix>_<secret>
```

Keys can be created through the CLI, dashboard, or bootstrap flow. Raw keys are shown only once.

## Packages

| Package | Purpose |
| --- | --- |
| `@clientpad/core` | Shared TypeScript types and protocol utilities |
| `@clientpad/cli` | Project setup, migrations, and API key management |
| `@clientpad/server` | Public API handler for leads, clients, and usage |
| `@clientpad/sdk` | TypeScript SDK for consuming ClientPad APIs |
| `@clientpad/whatsapp` | WhatsApp automation and messaging |
| `@clientpad/cloud` | Hosted control plane, auth, readiness, usage, and billing |
| `@clientpad/dashboard` | Operator dashboard |

## Monetization

The software remains MIT licensed. Revenue comes from optional managed ClientPad Cloud infrastructure: hosting, readiness diagnostics, operator dashboard access, usage tracking, backups, support, and Lemon Squeezy checkout.

[Back to ClientPad](/)
