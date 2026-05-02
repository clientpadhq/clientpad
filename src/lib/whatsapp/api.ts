import { normalizeNigerianPhone } from "./whatsapp";

export interface WhatsAppMessage {
  to: string;
  type: "text" | "template";
  text?: { body: string };
  template?: {
    name: string;
    language: { code: string };
    components?: unknown[];
  };
}

export interface WhatsAppSendResult {
  success: boolean;
  message_id?: string;
  error?: string;
}

export interface WhatsAppMessageRecord {
  id: string;
  workspace_id: string;
  whatsapp_message_id: string;
  from_phone: string;
  to_phone: string;
  message_type: "text" | "template";
  content: string;
  direction: "outbound" | "inbound";
  status: "sent" | "delivered" | "read" | "failed";
  whatsapp_wid?: string;
  linked_entity_type?: string;
  linked_entity_id?: string;
  created_at: string;
}

const WHATSAPP_API_URL = "https://graph.facebook.com/v21.0";

function getWhatsAppConfig() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    throw new Error("WhatsApp configuration missing");
  }

  return { phoneNumberId, accessToken };
}

export async function sendWhatsAppMessage(
  to: string,
  message: string,
  metadata?: {
    workspace_id?: string;
    linked_entity_type?: string;
    linked_entity_id?: string;
  }
): Promise<WhatsAppSendResult> {
  const { phoneNumberId, accessToken } = getWhatsAppConfig();
  const normalizedTo = normalizeNigerianPhone(to);

  if (!normalizedTo) {
    return { success: false, error: "Invalid phone number" };
  }

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: normalizedTo,
          type: "text",
          text: { body: message },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("[WhatsApp] Send error:", data);
      return {
        success: false,
        error: data.error?.message || "Failed to send message",
      };
    }

    return {
      success: true,
      message_id: data.messages?.[0]?.id,
    };
  } catch (error) {
    console.error("[WhatsApp] Send exception:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string = "en_US",
  components?: unknown[]
): Promise<WhatsAppSendResult> {
  const { phoneNumberId, accessToken } = getWhatsAppConfig();
  const normalizedTo = normalizeNigerianPhone(to);

  if (!normalizedTo) {
    return { success: false, error: "Invalid phone number" };
  }

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: normalizedTo,
          type: "template",
          template: {
            name: templateName,
            language: { code: languageCode },
            components,
          },
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("[WhatsApp] Template send error:", data);
      return {
        success: false,
        error: data.error?.message || "Failed to send template",
      };
    }

    return {
      success: true,
      message_id: data.messages?.[0]?.id,
    };
  } catch (error) {
    console.error("[WhatsApp] Template exception:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function markMessageAsRead(messageId: string): Promise<boolean> {
  const { phoneNumberId, accessToken } = getWhatsAppConfig();

  try {
    const response = await fetch(
      `${WHATSAPP_API_URL}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          status: "read",
          message_id: messageId,
        }),
      }
    );

    return response.ok;
  } catch (error) {
    console.error("[WhatsApp] Mark read error:", error);
    return false;
  }
}

export function verifyWebhookToken(token: string): boolean {
  const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
  return token === expectedToken;
}