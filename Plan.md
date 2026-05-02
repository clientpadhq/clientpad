# ClientPad Product Blueprint (V1 Source of Truth)

## 1) Product Overview

### What ClientPad is
ClientPad is a WhatsApp-first revenue and operations platform for Nigerian service businesses. It combines lightweight CRM, quotation/invoicing, job tracking, and payment follow-up in one workflow-oriented product.

### Who it is for
ClientPad is built for service businesses that close work through conversations and execute delivery in the field or through small teams, including:
- Agencies and design studios
- Printers
- Solar and CCTV installers
- Cleaning companies
- Logistics/dispatch operators
- Repair and maintenance businesses
- Interior/furniture businesses
- Similar Nigerian service businesses with high WhatsApp dependence

### Why it matters in Nigeria
In Nigeria, customer acquisition and fulfillment often happen via WhatsApp, calls, and referrals. Teams move fast with limited admin capacity, unstable process discipline, and little software adoption. Revenue leakage happens in day-to-day execution: missed follow-ups, forgotten quotes, unclear job status, and delayed payment collection.

### Why this is not “another CRM”
ClientPad is not lead storage software. It is an execution system for converting conversations into cash and completed jobs:
- CRM + quoting + job tracking + payment follow-up in one flow
- WhatsApp sharing actions built into core actions
- Designed for daily operational use by non-technical teams
- Focused on outcomes: quotes sent, invoices paid, jobs completed

---

## 2) Problem Statement

Nigerian service businesses face repeatable workflow failures:

1. **Leads are scattered** across WhatsApp, Instagram DMs, calls, and referrals; there is no unified lead capture habit.
2. **Quotation workflow is manual** (copy/paste templates, inconsistent pricing descriptions, no quote status visibility).
3. **Job execution is opaque** after deal close; teams lose track of assigned work, due dates, and completion status.
4. **Payment follow-up is inconsistent**; invoices are sent but reminders are ad hoc and dependent on memory.
5. **Business memory lives in chats** rather than structured records, making handover and team collaboration fragile.

Result: lost leads, slower conversion, delayed cashflow, and poor service consistency.

---

## 3) Product Vision

ClientPad’s long-term vision is to become the operating system for service delivery and revenue tracking for Nigerian SMB service businesses.

### Wedge strategy
Start with a narrow wedge: **WhatsApp-first lead-to-cash workflow**.
- Capture and qualify leads fast
- Move opportunities through a clear pipeline
- Send professional quotes/invoices quickly
- Track jobs after approval
- Enforce payment follow-up discipline

From this wedge, expand into deeper operations intelligence and integrations while staying simple enough for daily use.

---

## 4) ICP and Personas

## Ideal Customer Profile (ICP)
- 2–50 person Nigerian service businesses
- Revenue dependent on quotes, project jobs, or recurring service requests
- Lead generation primarily via WhatsApp/referrals/social channels
- Existing process managed with chats, spreadsheets, and memory
- Owner-led or manager-led operations with limited formal systems

### Persona A: Business Owner / Founder
- **Goals:** Increase conversion, avoid revenue leakage, get paid faster, oversee team performance
- **Frustrations:** Leads forgotten, quote delays, poor visibility on pending payments/jobs
- **Needs from ClientPad:** High-level dashboard, clear pipeline, fast quote/invoice generation, payment visibility, operational control without complexity

### Persona B: Operations / Admin Staff
- **Goals:** Keep records clean, keep jobs on schedule, ensure follow-ups are done
- **Frustrations:** Context switching across chats/apps, unclear responsibilities, duplicated manual entry
- **Needs from ClientPad:** Structured records, reminders/tasks, activity timeline, easy status updates, mobile-friendly UI

### Persona C: Salesperson / Account Manager
- **Goals:** Respond quickly, close more deals, track own follow-ups
- **Frustrations:** No single view of lead history, inconsistent quote templates, missed callback reminders
- **Needs from ClientPad:** Fast lead capture, pipeline board, AI-assisted follow-up drafts, one-tap WhatsApp sharing

---

## 5) Core User Journey (Lead-to-Cash-to-Completion)

