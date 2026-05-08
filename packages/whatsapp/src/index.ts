import { Pool } from "pg";
import {
  applyReplySafetyRules,
  createDeterministicAIProvider,
  type ConversationMessage,
  type IntentDetectionResult,
  type SuggestedReply,
  type WhatsAppAIProvider,
} from "./ai.js";

export type QueryValue = string | number | boolean | Date | null | string[] | Record<string, unknown>;

export type QueryResult<T> = {
  rows: T[];
  rowCount: number | null;
};

export type Queryable = {
  query<T = Record<string, unknown>>(text: string, values?: QueryValue[]): Promise<QueryResult<T>>;
};

export type WhatsAppWebhookHandlerConfig = {
  databaseUrl?: string;
  db?: Queryable;
  workspaceId: string;
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

export { createDeterministicAIProvider, detectDeterministicIntent } from "./ai.js";
export type {
  BookingContext,
  ClientContext,
  ConversationMessage,
  IntentContext,
  IntentDetectionResult,
  ReminderSuggestion,
  SuggestedReply,
  WhatsAppAIProvider,
  WhatsAppIntent,
} from "./ai.js";

export function createWhatsAppWebhookHandler(config: WhatsAppWebhookHandlerConfig): WhatsAppWebhookHandler {
  const handler = new ClientPadWhatsAppWebhookHandler(config);
  return handler.handle.bind(handler);
}

class ClientPadWhatsAppWebhookHandler {
  private readonly db: Queryable;
  private readonly workspaceId: string;
  private readonly verifyToken: string | null;
  private readonly aiProvider: WhatsAppAIProvider;
  private readonly businessProfile: Record<string, unknown>;
  private readonly requireOptIn: boolean;
  private readonly hasOptedIn: ((contact: WhatsAppContact) => Promise<boolean> | boolean) | null;
  private readonly ownerApprovalConfidenceThreshold: number;
  private readonly autoSendReplies: boolean;
  private readonly usingDeterministicFallback: boolean;

  constructor(config: WhatsAppWebhookHandlerConfig) {
    if (!config.workspaceId.trim()) {
      throw new Error("workspaceId is required.");
    }
    if (!config.db && !config.databaseUrl?.trim()) {
      throw new Error("databaseUrl or db is required.");
    }

    this.db = config.db ?? new Pool({ connectionString: config.databaseUrl });
    this.workspaceId = config.workspaceId;
    this.verifyToken = config.verifyToken?.trim() || null;
    this.aiProvider = config.aiProvider ?? createDeterministicAIProvider();
    this.businessProfile = config.businessProfile ?? {};
    this.requireOptIn = config.requireOptIn ?? true;
    this.hasOptedIn = config.hasOptedIn ?? null;
    this.ownerApprovalConfidenceThreshold = config.ownerApprovalConfidenceThreshold ?? 0.7;
    this.autoSendReplies = config.autoSendReplies ?? false;
    this.usingDeterministicFallback = !config.aiProvider;
  }

  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === "GET") {
      return this.verifyWebhook(url);
    }
    if (request.method !== "POST") {
      return jsonError("Method not allowed.", 405);
    }

    const payload = await request.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return jsonError("Request body must be a WhatsApp webhook JSON object.", 400);
    }

    const events = parseWhatsAppWebhook(payload as Record<string, unknown>);
    const conversations: WhatsAppWebhookResult["conversations"] = [];

    for (const event of events) {
      const processed = await this.processIncomingMessage(event);
      conversations.push(processed);
    }

    const result: WhatsAppWebhookResult = {
      processed: conversations.length,
      conversations,
    };

    return Response.json({ data: result });
  }

  private verifyWebhook(url: URL): Response {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    if (!this.verifyToken) {
      return jsonError("Webhook verification token is not configured.", 400);
    }
    if (mode === "subscribe" && token === this.verifyToken && challenge) {
      return new Response(challenge, { status: 200 });
    }

    return jsonError("Webhook verification failed.", 403);
  }

  private async processIncomingMessage(event: ParsedWhatsAppEvent) {
    const contact = event.contact;
    const message = event.message;
    const optedIn = this.hasOptedIn ? await this.hasOptedIn(contact) : !this.requireOptIn;

    const conversationMessages: ConversationMessage[] = [
      {
        role: "customer",
        body: message.text,
        createdAt: message.timestamp ? new Date(Number(message.timestamp) * 1000) : new Date(),
      },
    ];

    const intent = await this.aiProvider.detectIntent(message.text, {
      workspaceId: this.workspaceId,
      contactId: contact.waId,
      phone: contact.phone,
      businessProfile: this.businessProfile,
      recentMessages: conversationMessages,
    });
    const aiSummary = await this.aiProvider.summarizeConversation(conversationMessages);
    const suggestedReplies = (await this.aiProvider.suggestReplies(
      conversationMessages,
      this.businessProfile
    )).map((reply) => applyReplySafetyRules(reply, this.ownerApprovalConfidenceThreshold));

    const canAutoSend =
      this.autoSendReplies &&
      optedIn &&
      suggestedReplies.every((reply) => !reply.requiresOwnerApproval && !reply.sensitiveCategory);

    const metadata = {
      ai: {
        provider: this.usingDeterministicFallback ? "deterministic-keyword-routing" : "configured-provider",
        intent,
        summary: aiSummary,
        suggestedReplies,
        safety: {
          canAutoSend,
          requiresOwnerApproval: suggestedReplies.some((reply) => reply.requiresOwnerApproval),
          rules: [
            "Never auto-send sensitive financial, medical, or legal advice.",
            "Require owner approval for uncertain replies.",
            "Respect WhatsApp opt-in and template rules before sending outbound messages.",
          ],
          whatsapp: {
            optedIn,
            templateRequiredForBusinessInitiatedMessages: true,
            inboundCustomerMessageReceived: true,
          },
        },
      },
      lastMessage: {
        id: message.id,
        from: message.from,
        receivedAt: new Date().toISOString(),
      },
    };

    const leadId = await this.storeLeadAI(contact, intent, aiSummary);
    await this.storeConversationMetadata(contact, message, leadId, metadata);

    return {
      contact,
      intent,
      aiSummary,
      suggestedReplies,
      metadata,
    };
  }

  private async storeLeadAI(contact: WhatsAppContact, intent: IntentDetectionResult, aiSummary: string) {
    const { rows } = await this.db.query<{ id: string }>(
      `
        update leads
        set
          intent = $1,
          ai_summary = $2,
          updated_at = now()
        where id = (
          select id
          from leads
          where workspace_id = $3
            and phone = $4
          order by created_at desc
          limit 1
        )
        returning id
      `,
      [intent.intent, aiSummary, this.workspaceId, contact.phone]
    );

    const existingLeadId = rows[0]?.id;
    if (existingLeadId) return existingLeadId;

    const created = await this.db.query<{ id: string }>(
      `
        insert into leads (
          workspace_id,
          name,
          phone,
          source,
          status,
          intent,
          ai_summary
        )
        values ($1, $2, $3, 'WhatsApp', 'new', $4, $5)
        returning id
      `,
      [this.workspaceId, contact.name ?? contact.phone, contact.phone, intent.intent, aiSummary]
    );

    return created.rows[0]?.id ?? null;
  }

  private async storeConversationMetadata(
    contact: WhatsAppContact,
    message: WhatsAppIncomingMessage,
    leadId: string | null,
    metadata: Record<string, unknown>
  ) {
    await this.db.query(
      `
        insert into whatsapp_conversations (
          workspace_id,
          lead_id,
          wa_contact_id,
          phone,
          contact_name,
          last_message_at,
          metadata
        )
        values ($1, $2, $3, $4, $5, $6, $7::jsonb)
        on conflict (workspace_id, wa_contact_id)
        do update set
          lead_id = coalesce(EXCLUDED.lead_id, whatsapp_conversations.lead_id),
          phone = EXCLUDED.phone,
          contact_name = EXCLUDED.contact_name,
          last_message_at = EXCLUDED.last_message_at,
          metadata = whatsapp_conversations.metadata || EXCLUDED.metadata,
          updated_at = now()
      `,
      [
        this.workspaceId,
        leadId,
        contact.waId,
        contact.phone,
        contact.name,
        message.timestamp ? new Date(Number(message.timestamp) * 1000) : new Date(),
        JSON.stringify(metadata),
      ]
    );
  }
}

