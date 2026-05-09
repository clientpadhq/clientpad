export declare const CLIENTPAD_CORE_PACKAGE_NAME = "@abdulmuiz44/clientpad-core";
export declare const CLIENTPAD_APP_NAME = "ClientPad";
export type ClientPadCoreInfo = {
    packageName: string;
    appName: string;
};
export declare function getClientPadCoreInfo(): ClientPadCoreInfo;
export declare const LEAD_STATUSES: readonly ["new", "contacted", "qualified", "unqualified", "paid"];
export declare const PIPELINE_STAGES: readonly ["new_lead", "quoted", "booked", "in_progress", "completed", "paid", "review_requested"];
export declare const API_SCOPES: readonly ["leads:read", "leads:write", "clients:read", "clients:write", "deals:read", "deals:write", "quotes:read", "quotes:write", "invoices:read", "invoices:write", "jobs:read", "jobs:write", "tasks:read", "tasks:write", "reports:read", "usage:read", "whatsapp:read", "whatsapp:write", "services:read", "services:write", "bookings:read", "bookings:write", "payments:read", "payments:write", "reviews:write"];
export type ApiScope = (typeof API_SCOPES)[number];
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type PipelineStage = (typeof PIPELINE_STAGES)[number];
export type WhatsAppMessageDirection = "inbound" | "outbound";
export type WhatsAppConversationStatus = "open" | "closed" | "requires_owner";
export type PaymentProvider = "paystack" | "flutterwave";
export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled";
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
    intent: string | null;
    ai_summary: string | null;
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
    intent?: string | null;
    ai_summary?: string | null;
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
export declare function normalizeBaseUrl(baseUrl: string): string;
export declare function buildUrl(baseUrl: string, path: string, query?: Record<string, string | number | boolean | null | undefined>): string;
export declare function isLeadStatus(value: string): value is LeadStatus;
export declare function isPipelineStage(value: string): value is PipelineStage;
export declare function normalizeNigerianPhoneNumber(phone: string): string;
export declare function getPublicPrefix(rawKey: string): string | null;
export declare function parseBearerToken(header: string | null | undefined): string | null;
//# sourceMappingURL=index.d.ts.map