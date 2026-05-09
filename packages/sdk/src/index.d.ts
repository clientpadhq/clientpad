export declare const LEAD_STATUSES: readonly ["new", "contacted", "qualified", "unqualified", "paid"];
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export type WhatsAppConversationStatus = "open" | "closed" | "pending" | "archived";
export type WhatsAppConversation = {
    id: string;
    workspace_id: string;
    phone: string;
    wa_contact_id: string | null;
    contact_name: string | null;
    lead_id: string | null;
    status: WhatsAppConversationStatus;
    last_message_at: string | null;
    ai_summary: string | null;
    ai_intent: string | null;
    requires_owner_approval: boolean;
};
export type WhatsAppMessage = {
    id: string;
    conversation_id: string;
    direction: "inbound" | "outbound";
    message_type: string;
    message_text: string | null;
    interactive_payload: any | null;
    media_metadata: any | null;
    location_payload: any | null;
    sent_at: string | null;
    delivered_at: string | null;
    read_at: string | null;
    failed_at: string | null;
    created_at: string;
};
export type WhatsAppSuggestion = {
    body: string;
    intent: string;
    confidence: number;
    requiresOwnerApproval: boolean;
    reason?: string;
    sensitiveCategory?: string | null;
};
export type WhatsAppReplyInput = {
    message_text: string;
    send?: boolean;
    pipeline_stage?: string | null;
};
export type WhatsAppApproveSuggestionInput = {
    suggestion_index: number;
    edited_text?: string | null;
    send?: boolean;
};
export type WhatsAppConversationStatusInput = {
    status?: WhatsAppConversationStatus | null;
    pipeline_stage?: string | null;
};
export type ListWhatsAppConversationsParams = PaginationParams & {
    status?: WhatsAppConversationStatus | null;
    q?: string | null;
    needs_approval?: boolean | null;
    pipeline_stage?: string | null;
};
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
export type UpsertLeadInput = {
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
export type CreateLeadInput = UpsertLeadInput;
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
export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;
export type ClientPadConfig = {
    baseUrl: string;
    apiKey: string;
    fetch?: FetchLike;
};
type RequestOptions = {
    method?: "GET" | "POST";
    query?: Record<string, string | number | boolean | null | undefined>;
    body?: unknown;
};
type ResourceConfig = {
    request<T>(path: string, options?: RequestOptions): Promise<T>;
};
export declare class ClientPadError extends Error {
    readonly name = "ClientPadError";
    readonly status: number;
    readonly payload: ClientPadErrorPayload | string | null;
    constructor(status: number, payload: ClientPadErrorPayload | string | null);
}
export declare class ClientPad {
    readonly leads: LeadsResource;
    readonly clients: ClientsResource;
    readonly whatsapp: WhatsAppResource;
    readonly usage: UsageResource;
    private readonly baseUrl;
    private readonly apiKey;
    private readonly fetcher;
    constructor(config: ClientPadConfig);
    private request;
}
declare class LeadsResource {
    private readonly config;
    constructor(config: ResourceConfig);
    list(params?: ListLeadsParams): Promise<PaginatedResponse<Lead>>;
    create(input: CreateLeadInput): Promise<CreatedIdResponse>;
    upsert(input: UpsertLeadInput): Promise<CreatedIdResponse>;
}
declare class ClientsResource {
    private readonly config;
    constructor(config: ResourceConfig);
    list(params?: ListClientsParams): Promise<PaginatedResponse<Client>>;
    create(input: CreateClientInput): Promise<CreatedIdResponse>;
}
declare class WhatsAppResource {
    private readonly config;
    constructor(config: ResourceConfig);
    list(params?: ListWhatsAppConversationsParams): Promise<PaginatedResponse<WhatsAppConversation>>;
    retrieve(id: string): Promise<{
        data: WhatsAppConversation;
    }>;
    messages(id: string, params?: PaginationParams): Promise<PaginatedResponse<WhatsAppMessage>>;
    suggestions(id: string): Promise<{
        data: {
            suggestions: WhatsAppSuggestion[];
            safety: any;
        };
    }>;
    reply(id: string, input: WhatsAppReplyInput): Promise<{
        data: {
            id: string;
            meta_message_id?: string | null;
        };
    }>;
    approveSuggestion(id: string, input: WhatsAppApproveSuggestionInput): Promise<{
        data: {
            id: string;
            meta_message_id?: string | null;
        };
    }>;
    updateStatus(id: string, input: WhatsAppConversationStatusInput): Promise<{
        ok: boolean;
    }>;
}
declare class UsageResource {
    private readonly config;
    constructor(config: ResourceConfig);
    retrieve(): Promise<{
        data: ApiKeyUsageSummary;
    }>;
}
export {};
//# sourceMappingURL=index.d.ts.map