type ParsedWhatsAppEvent = {
  contact: WhatsAppContact;
  message: WhatsAppIncomingMessage;
};

function parseWhatsAppWebhook(payload: Record<string, unknown>): ParsedWhatsAppEvent[] {
  const entries = asArray(payload.entry);
  const events: ParsedWhatsAppEvent[] = [];

  for (const entry of entries) {
    const changes = asArray(asRecord(entry).changes);
    for (const change of changes) {
      const value = asRecord(asRecord(change).value);
      const contacts = asArray(value.contacts).map((contact) => asRecord(contact));
      const messages = asArray(value.messages).map((message) => asRecord(message));

      for (const message of messages) {
        const messageType = stringValue(message.type);
        const text = messageType === "text" ? stringValue(asRecord(message.text).body) : null;
        if (!text) continue;

        const from = stringValue(message.from) ?? "";
        const matchingContact = contacts.find((contact) => stringValue(contact.wa_id) === from) ?? contacts[0];
        const profile = asRecord(matchingContact?.profile);
        const waId = stringValue(matchingContact?.wa_id) ?? from;

        events.push({
          contact: {
            waId,
            phone: waId || from,
            name: stringValue(profile.name),
          },
          message: {
            id: stringValue(message.id) ?? `${from}-${Date.now()}`,
            from,
            text,
            timestamp: stringValue(message.timestamp),
          },
        });
      }
    }
  }

  return events;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function jsonError(message: string, status: number) {
  return Response.json({ error: { message } }, { status });
}
