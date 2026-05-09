import type { WhatsAppApiConfig } from "./types.js";
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
export type WhatsAppInteractiveHeader = {
    type: "text";
    text: string;
} | {
    type: "image";
    image: WhatsAppMediaReference;
} | {
    type: "video";
    video: WhatsAppMediaReference;
} | {
    type: "document";
    document: WhatsAppMediaReference;
};
export type WhatsAppOutboundMessage = WhatsAppOutboundTextMessage | WhatsAppOutboundInteractiveMessage | WhatsAppOutboundLocationMessage | WhatsAppOutboundMediaMessage;
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
    interactive: {
        type: "button";
        header?: WhatsAppInteractiveHeader;
        body: {
            text: string;
        };
        footer?: {
            text: string;
        };
        action: {
            buttons: Array<{
                type: "reply";
                reply: WhatsAppReplyButton;
            }>;
        };
    } | {
        type: "list";
        header?: WhatsAppInteractiveHeader;
        body: {
            text: string;
        };
        footer?: {
            text: string;
        };
        action: {
            button: string;
            sections: WhatsAppListSection[];
        };
    } | {
        type: "product" | "product_list";
        header?: WhatsAppInteractiveHeader;
        body?: {
            text: string;
        };
        footer?: {
            text: string;
        };
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
export declare function sendWhatsAppMessage(input: SendWhatsAppMessageInput): Promise<WhatsAppApiResponse>;
export declare function createReplyButtonsMessage(input: {
    body: string;
    buttons: WhatsAppReplyButton[];
    header?: WhatsAppInteractiveHeader;
    footer?: string;
}): WhatsAppOutboundInteractiveMessage;
export declare function createListMessage(input: {
    body: string;
    button: string;
    sections: WhatsAppListSection[];
    header?: WhatsAppInteractiveHeader;
    footer?: string;
}): WhatsAppOutboundInteractiveMessage;
export declare function createCatalogMessage(input: {
    body?: string;
    footer?: string;
    catalogId: string;
    productRetailerId?: string;
    sections?: Array<{
        title?: string;
        product_items: Array<{
            product_retailer_id: string;
        }>;
    }>;
}): WhatsAppOutboundInteractiveMessage;
export declare function createLocationMessage(input: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
}): WhatsAppOutboundLocationMessage;
export declare function createMediaMessage(input: {
    type: WhatsAppMediaKind;
    id?: string;
    link?: string;
    caption?: string;
    filename?: string;
}): WhatsAppOutboundMediaMessage;
//# sourceMappingURL=messages.d.ts.map