1. **Lead received** (WhatsApp/call/referral/Instagram)
2. **Lead captured** in ClientPad with contact info, service interest, source, urgency, budget clues
3. **Pipeline movement** through qualification stages with owner, next action, and due follow-up date
4. **Quote sent** as shareable PDF and WhatsApp message with clear line items and validity date
5. **Invoice + payment** generated on approval; payment link shared via WhatsApp; status tracked automatically/manual where needed
6. **Job execution tracked** with assignment, due dates, milestones, and internal notes
7. **Completion confirmed** with final status and optional post-service note
8. **Record retained** as searchable client/deal history for future repeat business and accountability

---

## 6) MVP Scope (V1)

V1 must be narrow, useful, and buildable by a lean team.

### Included in V1
1. **Auth**
   - Email/password + magic link via Supabase Auth
   - Secure workspace-bound access

2. **Workspaces**
   - Single workspace on signup
   - Workspace profile (name, phone, business type, currency default NGN)

3. **Team members / roles**
   - Invite users by email
   - Roles: Owner, Admin, Staff

4. **Leads**
   - Create/edit leads, source tracking, status, owner, next follow-up date

5. **Clients (contacts/accounts)**
   - Convert lead to client
   - Store primary contact details and service notes

6. **Pipeline / deals**
   - Kanban/list pipeline stages
   - Deal value, expected close date, stage transitions, owner

7. **Quotations**
   - Create quote from deal/client
   - Line items, totals, validity, notes, PDF export

8. **Invoices**
   - Create invoice from quote or manually
   - Due date, line items, totals, status lifecycle

9. **Payments**
   - Flutterwave payment links for invoices
   - Webhook-based status updates
   - Manual payment marking + reference capture

10. **Jobs**
   - Create job from accepted deal/invoice
   - Assign staff, due date, status, notes

11. **Tasks & reminders**
   - Manual tasks and system reminders (follow-up due, invoice overdue)

12. **Activity timeline**
   - Chronological log of major actions per lead/client/deal

13. **Dashboard**
   - Snapshot metrics: new leads, active deals, unpaid invoices, jobs due

14. **WhatsApp share actions**
   - One-tap actions to share quote/invoice/payment reminder text + link/PDF

15. **AI follow-up drafting**
   - AI-generated follow-up message drafts from lead/deal context

16. **AI lead summarization**
   - Convert raw notes/chat snippets into structured lead summary

17. **PDF export**
   - Quote/invoice branded PDFs

---

## 7) Non-Goals (Not in V1)

Explicitly excluded to keep V1 focused:
- Payroll management
- Full accounting/general ledger
- Inventory management
- Deep custom automation builders
- Omnichannel inbox unification
- Enterprise workflow designer
- Advanced BI/reporting suite
- Chatbot platform
- Full WhatsApp API inbox replacement

---

## 8) Feature Breakdown by Module

## Dashboard
- **Purpose:** Daily command center for owner/admin
- **Main actions:** View KPIs, filter by timeframe, drill into priority lists
- **Important data:** New leads, pipeline value, overdue follow-ups, unpaid invoices, jobs due this week
- **Why it matters:** Drives daily action and reduces operational blind spots

## Leads
- **Purpose:** Capture and qualify opportunities quickly
- **Main actions:** Create lead, update status, assign owner, set follow-up reminder, convert to deal/client
- **Important data:** Name, phone, source, service interest, budget range, urgency, notes, last contact date
- **Why it matters:** Prevents lead loss and improves first-response discipline

## Clients
- **Purpose:** Persistent customer records beyond single transactions
- **Main actions:** Create/edit client, attach deals/jobs/invoices, store contacts and notes
- **Important data:** Business/client name, primary contact, phone/email, location, tags, historical value
- **Why it matters:** Enables repeat business and clean account history

## Pipeline / Deals
- **Purpose:** Track opportunities from qualification to close
- **Main actions:** Move stage, assign owner, update value/close date, attach quote
- **Important data:** Stage, amount, probability (optional), expected close date, loss reason
- **Why it matters:** Creates conversion visibility and owner accountability

