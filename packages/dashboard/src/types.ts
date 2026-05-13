export type Session = {
  baseUrl: string;
  adminToken: string;
  publicApiKey?: string;
  demo?: boolean;
};

export type Page =
  | "overview"
  | "connect"
  | "pipeline"
  | "clients"
  | "inbox"
  | "revenue"
  | "usage"
  | "billing"
  | "projects"
  | "keys"
  | "docs"
  | "settings";

export type QuickstartLanguage = "curl" | "python" | "node" | "go" | "ruby";

export type Plan = {
  id: string;
  code: string;
  name: string;
  monthly_price_cents: number;
  currency: string;
  monthly_request_limit: number | null;
  rate_limit_per_minute: number | null;
  included_projects: number;
  features: Record<string, unknown>;
};

export type Project = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  environment: string;
  owner_email: string | null;
  created_at: string;
};

export type UsageRow = {
  api_key_id: string;
  name: string;
  billing_mode: string;
  monthly_request_limit: number | null;
  rate_limit_per_minute: number | null;
  request_count: number;
  rejected_count: number;
};

export type ApiKeyResult = {
  id: string;
  key: string;
  scopes: string[];
  billing_mode: string;
  monthly_request_limit: number | null;
  rate_limit_per_minute: number | null;
};

export type ApiKeyRecord = ApiKeyResult & {
  name: string;
  project_slug: string;
  created_at: string;
  last_used_at: string;
  status: "active" | "paused";
};

export type ProjectFormState = {
  name: string;
  owner_email: string;
  plan_code: string;
};

export type KeyFormState = {
  workspace_id: string;
  name: string;
  plan_code: string;
  scopes: string;
};

export type ClientRecord = {
  id: string;
  name: string;
  phone: string;
  status: string;
  service: string;
  value: number;
  lastMessage: string;
};

export type RevenueClient = {
  name: string;
  phone: string;
  amount: number;
  paidAt: string;
  provider: "Paystack" | "Flutterwave";
};

export type Lead = {
  id: string;
  workspace_id: string;
  name: string;
  phone: string;
  source: string | null;
  service_interest: string | null;
  status: string;
  pipeline_stage: string | null;
  owner_user_id: string | null;
  next_follow_up_at: string | null;
  urgency: string | null;
  budget_clue: string | null;
  notes: string | null;
  intent: string | null;
  ai_summary: string | null;
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

export type Payment = {
  id: string;
  workspace_id: string;
  lead_id: string;
  provider: string;
  provider_reference: string;
  provider_payment_id: string | null;
  status: string;
  amount: number;
  currency: string;
  service_item_reference: string;
  customer_phone: string;
  customer_name: string;
  lead_name: string | null;
  lead_phone: string | null;
  paid_at: string | null;
  created_at: string;
};

export type SearchResult = {
  type: "lead" | "client";
  name: string;
  phone: string;
  status: string;
  created_at: string;
};

export const serviceStages = [
  "New Lead",
  "Quoted",
  "Booked",
  "In Progress",
  "Completed",
  "Paid",
  "Review Requested",
] as const;

export const stageKeyMap: Record<string, string> = {
  new_lead: "New Lead",
  quoted: "Quoted",
  booked: "Booked",
  in_progress: "In Progress",
  completed: "Completed",
  paid: "Paid",
  review_requested: "Review Requested",
};

export const sessionKey = "clientpad.cloud.session";
