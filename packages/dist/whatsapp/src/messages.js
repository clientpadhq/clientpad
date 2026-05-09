import { normalizeBaseUrl } from "@abdulmuiz44/clientpad-core";
export async function sendWhatsAppMessage(input) {
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
    const payload = (await response.json());
    if (!response.ok) {
        const message = payload.error?.message ?? `WhatsApp Cloud API request failed with status ${response.status}.`;
        throw new Error(message);
    }
    return payload;
}
export function createReplyButtonsMessage(input) {
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
export function createListMessage(input) {
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
export function createCatalogMessage(input) {
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
export function createLocationMessage(input) {
    return {
        messaging_product: "whatsapp",
        recipient_type: "individual",
        type: "location",
        location: input,
    };
}
export function createMediaMessage(input) {
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
    };
}
function buildGraphApiUrl(config) {
    const baseUrl = normalizeBaseUrl(config.graphApiBaseUrl ?? "https://graph.facebook.com");
    const version = (config.graphApiVersion ?? "v20.0").replace(/^\/+/, "");
    return `${baseUrl}/${version}/${config.phoneNumberId}/messages`;
}
function normalizePhoneNumberForWhatsApp(phoneNumber) {
    return phoneNumber.replace(/[^\d]/g, "").replace(/^0/, "234");
}
function resolveFetch(fetcher) {
    const resolved = fetcher ?? globalThis.fetch?.bind(globalThis);
    if (!resolved) {
        throw new Error("ClientPad WhatsApp requires a fetch implementation.");
    }
    return resolved;
}
//# sourceMappingURL=messages.js.map