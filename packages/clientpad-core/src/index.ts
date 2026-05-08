export const CLIENTPAD_CORE_PACKAGE_NAME = "@abdulmuiz44/clientpad-core";
export const CLIENTPAD_APP_NAME = "ClientPad";

export type ClientPadCoreInfo = {
  packageName: string;
  appName: string;
};

export function getClientPadCoreInfo(): ClientPadCoreInfo {
  return {
    packageName: CLIENTPAD_CORE_PACKAGE_NAME,
    appName: CLIENTPAD_APP_NAME,
  };
}

export const LEAD_STATUSES = ["new", "contacted", "qualified", "unqualified", "paid"] as const;

export const API_SCOPES = [
  "leads:read",
  "leads:write",
  "clients:read",
  "clients:write",
  "deals:read",
  "deals:write",
  "quotes:read",
  "quotes:write",
  "invoices:read",
  "invoices:write",
  "jobs:read",
  "jobs:write",
  "tasks:read",
  "tasks:write",
  "reports:read",
  "usage:read",
] as const;

export type ApiScope = (typeof API_SCOPES)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type PaginationParams = {
  limit?: number | null;
  offset?: number | null;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
  };
};

export type CreatedIdResponse = {
  data: {
    id: string;
  };
};

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

export type CreateLeadInput = {
  name: string;
  phone: string;
  source?: string | null;
  service_interest?: string | null;
  status?: LeadStatus | null;
  next_follow_up_at?: string | null;
  urgency?: string | null;
  budget_clue?: string | null;
  notes?: string | null;
};

export type ListLeadsParams = PaginationParams & {
  status?: LeadStatus | null;
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

export type CreateClientInput = {
  business_name: string;
  primary_contact?: string | null;
  phone?: string | null;
  email?: string | null;
  location?: string | null;
  notes?: string | null;
};

export type ListClientsParams = PaginationParams & {
  q?: string | null;
};

export type ClientPadErrorPayload = {
  error?: {
    message?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type ApiKeyBillingMode = "self_hosted" | "cloud_free" | "cloud_paid" | "cloud_enterprise";

export type ApiKeyUsageSummary = {
  api_key_id: string;
  workspace_id: string;
  billing_mode: ApiKeyBillingMode;
  month: string;
  request_count: number;
  rejected_count: number;
  monthly_request_limit: number | null;
  remaining_requests: number | null;
  rate_limit_per_minute: number | null;
};

export function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "");
}

export function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>
) {
  const url = new URL(`${normalizeBaseUrl(baseUrl)}/${path.replace(/^\/+/, "")}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

export function isLeadStatus(value: string): value is LeadStatus {
  return (LEAD_STATUSES as readonly string[]).includes(value);
}

export function getPublicPrefix(rawKey: string) {
  const parts = rawKey.split("_");
  if (parts.length < 4 || parts[0] !== "cp") return null;
  if (parts[1] !== "live" && parts[1] !== "test") return null;
  return parts[2] || null;
}

export function parseBearerToken(header: string | null | undefined) {
  const [scheme, token] = (header ?? "").split(" ");
  if (scheme.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}
