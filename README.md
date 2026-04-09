# ClientPad

ClientPad is a WhatsApp-first CRM, revenue, execution, and AI-assisted operations platform for Nigerian service businesses.

## Current V1 coverage

### Phase 1 — Foundation
- Auth (email/password + magic link)
- Workspace onboarding and RBAC
- Leads, clients, deals
- Dashboard and activity timeline

### Phase 2 — Revenue flow
- Quotes and invoices
- PDF export for quotes/invoices
- Flutterwave payment links + webhook updates
- Manual payment recording

### Phase 3 — Execution workflow
- Jobs, tasks, reminders
- Internal notes on jobs
- Execution accountability metrics

### Phase 4 — AI copilot
- Lead summary drafts
- Follow-up drafts
- Quote text drafts
- Payment reminder drafts
- Weekly digest and next-step suggestions
- AI settings and AI history

### Phase 5 — Integrations and polish
- Team invite + role management polish
- WhatsApp share actions for quote/invoice/follow-up/reminder flows
- Integration hardening (Flutterwave + Mistral degraded states)
- Lightweight reporting route (`/reports`)
- Audit coverage improvements and UX polishing

## Sync expectation before coding
When working in a connected environment, sync from GitHub main first:
```bash
git fetch origin
git checkout main
git pull origin main
```

## Quick start
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env file:
   ```bash
   cp .env.example .env.local
   ```
3. Fill `.env.local`.
4. Apply migrations in order:
   - `supabase/migrations/202604090001_init_phase1.sql`
   - `supabase/migrations/202604090002_revenue_flow.sql`
   - `supabase/migrations/202604090003_execution_workflow.sql`
   - `supabase/migrations/202604090004_ai_layer.sql`
   - `supabase/migrations/202604090005_phase5_polish.sql`
5. Start app:
   ```bash
   npm run dev
   ```

## Required environment variables
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `FLUTTERWAVE_SECRET_KEY`
- `FLUTTERWAVE_WEBHOOK_HASH`
- `AI_PROVIDER` (default: `mistral`)
- `MISTRAL_API_KEY`
- `MISTRAL_MODEL` (default: `mistral-small-latest`)

## Operational notes
### Team invites
- Owner/admin can invite by email and role from Settings.
- Invite acceptance is automatic when invited email signs up/signs in.
- Roles can be updated safely from Settings.

### WhatsApp share behavior
- Share actions are one-tap and draft-first.
- Uses `wa.me` patterns with fallback copy behavior.
- Never auto-sends messages.

### Flutterwave webhook setup
Set webhook URL to:
- `https://your-domain.com/api/webhooks/flutterwave`

Webhook validates `verif-hash` against `FLUTTERWAVE_WEBHOOK_HASH`.

### AI graceful degradation
- AI is optional and review-only.
- Missing AI config or disabled workspace AI creates auditable `error`/`unavailable` records.
- AI history is available at `/ai/history`.

### Reporting
- Lightweight reporting route: `/reports`
- Supported ranges: last 7 days, last 30 days, this month.
