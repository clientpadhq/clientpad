export type WhatsAppIntent = "booking" | "quote" | "payment" | "general" | "unknown";
export type IntentDetectionResult = {
    intent: WhatsAppIntent;
    confidence: number;
    reason?: string;
    entities?: Record<string, unknown>;
};
export type ConversationMessage = {
    role: "customer" | "business" | "system";
    body: string;
    createdAt?: string | Date;
};
export type SuggestedReply = {
    body: string;
    confidence: number;
    requiresOwnerApproval: boolean;
    reason?: string;
    sensitiveCategory?: "financial" | "medical" | "legal" | null;
};
export type ReminderSuggestion = {
    body: string;
    sendAt: string | null;
    confidence: number;
    requiresOwnerApproval: boolean;
    reason?: string;
};
export type IntentContext = {
    workspaceId?: string;
    contactId?: string;
    phone?: string;
    businessProfile?: Record<string, unknown>;
    recentMessages?: ConversationMessage[];
};
export type ClientContext = {
    id?: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, unknown>;
};
export type BookingContext = {
    id?: string;
    startsAt?: string | Date | null;
    endsAt?: string | Date | null;
    metadata?: Record<string, unknown>;
};
export interface WhatsAppAIProvider {
    detectIntent(message: string, context?: IntentContext): Promise<IntentDetectionResult> | IntentDetectionResult;
    suggestReplies(conversation: ConversationMessage[], businessProfile?: Record<string, unknown>): Promise<SuggestedReply[]> | SuggestedReply[];
    summarizeConversation(messages: ConversationMessage[]): Promise<string> | string;
    suggestReminder(client: ClientContext, booking: BookingContext, serviceType?: string): Promise<ReminderSuggestion> | ReminderSuggestion;
}
export declare const BOOKING_KEYWORDS: readonly ["book", "appointment", "tomorrow", "today"];
export declare const QUOTE_KEYWORDS: readonly ["price", "how much", "cost"];
export declare const PAYMENT_KEYWORDS: readonly ["pay", "transfer", "paid"];
export declare function detectDeterministicIntent(message: string): IntentDetectionResult;
export declare function createDeterministicAIProvider(): WhatsAppAIProvider;
export declare function applyReplySafetyRules(reply: SuggestedReply, confidenceThreshold?: number): SuggestedReply;
export declare function detectSensitiveAdviceCategory(text: string): "financial" | "medical" | "legal" | null;
//# sourceMappingURL=ai.d.ts.map