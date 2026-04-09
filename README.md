# ClientPad

ClientPad is a WhatsApp-first CRM, revenue, and execution workflow platform for Nigerian service businesses.

## Current product coverage

### Phase 1 — Foundation
- Auth (email/password + magic link)
- Workspace onboarding and RBAC
- Leads, clients, deals
- Dashboard and activity timeline

### Phase 2 — Revenue flow
- Quotes (create/edit/detail/list)
- Invoices (create/edit/detail/list)
- PDF export for quotes/invoices
- Flutterwave payment link generation + webhook updates
- Manual payment recording

### Phase 3 — Execution workflow
- Jobs module
- Tasks module with operational filters
- In-app reminders (system + manual)
- Internal notes on jobs
- Execution metrics on dashboard

### Phase 4 — AI copilot layer
- Lead summarization drafts
- Follow-up drafts (lead/deal)
- Quote text drafts
- Payment reminder drafts
- Next-step suggestions (lead/deal/invoice/job)
- Weekly AI digest
- AI settings + AI audit history

> AI is optional and review-only. No auto-sending, no silent status/financial mutations.

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

## AI behavior and graceful degradation
- AI outputs are drafts/suggestions only; user review is required.
- Deterministic logic remains deterministic (totals, statuses, reminders, reconciliation).
- If AI key/config is missing or workspace AI is disabled, AI requests are stored with `unavailable` or `error` status in `ai_generations`.
- AI history is visible in-app at `/ai/history` and entity-level AI sections.

## Flutterwave webhook
Set webhook URL to:
- `https://your-domain.com/api/webhooks/flutterwave`

Webhook validates `verif-hash` against `FLUTTERWAVE_WEBHOOK_HASH`.