## Quotes
- **Purpose:** Standardize and accelerate quotation process
- **Main actions:** Draft quote, add items, calculate totals, send/share PDF, mark accepted/rejected
- **Important data:** Quote number, issue date, valid until, items, tax/discount, terms, status
- **Why it matters:** Faster sales cycle and professional customer communication

## Invoices
- **Purpose:** Formalize billing and due-date tracking
- **Main actions:** Generate invoice, share PDF/link, update status, trigger reminders
- **Important data:** Invoice number, due date, items, subtotal/total, amount paid, balance, status
- **Why it matters:** Improves payment discipline and cashflow predictability

## Payments
- **Purpose:** Track how and when invoices are paid
- **Main actions:** Create Flutterwave payment link, receive webhook updates, mark manual payments
- **Important data:** Invoice relation, amount, method, transaction reference, paid_at, status, reconciliation note
- **Why it matters:** Reduces payment uncertainty and reconciliation errors

## Jobs
- **Purpose:** Manage delivery after sale closure
- **Main actions:** Create job, assign team member, set due date, update status, add progress notes
- **Important data:** Job title, linked deal/client, assignee, start/due dates, status, completion note
- **Why it matters:** Ensures promises made in sales are executed reliably

## Tasks
- **Purpose:** Manage follow-ups and operational to-dos
- **Main actions:** Create task/reminder, assign owner, mark done, snooze/reschedule
- **Important data:** Task type, due date/time, related entity, priority, completion timestamp
- **Why it matters:** Turns intent into execution and reduces forgotten actions

## Activity Timeline
- **Purpose:** Preserve operational memory
- **Main actions:** View chronological history, filter by entity/user/date
- **Important data:** Event type, actor, timestamp, related object, metadata snapshot
- **Why it matters:** Supports collaboration, handover, and auditability

## AI Assistant
- **Purpose:** Assist with communication and summarization within workflows
- **Main actions:** Generate follow-up drafts, summarize notes, suggest next steps, draft quote descriptions/reminders
- **Important data:** Prompt context, output text, model used, confidence/user feedback, regeneration history
- **Why it matters:** Saves time on repetitive text-heavy tasks without replacing core logic

## Settings / Workspace
- **Purpose:** Configure workspace identity and behavior
- **Main actions:** Manage profile, members/roles, branding for PDFs, notification/reminder defaults
- **Important data:** Workspace name/logo/contact, invoice terms defaults, role assignments, integration keys
- **Why it matters:** Enables personalization and controlled access with minimal complexity

---

## 9) AI Strategy (Mistral/Open-Source First)

### AI role in product
AI is an optional assistant embedded in user workflows, not a product replacement for core operations.

### Default AI layer
- Primary: Mistral AI APIs and/or open-source Mistral family deployments
- Design for model pluggability through an internal `AIProvider` abstraction
- Log usage and outputs for monitoring and quality tuning

### Practical V1 AI use cases
1. **Lead summarization:** Convert messy notes/chat snippets into structured lead fields (need, budget signals, urgency, next action)
2. **Follow-up message drafting:** Generate concise WhatsApp-ready follow-ups based on stage and last interaction
3. **Quote text drafting:** Suggest service descriptions/scope text for quote line items or terms
4. **Payment reminder drafting:** Generate polite but firm reminder copy for overdue invoices
5. **Weekly business digest:** Summarize key activity (new leads, stalled deals, overdue invoices, pending jobs)
6. **Next-step suggestions:** Recommend deterministic-friendly next actions (e.g., “call today”, “send revised quote”) with user approval

### AI usage principles
- **Optional:** Users can ignore AI and still complete every critical flow
- **Supportive:** AI drafts; user reviews before sending externally
- **Constrained context:** Pass only necessary business context
- **Auditable:** Store prompts/outputs metadata in `ai_generations`

### Deterministic logic over AI
Prefer deterministic code for:
- Financial calculations (totals, balances, taxes, discounts)
- Status transitions and lifecycle rules
- Reminder scheduling
- Access control
- Payment status mapping/reconciliation

### Architecture note
Implement provider abstraction from day one so model/provider can switch (Mistral API, self-hosted OSS, fallback provider) without rewriting product modules.

---

## 10) Payments Strategy (Flutterwave-First)

