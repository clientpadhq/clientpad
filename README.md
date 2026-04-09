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
- `FLUTTERWAVE_SECRET_KEY`
- `FLUTTERWAVE_WEBHOOK_HASH`
- `SUPABASE_SERVICE_ROLE_KEY`

## Webhook endpoint
Configure Flutterwave webhook URL to:
- `https://your-domain.com/api/webhooks/flutterwave`

The endpoint validates `verif-hash` against `FLUTTERWAVE_WEBHOOK_HASH` and updates payments/invoice status idempotently.

## Scope notes
- Jobs workflow is intentionally not implemented yet.
- AI features are intentionally not implemented yet.
- No full accounting ledger/inventory in this phase.
