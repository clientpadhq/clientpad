import { Pool } from "pg";
import { applyReplySafetyRules, createDeterministicAIProvider, } from "./ai.js";
export class ClientPadWhatsAppWebhookHandler {
    db;
    workspaceId;
    verifyToken;
    aiProvider;
    businessProfile;
    requireOptIn;
    hasOptedIn;
    ownerApprovalConfidenceThreshold;
    autoSendReplies;
    usingDeterministicFallback;
    constructor(config) {
        const workspaceId = config.workspaceId?.trim() || config.defaultWorkspaceId?.trim();
        if (!workspaceId) {
            throw new Error("workspaceId or defaultWorkspaceId is required.");
        }
        if (!config.db && !config.databaseUrl?.trim()) {
            throw new Error("databaseUrl or db is required.");
        }
        this.db = config.db ?? new Pool({ connectionString: config.databaseUrl });
        this.workspaceId = workspaceId;
        this.verifyToken = config.verifyToken?.trim() || null;
        this.aiProvider = config.aiProvider ?? createDeterministicAIProvider();
        this.businessProfile = config.businessProfile ?? {};
        this.requireOptIn = config.requireOptIn ?? true;
        this.hasOptedIn = config.hasOptedIn ?? null;
        this.ownerApprovalConfidenceThreshold = config.ownerApprovalConfidenceThreshold ?? 0.7;
        this.autoSendReplies = config.autoSendReplies ?? false;
        this.usingDeterministicFallback = !config.aiProvider;
    }
    async handle(request) {
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
        const events = parseWhatsAppWebhook(payload);
        const conversations = [];
        for (const event of events) {
            const processed = await this.processIncomingMessage(event);
            conversations.push(processed);
        }
        const result = {
            processed: conversations.length,
            conversations,
        };
        return Response.json({ data: result });
    }
    verifyWebhook(url) {
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
    async processIncomingMessage(event) {
        const contact = event.contact;
        const message = event.message;
        const optedIn = this.hasOptedIn ? await this.hasOptedIn(contact) : !this.requireOptIn;
        const conversationMessages = [
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
        const suggestedReplies = (await this.aiProvider.suggestReplies(conversationMessages, this.businessProfile)).map((reply) => applyReplySafetyRules(reply, this.ownerApprovalConfidenceThreshold));
        const canAutoSend = this.autoSendReplies &&
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
    async storeLeadAI(contact, intent, aiSummary) {
        const { rows } = await this.db.query(`
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
      `, [intent.intent, aiSummary, this.workspaceId, contact.phone]);
        const existingLeadId = rows[0]?.id;
        if (existingLeadId)
            return existingLeadId;
        const created = await this.db.query(`
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
      `, [this.workspaceId, contact.name ?? contact.phone, contact.phone, intent.intent, aiSummary]);
        return created.rows[0]?.id ?? null;
    }
    async storeConversationMetadata(contact, message, leadId, metadata) {
        await this.db.query(`
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
      `, [
            this.workspaceId,
            leadId,
            contact.waId,
            contact.phone,
            contact.name,
            message.timestamp ? new Date(Number(message.timestamp) * 1000) : new Date(),
            JSON.stringify(metadata),
        ]);
    }
}
export function parseWhatsAppWebhook(payload) {
    const entries = asArray(payload.entry);
    const events = [];
    for (const entry of entries) {
        const changes = asArray(asRecord(entry).changes);
        for (const change of changes) {
            const value = asRecord(asRecord(change).value);
            const contacts = asArray(value.contacts).map((contact) => asRecord(contact));
            const messages = asArray(value.messages).map((message) => asRecord(message));
            for (const message of messages) {
                const messageType = stringValue(message.type);
                const text = messageType === "text" ? stringValue(asRecord(message.text).body) : null;
                if (!text)
                    continue;
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
function asArray(value) {
    return Array.isArray(value) ? value : [];
}
function asRecord(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function stringValue(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null;
}
function jsonError(message, status) {
    return Response.json({ error: { message } }, { status });
}
//# sourceMappingURL=webhook.js.map