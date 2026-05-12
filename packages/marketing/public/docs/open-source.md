# Open-Source Architecture — ClientPad

ClientPad is free, open-source, self-hostable CRM infrastructure. The architecture avoids proprietary platform dependencies and is designed for developers to run, inspect, modify, and extend.

## Database

- **PostgreSQL** is the primary database
- Local development uses PostgreSQL via Docker Compose
- No proprietary database platform dependency
- Migrations live in `db/migrations`
- Authorization is enforced server-side, not delegated to hosted database policies

## Authentication

ClientPad owns its authentication layer:

- Users stored in the application database
- Sessions issued by the application
- Password hashing via Argon2id
- Magic link support through configurable email providers
- Role-based workspace access: owner, admin, staff

## API Key Gateway

All integrations use workspace-scoped API keys:

```text
Authorization: Bearer cp_live_<prefix>_<secret>
```

Keys are created via CLI or dashboard and are shown only once.

## Package Architecture

| Package | Purpose |
|---------|---------|
| `@clientpad/core` | Shared TypeScript types and protocol utilities |
| `@clientpad/cli` | Project setup, migrations, API key management |
| `@clientpad/server` | Public API handler for leads and clients |
| `@clientpad/sdk` | TypeScript SDK for consuming ClientPad APIs |
| `@clientpad/whatsapp` | WhatsApp automation and messaging |
| `@clientpad/cloud` | Hosted control plane for projects and billing |
| `@clientpad/dashboard` | Developer web dashboard |

## Monetization

ClientPad is MIT-licensed and fully open source. Self-hosted API keys are free and unlimited. Revenue comes from the optional ClientPad Cloud hosted gateway.

[← Back to ClientPad](/)
