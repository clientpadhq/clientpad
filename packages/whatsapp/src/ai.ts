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
  suggestReplies(
    conversation: ConversationMessage[],
    businessProfile?: Record<string, unknown>
  ): Promise<SuggestedReply[]> | SuggestedReply[];
  summarizeConversation(messages: ConversationMessage[]): Promise<string> | string;
  suggestReminder(
    client: ClientContext,
    booking: BookingContext,
    serviceType?: string
  ): Promise<ReminderSuggestion> | ReminderSuggestion;
}

export const BOOKING_KEYWORDS = ["book", "appointment", "tomorrow", "today"] as const;
export const QUOTE_KEYWORDS = ["price", "how much", "cost"] as const;
export const PAYMENT_KEYWORDS = ["pay", "transfer", "paid"] as const;

export function detectDeterministicIntent(message: string): IntentDetectionResult {
  const normalized = message.toLocaleLowerCase();

  if (containsKeyword(normalized, BOOKING_KEYWORDS)) {
    return { intent: "booking", confidence: 0.72, reason: "Matched deterministic booking keyword." };
  }
  if (containsKeyword(normalized, QUOTE_KEYWORDS)) {
    return { intent: "quote", confidence: 0.72, reason: "Matched deterministic quote keyword." };
  }
  if (containsKeyword(normalized, PAYMENT_KEYWORDS)) {
    return { intent: "payment", confidence: 0.72, reason: "Matched deterministic payment keyword." };
  }

  return { intent: "general", confidence: 0.45, reason: "No deterministic keyword matched." };
}

export function createDeterministicAIProvider(): WhatsAppAIProvider {
  return {
    detectIntent(message) {
      return detectDeterministicIntent(message);
    },
    suggestReplies(conversation) {
      const latest = conversation.at(-1)?.body ?? "";
      const detection = detectDeterministicIntent(latest);
      return [createDeterministicReply(detection.intent)];
    },
    summarizeConversation(messages) {
      const latestCustomerMessages = messages
        .filter((message) => message.role === "customer")
        .slice(-3)
        .map((message) => message.body.trim())
        .filter(Boolean);

      return latestCustomerMessages.length
        ? `Recent WhatsApp messages: ${latestCustomerMessages.join(" | ")}`
        : "No customer WhatsApp messages to summarize.";
    },
    suggestReminder(client, booking, serviceType) {
      const clientName = client.name?.trim() || "the client";
      const service = serviceType?.trim() || "service";
      const startsAt = booking.startsAt ? new Date(booking.startsAt).toISOString() : null;
      return {
        body: `Reminder: ${clientName} has an upcoming ${service}${startsAt ? ` at ${startsAt}` : ""}.`,
        sendAt: null,
        confidence: 0.65,
        requiresOwnerApproval: true,
        reason: "Deterministic reminders are drafted for owner approval before sending.",
      };
    },
  };
}

export function applyReplySafetyRules(reply: SuggestedReply, confidenceThreshold = 0.7): SuggestedReply {
  const sensitiveCategory = detectSensitiveAdviceCategory(reply.body);
  const requiresOwnerApproval =
    reply.requiresOwnerApproval || reply.confidence < confidenceThreshold || sensitiveCategory !== null;

  return {
    ...reply,
    requiresOwnerApproval,
    sensitiveCategory,
    reason: sensitiveCategory
      ? `Contains possible ${sensitiveCategory} advice and must not be auto-sent.`
      : reply.confidence < confidenceThreshold
        ? "Confidence is below the owner-approval threshold."
        : reply.reason,
  };
}

export function detectSensitiveAdviceCategory(
  text: string
): "financial" | "medical" | "legal" | null {
  const normalized = text.toLocaleLowerCase();
  if (/\b(invest|loan|tax|interest rate|insurance|financial advice|buy stocks?|crypto)\b/.test(normalized)) {
    return "financial";
  }
  if (/\b(diagnos|prescription|dosage|symptoms?|treatment|medical advice|medicine)\b/.test(normalized)) {
    return "medical";
  }
  if (/\b(legal advice|lawsuit|contract|liability|court|sue|attorney|lawyer)\b/.test(normalized)) {
    return "legal";
  }
  return null;
}

function containsKeyword(message: string, keywords: readonly string[]) {
  return keywords.some((keyword) => message.includes(keyword));
}

function createDeterministicReply(intent: WhatsAppIntent): SuggestedReply {
  const bodyByIntent: Record<WhatsAppIntent, string> = {
    booking: "Thanks for reaching out. Please share your preferred date, time, and service so we can confirm availability.",
    quote: "Thanks for your interest. Please share the service details so we can prepare an accurate quote.",
    payment: "Thanks for the payment update. The business owner will verify and confirm shortly.",
    general: "Thanks for your message. The team will review it and get back to you shortly.",
    unknown: "Thanks for your message. The team will review it and get back to you shortly.",
  };

  return {
    body: bodyByIntent[intent],
    confidence: intent === "general" || intent === "unknown" ? 0.45 : 0.72,
    requiresOwnerApproval: intent === "general" || intent === "unknown" || intent === "payment",
    reason: "Generated by deterministic keyword routing.",
    sensitiveCategory: null,
  };
}
