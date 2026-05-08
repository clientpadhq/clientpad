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
export * from "./payments.js";
import { normalizeBaseUrl } from "@abdulmuiz44/clientpad-core";
import { ClientPad, type CreateLeadInput, type FetchLike } from "@abdulmuiz44/clientpad-sdk";

export type WhatsAppFetch = FetchLike;

export type WhatsAppContactProfile = {
  name?: string;
};

export type WhatsAppContact = {
  profile?: WhatsAppContactProfile;
  wa_id: string;
};

export type WhatsAppMetadata = {
  display_phone_number: string;
  phone_number_id: string;
};

export type WhatsAppTextMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: "text";
  text: {
    body: string;
  };
};

export type WhatsAppInteractiveButtonReplyMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: "interactive";
  interactive: {
    type: "button_reply";
    button_reply: {
      id: string;
      title: string;
    };
  };
};

export type WhatsAppInteractiveListReplyMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: "interactive";
  interactive: {
    type: "list_reply";
    list_reply: {
      id: string;
      title: string;
      description?: string;
    };
  };
};

export type WhatsAppMediaKind = "audio" | "document" | "image" | "sticker" | "video";

export type WhatsAppMediaObject = {
  id: string;
  mime_type?: string;
  sha256?: string;
  caption?: string;
  filename?: string;
};

export type WhatsAppMediaMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: WhatsAppMediaKind;
} & Partial<Record<WhatsAppMediaKind, WhatsAppMediaObject>>;

export type WhatsAppLocationMessage = {
  from: string;
  id: string;
  timestamp: string;
  type: "location";
  location: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
};

export type WhatsAppWebhookMessage =
  | WhatsAppTextMessage
  | WhatsAppInteractiveButtonReplyMessage
  | WhatsAppInteractiveListReplyMessage
  | WhatsAppMediaMessage
  | WhatsAppLocationMessage
  | {
      from: string;
      id: string;
      timestamp: string;
      type: string;
      [key: string]: unknown;
    };

export type WhatsAppWebhookStatus = {
  id: string;
  status: string;
  timestamp: string;
  recipient_id: string;
  conversation?: {
    id: string;
    origin?: {
      type: string;
    };
    expiration_timestamp?: string;
  };
  pricing?: {
    billable?: boolean;
    pricing_model?: string;
    category?: string;
  };
  errors?: Array<{
    code: number;
    title: string;
    message?: string;
    error_data?: {
      details?: string;
    };
  }>;
};

export type WhatsAppWebhookValue = {
  messaging_product: "whatsapp";
  metadata: WhatsAppMetadata;
  contacts?: WhatsAppContact[];
  messages?: WhatsAppWebhookMessage[];
  statuses?: WhatsAppWebhookStatus[];
  errors?: Array<Record<string, unknown>>;
};

export type WhatsAppWebhookChange = {
  field: "messages" | string;
  value: WhatsAppWebhookValue;
};

export type WhatsAppWebhookEntry = {
  id: string;
  changes: WhatsAppWebhookChange[];
};

export type WhatsAppWebhookPayload = {
  object: "whatsapp_business_account" | string;
  entry: WhatsAppWebhookEntry[];
};

export type ParsedWhatsAppWebhookMessage = {
  entry: WhatsAppWebhookEntry;
  change: WhatsAppWebhookChange;
  value: WhatsAppWebhookValue;
  message: WhatsAppWebhookMessage;
  contact?: WhatsAppContact;
};

export type ParsedWhatsAppWebhookPayload = {
  object: string;
  messages: ParsedWhatsAppWebhookMessage[];
  statuses: WhatsAppWebhookStatus[];
  values: WhatsAppWebhookValue[];
};

export type VerifyMetaWebhookInput = {
  mode?: string | null;
  token?: string | null;
  challenge?: string | null;
  verifyToken: string;
};

export type VerifyMetaWebhookResult =
  | {
      ok: true;
      challenge: string;
    }
  | {
      ok: false;
      status: 403;
      message: string;
    };

export type WhatsAppApiConfig = {
  whatsAppAccessToken: string;
  phoneNumberId: string;
  fetch?: WhatsAppFetch;
  graphApiBaseUrl?: string;
  graphApiVersion?: string;
};

export type SendWhatsAppMessageInput = WhatsAppApiConfig & {
  to: string;
  message: WhatsAppOutboundMessage;
};

