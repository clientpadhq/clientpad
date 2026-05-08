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
clientpad api-key create --workspace-id <workspace_id> --name "Free cloud key" --scopes "leads:read,leads:write,usage:read" --billing-mode cloud_free --monthly-request-limit 1000 --rate-limit-per-minute 60
clientpad api-key usage <api_key_id>
clientpad doctor
```

Self-hosted keys can omit limits for free unlimited local usage. Hosted ClientPad Cloud keys can set limits for monetized managed infrastructure.