### Why Flutterwave
Flutterwave aligns with Nigerian market realities and supports local payment channels businesses already trust.

### V1 payment flow
1. Invoice created
2. User generates Flutterwave payment link from invoice
3. Link shared via WhatsApp/email
4. Webhook updates invoice/payment status in ClientPad
5. If offline/bank transfer occurs, user marks payment manually with evidence/reference

### V1 payment capabilities
- Invoice-linked payment links
- Payment status tracking (`pending`, `successful`, `failed`, `partially_paid`, `manually_recorded`)
- Manual payment entry (amount, date, method, reference, note)
- Basic reconciliation view per invoice

### Future readiness
- Subscription billing for ClientPad plans via Flutterwave
- Transaction-triggered automations (receipt follow-up, status changes)
- Better reconciliation tooling for split/partial/multi-payment scenarios

---

## 11) Data Model Overview (Conceptual)

- **users**: Authenticated individuals using ClientPad
- **workspaces**: Business accounts/tenants
- **workspace_members**: User-to-workspace membership with role
- **clients (contacts/accounts)**: Customer entities with contact and profile data
- **leads**: Pre-conversion opportunities from inbound channels
- **pipeline_stages**: Configurable deal stage definitions per workspace
- **deals**: Qualified opportunities tied to lead/client and pipeline stage
- **tasks**: Action items/reminders assigned to users
- **activities**: Immutable event log for actions across modules
- **quotes**: Commercial proposals sent to prospects/clients
- **quote_items**: Line items belonging to quotes
- **invoices**: Billing documents tied to deals/clients
- **invoice_items**: Line items belonging to invoices
- **payments**: Payment records from Flutterwave or manual entry
- **jobs**: Post-sale service execution records
- **notes**: Free-form notes linked to lead/client/deal/job
- **tags**: Workspace-defined labels for segmentation
- **reminders**: Time-based reminders (manual/system) linked to entities
- **ai_generations**: Stored AI prompt/output metadata and usage trace
- **integrations**: External integration configs (e.g., Flutterwave keys, webhook status)

### Relationship intent (high-level)
- Workspace owns most records (multi-tenant boundary)
- Lead may convert into deal/client
- Deal may spawn quote(s), invoice(s), and job(s)
- Invoice may have multiple payments
- Activities reference any major entity for timeline rendering

---

## 12) Roles and Permissions (V1)

### Owner
- Full workspace control
- Manage billing, integrations, team, and all records
- Can delete/archive critical records

### Admin
- Broad operational access
- Manage most records, team workflows, pipeline, quotes/invoices/jobs
- Limited billing/integration key management (configurable)

### Staff
- Day-to-day execution role
- Create/update leads, deals, tasks, jobs, notes within assigned/allowed scope
- Limited ability to change workspace settings or sensitive billing details

### Access model principles
- Workspace-level RBAC
- Least privilege for destructive actions
- Clear ownership fields for accountability

---

## 13) UX Principles

1. **Fast to use:** Minimize clicks and form friction for frequent tasks
2. **Mobile-friendly first:** Prioritize responsive layouts and thumb-friendly actions
3. **Low cognitive load:** Plain language, clear statuses, obvious next steps
4. **Local relevance:** Nigerian formats (NGN, phone conventions, practical terminology)
5. **Professional outputs:** Clean PDFs and messages clients can trust
6. **Daily utility:** Optimize for repeated operational use, not occasional reporting
7. **For non-CRM users:** Make workflows intuitive for teams unfamiliar with formal CRM software

---

## 14) Monetization and Pricing Direction

### Pricing approach (Nigeria-first SaaS)
Use affordable monthly tiers with clear operational value, priced in NGN with optional annual discount.

### Proposed early tiers
- **Starter** (micro teams)
  - Core CRM + pipeline + basic quotes/invoices
  - Limited users and AI generations/month
- **Growth** (small teams)
  - More users, jobs/tasks depth, payment tracking, higher AI quota
- **Pro** (scaling operations)
  - Advanced permissions, richer analytics snapshots, priority support, larger automation/reminder capacity

### Additional revenue levers
- **Optional onboarding/setup fee** for template setup, pipeline customization, and data migration
- Potential future transaction-linked features tied to payment flows