export type WhatsAppOutboundMessage =
  | WhatsAppOutboundTextMessage
  | WhatsAppOutboundInteractiveMessage
  | WhatsAppOutboundLocationMessage
  | WhatsAppOutboundMediaMessage;

export type WhatsAppOutboundTextMessage = {
  messaging_product: "whatsapp";
  recipient_type?: "individual";
  type: "text";
  text: {
    body: string;
    preview_url?: boolean;
  };
};

export type WhatsAppReplyButton = {
  id: string;
  title: string;
};

export type WhatsAppListRow = {
  id: string;
  title: string;
  description?: string;
};

export type WhatsAppListSection = {
  title?: string;
  rows: WhatsAppListRow[];
};

export type WhatsAppOutboundInteractiveMessage = {
  messaging_product: "whatsapp";
  recipient_type?: "individual";
  type: "interactive";
  interactive:
    | {
        type: "button";
        header?: WhatsAppInteractiveHeader;
        body: { text: string };
        footer?: { text: string };
        action: {
          buttons: Array<{
            type: "reply";
            reply: WhatsAppReplyButton;
          }>;
        };
      }
    | {
        type: "list";
        header?: WhatsAppInteractiveHeader;
        body: { text: string };
        footer?: { text: string };
        action: {
          button: string;
          sections: WhatsAppListSection[];
        };
      }
    | {
        type: "product" | "product_list";
        header?: WhatsAppInteractiveHeader;
        body?: { text: string };
        footer?: { text: string };
        action: Record<string, unknown>;
      };
};

export type WhatsAppInteractiveHeader =
  | { type: "text"; text: string }
  | { type: "image"; image: WhatsAppMediaReference }
  | { type: "video"; video: WhatsAppMediaReference }
  | { type: "document"; document: WhatsAppMediaReference };

export type WhatsAppMediaReference = {
  id?: string;
  link?: string;
  caption?: string;
  filename?: string;
};

export type WhatsAppOutboundLocationMessage = {
  messaging_product: "whatsapp";
  recipient_type?: "individual";
  type: "location";
  location: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
};

export type WhatsAppOutboundMediaMessage = {
  messaging_product: "whatsapp";
  recipient_type?: "individual";
  type: Exclude<WhatsAppMediaKind, "sticker"> | "sticker";
} & Partial<Record<WhatsAppMediaKind, WhatsAppMediaReference>>;

export type WhatsAppApiResponse = {
  messaging_product?: "whatsapp";
  contacts?: Array<{
    input: string;
    wa_id: string;
  }>;
  messages?: Array<{
    id: string;
  }>;
  error?: {
    message?: string;
    type?: string;
    code?: number;
    error_subcode?: number;
    fbtrace_id?: string;
  };
  [key: string]: unknown;
};

export type WhatsAppWebhookHandlerConfig = WhatsAppApiConfig & {
  verifyToken: string;
  onMessage?: (message: ParsedWhatsAppWebhookMessage) => void | Response | Promise<void | Response>;
  onPayload?: (payload: ParsedWhatsAppWebhookPayload) => void | Promise<void>;
};

export type ServiceBusinessFlowConfig = WhatsAppApiConfig & {
  clientpadBaseUrl: string;
  clientpadApiKey: string;
  verifyToken: string;
  source?: string;
  defaultServiceInterest?: string;
  status?: CreateLeadInput["status"];
  replyText?: string;
  createLead?: boolean;
  fetch?: WhatsAppFetch;
};

export function verifyMetaWebhook(input: VerifyMetaWebhookInput): VerifyMetaWebhookResult {
  const mode = input.mode ?? "";
  const token = input.token ?? "";
  const challenge = input.challenge ?? "";

  if (mode === "subscribe" && token === input.verifyToken && challenge) {
    return { ok: true, challenge };
  }

  return { ok: false, status: 403, message: "WhatsApp webhook verification failed." };
}

export function parseWhatsAppWebhookPayload(payload: WhatsAppWebhookPayload): ParsedWhatsAppWebhookPayload {
  const messages: ParsedWhatsAppWebhookMessage[] = [];
  const statuses: WhatsAppWebhookStatus[] = [];
  const values: WhatsAppWebhookValue[] = [];

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      values.push(value);
      statuses.push(...(value.statuses ?? []));

      for (const message of value.messages ?? []) {
        messages.push({
          entry,
          change,
          value,
          message,
          contact: value.contacts?.find((contact) => contact.wa_id === message.from),
        });
      }
    }
  }

  return {
    object: payload.object,
    messages,
    statuses,
    values,
  };
}

