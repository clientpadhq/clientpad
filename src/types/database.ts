export type Role = "owner" | "admin" | "staff";

export type Workspace = {
  id: string;
  name: string;
  phone: string | null;
  business_type: string | null;
  default_currency: string;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type WorkspaceBrandingSettings = {
  workspace_id: string;
  email: string | null;
  address: string | null;
  website_or_social: string | null;
  logo_url: string | null;
  default_footer_text: string | null;
  default_quote_terms: string | null;
  default_invoice_terms: string | null;
  created_at: string;
  updated_at: string;
};

export type WorkspaceMember = {
  workspace_id: string;
  user_id: string;
  role: Role;
  created_at: string;
};

export type WorkspaceOnboardingStep =
  | "business_profile"
  | "branding_payment"
  | "preset_selection"
  | "data_import"
  | "completed";

export type WorkspaceOnboardingState = {
  workspace_id: string;
  current_step: WorkspaceOnboardingStep;
  business_profile_completed: boolean;
  branding_payment_completed: boolean;
  preset_selected: boolean;
  data_import_completed: boolean;
  selected_preset: string | null;
  started_at: string | null;
  completed_at: string | null;
  last_skipped_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadStatus = "new" | "contacted" | "qualified" | "unqualified";

export type Lead = {
  id: string;
  workspace_id: string;
  name: string;
  phone: string;
  source: string | null;
  service_interest: string | null;
  status: LeadStatus;
  owner_user_id: string | null;
  next_follow_up_at: string | null;
  urgency: string | null;
  budget_clue: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Client = {
  id: string;
  workspace_id: string;
  business_name: string;
  primary_contact: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PipelineStage = {
  id: string;
  workspace_id: string;
  name: string;
  position: number;
  is_closed: boolean;
  created_at: string;
};

export type Deal = {
  id: string;
  workspace_id: string;
  title: string;
  lead_id: string | null;
  client_id: string | null;
  stage_id: string;
  amount: number;
  expected_close_date: string | null;
  owner_user_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected" | "expired";
export type InvoiceStatus = "draft" | "issued" | "partially_paid" | "paid" | "overdue" | "cancelled";
export type PaymentStatus = "pending" | "successful" | "failed" | "partially_paid" | "manually_recorded";

export type Quote = {
  id: string;
  workspace_id: string;
  quote_number: string;
  deal_id: string | null;
  client_id: string | null;
  status: QuoteStatus;
  issue_date: string;
  valid_until: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  notes: string | null;
  terms: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Invoice = {
  id: string;
  workspace_id: string;
  invoice_number: string;
  quote_id: string | null;
  deal_id: string | null;
  client_id: string | null;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  paid_amount: number;
  balance_amount: number;
  flutterwave_payment_link: string | null;
  flutterwave_tx_ref: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type JobStatus = "pending" | "scheduled" | "in_progress" | "blocked" | "completed" | "cancelled";
export type TaskStatus = "open" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";
export type ReminderType = "follow_up_due" | "invoice_overdue" | "job_due" | "custom";
export type ReminderStatus = "open" | "done" | "dismissed";

export type Job = {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  deal_id: string | null;
  invoice_id: string | null;
  assignee_user_id: string | null;
  owner_user_id: string | null;
  status: JobStatus;
  priority: TaskPriority;
  start_date: string | null;
  due_date: string | null;
  completion_note: string | null;
  internal_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Task = {
  id: string;
  workspace_id: string;
  title: string;
  description: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  assignee_user_id: string | null;
  owner_user_id: string | null;
  due_at: string | null;
  snoozed_until: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type Reminder = {
  id: string;
  workspace_id: string;
  type: ReminderType;
  title: string;
  description: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  assignee_user_id: string | null;
  due_at: string | null;
  status: ReminderStatus;
  system_generated: boolean;
  metadata: Record<string, unknown> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type ActivityType =
  | "workspace.created"
  | "lead.created"
  | "lead.updated"
  | "client.created"
  | "client.updated"
  | "deal.created"
  | "deal.updated"
  | "deal.stage_changed"
  | "quote.created"
  | "quote.updated"
  | "quote.sent"
  | "quote.accepted"
  | "invoice.created"
  | "invoice.updated"
  | "invoice.issued"
  | "payment_link.generated"
  | "payment.recorded"
  | "payment.webhook_received"
  | "invoice.partially_paid"
  | "invoice.paid"
  | "job.created"
  | "job.updated"
  | "job.assigned"
  | "job.status_changed"
  | "job.completed"
  | "task.created"
  | "task.updated"
  | "task.reassigned"
  | "task.done"
  | "reminder.created"
  | "reminder.dismissed"
  | "reminder.completed"
  | "invoice.overdue"
  | "follow_up.overdue"
  | "invite.accepted"
  | "invite.expired"
  | "branding.updated";
  | "onboarding.started"
  | "onboarding.completed";

export type Activity = {
  id: string;
  workspace_id: string;
  actor_user_id: string | null;
  entity_type: "workspace" | "lead" | "client" | "deal" | "quote" | "invoice" | "payment" | "job" | "task" | "reminder";
  entity_id: string;
  activity_type: ActivityType;
  description: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};
