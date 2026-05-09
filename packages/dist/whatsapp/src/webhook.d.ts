import { type WhatsAppAIProvider, type IntentDetectionResult, type SuggestedReply } from "./ai.js";
import type { Queryable } from "./types.js";
export type WhatsAppWebhookHandlerConfig = {
    databaseUrl?: string;
    db?: Queryable;
    workspaceId?: string;
    defaultWorkspaceId?: string;
    verifyToken?: string;
    aiProvider?: WhatsAppAIProvider;
    businessProfile?: Record<string, unknown>;
    requireOptIn?: boolean;
    hasOptedIn?: (contact: WhatsAppContact) => Promise<boolean> | boolean;
    ownerApprovalConfidenceThreshold?: number;
    autoSendReplies?: boolean;
};
export type WhatsAppContact = {
    waId: string;
    phone: string;
    name: string | null;
};
export type WhatsAppIncomingMessage = {
    id: string;
    from: string;
    text: string;
    timestamp: string | null;
};
export type WhatsAppWebhookResult = {
    processed: number;
    conversations: Array<{
        contact: WhatsAppContact;
        intent: IntentDetectionResult;
        aiSummary: string;
        suggestedReplies: SuggestedReply[];
        metadata: Record<string, unknown>;
    }>;
};
export type WhatsAppWebhookHandler = (request: Request) => Promise<Response>;
export declare class ClientPadWhatsAppWebhookHandler {
    private readonly db;
    private readonly workspaceId;
    private readonly verifyToken;
    private readonly aiProvider;
    private readonly businessProfile;
    private readonly requireOptIn;
    private readonly hasOptedIn;
    private readonly ownerApprovalConfidenceThreshold;
    private readonly autoSendReplies;
    private readonly usingDeterministicFallback;
    constructor(config: WhatsAppWebhookHandlerConfig);
    handle(request: Request): Promise<Response>;
    private verifyWebhook;
    private processIncomingMessage;
    private storeLeadAI;
    private storeConversationMetadata;
}
type ParsedWhatsAppEvent = {
    contact: WhatsAppContact;
    message: WhatsAppIncomingMessage;
};
export declare function parseWhatsAppWebhook(payload: Record<string, unknown>): ParsedWhatsAppEvent[];
export {};
//# sourceMappingURL=webhook.d.ts.map