export function createWhatsAppWebhookHandler(config: WhatsAppWebhookHandlerConfig) {
  return async function handleWhatsAppWebhook(request: Request): Promise<Response> {
    if (request.method === "GET") {
      const url = new URL(request.url);
      const result = verifyMetaWebhook({
        mode: url.searchParams.get("hub.mode"),
        token: url.searchParams.get("hub.verify_token"),
        challenge: url.searchParams.get("hub.challenge"),
        verifyToken: config.verifyToken,
      });

      return result.ok
        ? new Response(result.challenge, { status: 200 })
        : jsonResponse({ error: result.message }, result.status);
    }

    if (request.method !== "POST") {
      return jsonResponse({ error: "Method not allowed." }, 405);
    }

    const payload = (await request.json()) as WhatsAppWebhookPayload;
    const parsed = parseWhatsAppWebhookPayload(payload);
    await config.onPayload?.(parsed);

    for (const message of parsed.messages) {
      const response = await config.onMessage?.(message);
      if (response) return response;
    }

    return jsonResponse({ ok: true }, 200);
  };
}

export async function sendWhatsAppMessage(input: SendWhatsAppMessageInput): Promise<WhatsAppApiResponse> {
  const fetcher = resolveFetch(input.fetch);
  const url = buildGraphApiUrl(input);
  const to = normalizePhoneNumberForWhatsApp(input.to);
  const response = await fetcher(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.whatsAppAccessToken}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      ...input.message,
      to,
    }),
  });
  const payload = (await response.json()) as WhatsAppApiResponse;

  if (!response.ok) {
    const message = payload.error?.message ?? `WhatsApp Cloud API request failed with status ${response.status}.`;
    throw new Error(message);
  }

  return payload;
}

export function createReplyButtonsMessage(input: {
  body: string;
  buttons: WhatsAppReplyButton[];
  header?: WhatsAppInteractiveHeader;
  footer?: string;
}): WhatsAppOutboundInteractiveMessage {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    type: "interactive",
    interactive: {
      type: "button",
      header: input.header,
      body: { text: input.body },
      footer: input.footer ? { text: input.footer } : undefined,
      action: {
        buttons: input.buttons.map((reply) => ({ type: "reply", reply })),
      },
    },
  };
}

export function createListMessage(input: {
  body: string;
  button: string;
  sections: WhatsAppListSection[];
  header?: WhatsAppInteractiveHeader;
  footer?: string;
}): WhatsAppOutboundInteractiveMessage {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    type: "interactive",
    interactive: {
      type: "list",
      header: input.header,
      body: { text: input.body },
      footer: input.footer ? { text: input.footer } : undefined,
      action: {
        button: input.button,
        sections: input.sections,
      },
    },
  };
}

export function createCatalogMessage(input: {
  body?: string;
  footer?: string;
  catalogId: string;
  productRetailerId?: string;
  sections?: Array<{
    title?: string;
    product_items: Array<{ product_retailer_id: string }>;
  }>;
}): WhatsAppOutboundInteractiveMessage {
  const isSingleProduct = Boolean(input.productRetailerId);

  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    type: "interactive",
    interactive: {
      type: isSingleProduct ? "product" : "product_list",
      body: input.body ? { text: input.body } : undefined,
      footer: input.footer ? { text: input.footer } : undefined,
      action: isSingleProduct
        ? {
            catalog_id: input.catalogId,
            product_retailer_id: input.productRetailerId,
          }
        : {
            catalog_id: input.catalogId,
            sections: input.sections ?? [],
          },
    },
  };
}

export function createLocationMessage(input: {
  latitude: number;
  longitude: number;
  name?: string;
  address?: string;
}): WhatsAppOutboundLocationMessage {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    type: "location",
    location: input,
  };
}

export function createMediaMessage(input: {
  type: WhatsAppMediaKind;
  id?: string;
  link?: string;
  caption?: string;
  filename?: string;
}): WhatsAppOutboundMediaMessage {
  return {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    type: input.type,
    [input.type]: {
      id: input.id,
      link: input.link,
      caption: input.caption,
      filename: input.filename,
    },
  } as WhatsAppOutboundMediaMessage;
}

