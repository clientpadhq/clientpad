# ClientPad

ClientPad is a WhatsApp-first CRM + lead-to-cash + execution workspace for Nigerian service businesses.

## Release candidate scope
The `Plan.md` Phases 1–5 roadmap is implemented on this codebase, including post-V1 hardening for:
- Workspace-scoped relational link enforcement
- Flutterwave webhook verification + invoice matching hardening
- WhatsApp share redirect validation
- Global Flutterwave webhook secret alignment
- Invite acceptance expiry guard
- Owner role hardening + explicit ownership transfer
- Atomic quote/invoice numbering via DB counters
- Workspace AI defaults + monthly cap enforcement
- Reports hardening and conversion metric clarification
- Persistent active workspace selection + workspace switcher

## Pilot onboarding readiness additions
- Guided, resumable onboarding flow for owner/admin users at `/onboarding`
- Workspace branding defaults (logo URL, contact details, footer, quote/invoice defaults) used by quote/invoice PDF generation
- Pipeline stage management in Settings (create, rename, reorder, archive/restore)
- Vertical presets for:
  - Solar / CCTV installers
  - Printing businesses
  - Design / agency providers
- CSV import for leads and clients with templates + dry-run preview
- CSV export for leads, clients, deals, and invoices
- Setup readiness card shown to owner/admin to highlight missing launch-critical setup items
- Weekly review route for owner/admin (`/review`) with deterministic 7-day pilot operations metrics
- Workspace health + attention surfacing (stalled deals, overdue invoices, at-risk jobs, overdue tasks)
- Invoice aging bands for collection pressure visibility (current, overdue 1–7, 8–30, 30+ days)

## Local setup
1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy env file:
   ```bash
   cp .env.example .env.local
   ```
3. Fill `.env.local` values.
4. Run migrations in the exact order below.
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

## Migration order (forward-safe)
Apply files exactly in this order:
1. `supabase/migrations/202604090001_init_phase1.sql`
2. `supabase/migrations/202604090002_revenue_flow.sql`
3. `supabase/migrations/202604090002_active_workspace_selection.sql`
4. `supabase/migrations/202604090003_execution_workflow.sql`
5. `supabase/migrations/202604090004_ai_layer.sql`
6. `supabase/migrations/202604090005_phase5_polish.sql`
7. `supabase/migrations/202604090006_workspace_scoped_fks.sql`
8. `supabase/migrations/202604090006_remove_workspace_webhook_hash.sql`
9. `supabase/migrations/202604090006_invite_acceptance_guard.sql`
10. `supabase/migrations/202604090006_owner_role_hardening.sql`
11. `supabase/migrations/202604090006_document_number_counters.sql`
12. `supabase/migrations/202604100001_workspace_onboarding_state.sql`
13. `supabase/migrations/202604100001_workspace_branding_settings.sql`
14. `supabase/migrations/202604100001_pipeline_stage_archive_support.sql`
15. `supabase/migrations/202604100001_onboarding_presets.sql`

> Note: several hardening migrations share the `202604090006` prefix. Preserve the order above for deterministic local bootstrap.

## Operational notes
### Workspace switching
- Active workspace is persisted in `profiles.active_workspace_id`.
- The top bar switcher updates active workspace server-side.
- If a user has no active workspace selected, server fallback picks an available membership and persists it.

### Invites and ownership transfer
- Owners/admins can invite members.
- Expired invites are marked `expired` and cannot be accepted.
- Ownership transfer is explicit and only owner-initiated.
- Owners cannot self-demote through role edit; transfer flow must be used.

### Payments and webhooks
- Invoice payment links are generated per invoice.
- Flutterwave webhook endpoint:
  - `POST /api/webhooks/flutterwave`
- Webhook verifies `verif-hash` against global `FLUTTERWAVE_WEBHOOK_HASH`.
- Verified webhook updates payment records and recalculates invoice amounts/status.

### AI behavior and degradation
- AI outputs are review-only drafts/suggestions.
- If AI provider config is missing, disabled, or cap is reached, requests degrade gracefully and are still logged in `ai_generations`.
- Workspace-level AI settings include provider/model/default enablement and monthly cap.

### Onboarding, setup, and data portability
- Onboarding route (`/onboarding`) is workspace-aware and resumable.
- Presets are optional and can be applied again from Settings.
- CSV import templates:
  - `public/templates/leads-import-template.csv`
  - `public/templates/clients-import-template.csv`
- CSV exports are available via:
  - `/api/exports/leads`
  - `/api/exports/clients`
  - `/api/exports/deals`
  - `/api/exports/invoices`

### Pilot success review workflow
- Owner/admin users can open `/review` for a weekly operational review window.
- The review page is deterministic-first and includes:
  - leads/deals/quotes/invoices/jobs/tasks/reminders weekly metrics
  - stalled deal detection (no deal update for 14+ days, excluding closed stages)
  - jobs at risk (blocked, overdue, or due within 3 days while not started)
  - overdue task and overdue invoice attention lists
  - invoice aging bands for collection pressure follow-up
- AI weekly summary is optional and secondary to deterministic metrics.

### Reports behavior
- Reporting route: `/reports`.
- Supports key snapshot + funnel/conversion metrics.
- Conversion metric is cohort-based (leads created in range that have linked deals).
- Report data status can be `ok`, `partial`, or `failed`.

## Build health checks
```bash
npm run typecheck
npm run lint
```
