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
