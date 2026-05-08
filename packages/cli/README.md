# ClientPad CLI

Open-source infrastructure for business apps: PostgreSQL schema, migrations, workspace API keys, and developer-facing primitives.

Install globally:

```bash
pnpm install -g @abdulmuiz44/clientpad-cli
```

Use:

```bash
clientpad init
clientpad migrate
clientpad api-key create <workspace_id> "Development key" "leads:read,leads:write"
clientpad doctor
```

ClientPad CLI has no Supabase dependency.
