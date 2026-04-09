# ClientPad

ClientPad is a WhatsApp-first CRM, revenue, execution, and AI-assisted operations platform for Nigerian service businesses.

## Current V1 coverage
ClientPad is a WhatsApp-first CRM, revenue, and execution workflow platform for Nigerian service businesses.

## Current product coverage

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
# ClientPad - Phase 1 + Phase 2 (Revenue Flow)

ClientPad is a WhatsApp-first CRM and revenue workflow platform for Nigerian service businesses.

## Included now

### Foundation (Phase 1)
- Next.js App Router + TypeScript + Tailwind
- Supabase auth (email/password + magic link)
- Workspace onboarding + RBAC (owner/admin/staff)
- Leads, clients, deals, dashboard, activity logging

### Revenue flow (Phase 2)
- Quotes module (list/create/edit/detail)
- Quote line items and deterministic totals
- Quote PDF export
- Quote status management (draft/sent/accepted/rejected/expired)
- Convert accepted quote to invoice
- Invoices module (list/create/edit/detail)
- Invoice line items, paid/balance tracking, overdue visibility
- Invoice PDF export
- Flutterwave payment link generation (invoice-linked)
- Flutterwave webhook endpoint for payment updates
- Manual payment recording (bank transfer/cash/offline)
- Revenue dashboard metrics and activity logging

### Execution workflow (Phase 3)
- Jobs module (list/create/edit/detail)
- Tasks module with filters (assignee/status/priority/due/entity)
- System and manual reminders (lead follow-up due, invoice overdue, job due)
- Internal job notes
- Dashboard execution metrics (due today, overdue, assigned to me, unassigned)
- Richer operational timeline events for jobs/tasks/reminders

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
   - `supabase/migrations/202604090006_remove_workspace_webhook_hash.sql`
5. Start app:
5. Start app:
2. Copy environment file:
   ```bash
   cp .env.example .env.local
   ```
3. Fill `.env.local` values.
4. Apply Supabase migrations in order:
   - `supabase/migrations/202604090001_init_phase1.sql`
   - `supabase/migrations/202604090002_revenue_flow.sql`
   - `supabase/migrations/202604090003_execution_workflow.sql`
5. Start the app:
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

### Document numbering
- Quote and invoice numbers are now allocated by a concurrency-safe database counter keyed by workspace, document type, and month (`YYYYMM`).
- Format remains `Q-YYYYMM-####` for quotes and `INV-YYYYMM-####` for invoices.
- Unique constraints on `(workspace_id, quote_number)` and `(workspace_id, invoice_number)` remain as a final safety net.

### Team invites
- Owner/admin can invite by email and role from Settings.
- Invite acceptance is automatic when invited email signs up/signs in.
- Roles can be updated safely from Settings.

### WhatsApp share behavior
- Share actions are one-tap and draft-first.
- Uses `wa.me` patterns with fallback copy behavior.
- Never auto-sends messages.

### Flutterwave webhook setup
## AI behavior and graceful degradation
- AI outputs are drafts/suggestions only; user review is required.
- Deterministic logic remains deterministic (totals, statuses, reminders, reconciliation).
- If AI key/config is missing or workspace AI is disabled, AI requests are stored with `unavailable` or `error` status in `ai_generations`.
- AI history is visible in-app at `/ai/history` and entity-level AI sections.

## Flutterwave webhook
Set webhook URL to:
- `https://your-domain.com/api/webhooks/flutterwave`

Webhook validates `verif-hash` against the global server environment variable `FLUTTERWAVE_WEBHOOK_HASH` (not a workspace setting).

### AI graceful degradation
- AI is optional and review-only.
- Missing AI config or disabled workspace AI creates auditable `error`/`unavailable` records.
- AI history is available at `/ai/history`.

### Reporting
- Lightweight reporting route: `/reports`
- Supported ranges: last 7 days, last 30 days, this month.
- Data-status banner on report page: `ok`, `partial`, or `failed` to prevent silent partial reporting.
- Lead → Deal conversion is cohort-based: leads created in selected range that have at least one linked deal created on or before report generation time, divided by leads created in selected range.
- Status-based metrics normalize status text to lowercase before counting.
- Completion metrics and conversion metrics guard divide-by-zero by returning `0%` when denominator is `0`.
- `FLUTTERWAVE_SECRET_KEY`
- `FLUTTERWAVE_WEBHOOK_HASH`
- `SUPABASE_SERVICE_ROLE_KEY`

## Webhook endpoint
Configure Flutterwave webhook URL to:
- `https://your-domain.com/api/webhooks/flutterwave`

The endpoint validates `verif-hash` against the global server environment variable `FLUTTERWAVE_WEBHOOK_HASH` and updates payments/invoice status idempotently.

## Scope notes
- Jobs workflow is intentionally not implemented yet.
- AI features are intentionally not implemented yet.
- No full accounting ledger/inventory in this phase.