export function normalizeNigerianPhoneNumber(phoneNumber: string): string {
  const digits = phoneNumber.replace(/[^\d+]/g, "").replace(/^\+/, "");

  if (digits.startsWith("234") && digits.length === 13) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+234${digits.slice(1)}`;
  if (digits.length === 10) return `+234${digits}`;

  return phoneNumber.trim();
}

export function createServiceBusinessFlow(config: ServiceBusinessFlowConfig) {
  const fetcher = resolveFetch(config.fetch);
  const clientpad = new ClientPad({
    baseUrl: config.clientpadBaseUrl,
    apiKey: config.clientpadApiKey,
    fetch: fetcher,
  });

  return createWhatsAppWebhookHandler({
    ...config,
    fetch: fetcher,
    async onMessage(parsed) {
      const text = getMessageText(parsed.message);
      const phone = normalizeNigerianPhoneNumber(parsed.message.from);
      const name = parsed.contact?.profile?.name ?? phone;

      if (config.createLead !== false) {
        await clientpad.leads.create({
          name,
          phone,
          source: config.source ?? "whatsapp",
          service_interest: getServiceInterest(parsed.message) ?? config.defaultServiceInterest ?? null,
          status: config.status ?? "new",
          notes: text ? `WhatsApp message: ${text}` : "WhatsApp webhook lead.",
        });
      }

      if (config.replyText) {
        await sendWhatsAppMessage({
          ...config,
          fetch: fetcher,
          to: parsed.message.from,
          message: {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            type: "text",
            text: { body: config.replyText },
          },
        });
      }
    },
  });
}

function getMessageText(message: WhatsAppWebhookMessage): string | null {
  if (isTextMessage(message)) return message.text.body;
  if (isInteractiveButtonReplyMessage(message)) return message.interactive.button_reply.title;
  if (isInteractiveListReplyMessage(message)) return message.interactive.list_reply.title;
  if (isLocationMessage(message)) {
    return [message.location.name, message.location.address].filter(Boolean).join(" - ") || null;
  }
  return null;
}

function getServiceInterest(message: WhatsAppWebhookMessage): string | null {
  if (isInteractiveButtonReplyMessage(message)) return message.interactive.button_reply.id;
  if (isInteractiveListReplyMessage(message)) return message.interactive.list_reply.id;
  return null;
}

function isTextMessage(message: WhatsAppWebhookMessage): message is WhatsAppTextMessage {
  return message.type === "text" && typeof (message as WhatsAppTextMessage).text?.body === "string";
}

function isInteractiveButtonReplyMessage(
  message: WhatsAppWebhookMessage
): message is WhatsAppInteractiveButtonReplyMessage {
  const interactive = (message as WhatsAppInteractiveButtonReplyMessage).interactive;
  return message.type === "interactive" && interactive?.type === "button_reply";
}

function isInteractiveListReplyMessage(
  message: WhatsAppWebhookMessage
): message is WhatsAppInteractiveListReplyMessage {
  const interactive = (message as WhatsAppInteractiveListReplyMessage).interactive;
  return message.type === "interactive" && interactive?.type === "list_reply";
}

function isLocationMessage(message: WhatsAppWebhookMessage): message is WhatsAppLocationMessage {
  const location = (message as WhatsAppLocationMessage).location;
  return message.type === "location" && typeof location?.latitude === "number" && typeof location.longitude === "number";
}

function buildGraphApiUrl(config: WhatsAppApiConfig) {
  const baseUrl = normalizeBaseUrl(config.graphApiBaseUrl ?? "https://graph.facebook.com");
  const version = (config.graphApiVersion ?? "v20.0").replace(/^\/+/, "");
  return `${baseUrl}/${version}/${config.phoneNumberId}/messages`;
}

function normalizePhoneNumberForWhatsApp(phoneNumber: string) {
  return normalizeNigerianPhoneNumber(phoneNumber).replace(/^\+/, "");
}

function resolveFetch(fetcher?: WhatsAppFetch): WhatsAppFetch {
  const resolved = fetcher ?? globalThis.fetch?.bind(globalThis);
  if (!resolved) {
    throw new Error("ClientPad WhatsApp requires a fetch implementation.");
  }
  return resolved;
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
