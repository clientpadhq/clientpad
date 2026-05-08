import { normalizeBaseUrl } from "@abdulmuiz44/clientpad-core";
import type { WhatsAppFetch, WhatsAppApiConfig } from "./types.js";

export type WhatsAppMediaKind = "audio" | "document" | "image" | "sticker" | "video";

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

export type WhatsAppMediaReference = {
  id?: string;
  link?: string;
  caption?: string;
  filename?: string;
};

export type WhatsAppInteractiveHeader =
  | { type: "text"; text: string }
  | { type: "image"; image: WhatsAppMediaReference }
  | { type: "video"; video: WhatsAppMediaReference }
  | { type: "document"; document: WhatsAppMediaReference };

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

export type SendWhatsAppMessageInput = WhatsAppApiConfig & {
  to: string;
  message: WhatsAppOutboundMessage;
};

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

function buildGraphApiUrl(config: WhatsAppApiConfig) {
  const baseUrl = normalizeBaseUrl(config.graphApiBaseUrl ?? "https://graph.facebook.com");
  const version = (config.graphApiVersion ?? "v20.0").replace(/^\/+/, "");
  return `${baseUrl}/${version}/${config.phoneNumberId}/messages`;
}

function normalizePhoneNumberForWhatsApp(phoneNumber: string) {
  return phoneNumber.replace(/[^\d]/g, "").replace(/^0/, "234");
}

function resolveFetch(fetcher?: WhatsAppFetch): WhatsAppFetch {
  const resolved = fetcher ?? globalThis.fetch?.bind(globalThis);
  if (!resolved) {
    throw new Error("ClientPad WhatsApp requires a fetch implementation.");
  }
  return resolved;
}