### Packaging principles
- Pay for clear operational outcomes (speed + cashflow), not feature bloat
- Keep entry barrier low to reduce adoption resistance

---

## 15) Go-to-Market Plan

### Initial wedge customer types
Start with service categories where quote-to-job-to-payment is frequent and painful:
- Solar/CCTV installers
- Printing businesses
- Design/agency service providers

### Why this wedge works
- High WhatsApp dependence
- Repetitive quote/invoice workflows
- Immediate value from follow-up discipline and payment tracking

### Early GTM strategy
1. **Founder-led outreach and demos** to 20–50 target businesses
2. **White-glove onboarding** (set up workspace, templates, first pipeline, import active leads)
3. **Hands-on first 30 days** with weekly check-ins and workflow tuning
4. **Case-study driven referrals** from early successful customers

### Feedback loop strategy
- Weekly product review of usage metrics + interview notes
- Prioritize features tied to core KPIs (conversion, invoice payments, job completion)
- Keep roadmap narrow; avoid broad custom requests that dilute core value

### Expansion logic
Nail one vertical workflow deeply before broadening to adjacent service categories.

---

## 16) Build Roadmap

## Phase 1: Foundation
- Auth, workspace setup, roles
- Core entities (leads, clients, deals)
- Basic dashboard and activity logging
- Mobile-first shell/navigation

## Phase 2: Revenue Flow
- Quotes + quote PDFs
- Invoices + invoice PDFs
- Flutterwave payment link integration + webhook status updates
- Payment records and overdue tracking

## Phase 3: Execution Workflow
- Jobs module with assignees/statuses
- Tasks/reminders across leads/deals/invoices/jobs
- Timeline and accountability improvements

## Phase 4: AI Layer
- Mistral-based lead summarization and follow-up drafting
- Payment reminder and quote text drafting
- Weekly digest and next-step suggestion engine
- AI usage tracking and controls

## Phase 5: Integrations and Polish
- Integration hardening, error handling, audit improvements
- UX refinements from real usage
- Performance optimization and reporting enhancements
- Preparation for selected advanced features based on validated demand

## Phase 6: WhatsApp Business Integration
- Direct WhatsApp message sending via Business API (not just share links)
- Inbound message capture via webhook
- Message status tracking (sent, delivered, read)
- Message history per contact/lead/client
- Template message support for automated workflows
- WhatsApp Business configuration per workspace

---

## 17) Risks and Product Challenges

1. **WhatsApp-native expectations vs integration reality**
   - Users may expect full inbox integration early; V1 should focus on sharing actions and workflow support
2. **Adoption friction**
   - Teams used to chat-only operations may resist structured data entry
3. **Behavior change burden**
   - Success depends on habit formation (updating statuses, logging actions)
4. **Pricing sensitivity**
   - SMB affordability constraints require strong visible ROI
5. **Simplicity vs usefulness tension**
   - Overbuilding can hurt usability; underbuilding can reduce retention
6. **AI reliability/cost risks**
   - Output quality variance and token costs need guardrails
7. **Payment reconciliation edge cases**
   - Partial payments, transfer delays, and manual overrides require robust handling

---

## 18) Success Metrics (Early)

Track leading indicators tied to business value:
- Leads created per active workspace/week
- Lead-to-deal conversion rate
- Quotes sent per week
- Invoice payment rate and time-to-payment
- Jobs completed on time
- Weekly active workspaces and seat activity
- Reminder completion rate
- Measured time saved on follow-ups and document preparation

Early success = consistent weekly usage plus measurable reduction in missed follow-ups and payment delays.

---

## 19) Final Summary

ClientPad can win by focusing on the operational truth of Nigerian service businesses: revenue leaks happen between chat conversations and execution. A WhatsApp-first, mobile-friendly lead-to-cash-to-job system—anchored by practical quoting, invoicing, follow-up discipline, and lightweight AI assistance—solves immediate daily pain. By staying narrow in V1, integrating Flutterwave for payment reality, and treating AI as a workflow copilot (not a gimmick), ClientPad can become the default operating layer for service delivery and cashflow reliability.
