import { ClientPad, type CreateLeadInput } from "@abdulmuiz44/clientpad-sdk";
import { parseWhatsAppWebhook } from "./webhook.js";
import { sendWhatsAppMessage } from "./messages.js";
import { normalizeNigerianPhoneNumber } from "./index.js";
import type { WhatsAppApiConfig, WhatsAppFetch } from "./types.js";

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

export function createServiceBusinessFlow(config: ServiceBusinessFlowConfig) {
  const fetcher = config.fetch ?? (globalThis.fetch?.bind(globalThis) as WhatsAppFetch);
  if (!fetcher) {
    throw new Error("ClientPad WhatsApp requires a fetch implementation.");
  }

  const clientpad = new ClientPad({
    baseUrl: config.clientpadBaseUrl,
    apiKey: config.clientpadApiKey,
    fetch: fetcher,
  });

  return async function handleWhatsAppWebhook(request: Request): Promise<Response> {
    if (request.method === "GET") {
      const url = new URL(request.url);
      const mode = url.searchParams.get("hub.mode");
      const token = url.searchParams.get("hub.verify_token");
      const challenge = url.searchParams.get("hub.challenge");

      if (mode === "subscribe" && token === config.verifyToken && challenge) {
        return new Response(challenge, { status: 200 });
      }
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (request.method !== "POST") {
      return Response.json({ error: "Method not allowed" }, { status: 405 });
    }

    const payload = (await request.json()) as Record<string, unknown>;
    const events = parseWhatsAppWebhook(payload);

    for (const event of events) {
      const text = event.message.text;
      const phone = normalizeNigerianPhoneNumber(event.message.from);
      const name = event.contact.name ?? phone;

      if (config.createLead !== false) {
        await clientpad.leads.create({
          name,
          phone,
          source: config.source ?? "whatsapp",
          service_interest: config.defaultServiceInterest ?? null,
          status: config.status ?? "new",
          notes: text ? `WhatsApp message: ${text}` : "WhatsApp webhook lead.",
        });
      }

      if (config.replyText) {
        await sendWhatsAppMessage({
          ...config,
          fetch: fetcher,
          to: event.message.from,
          message: {
            messaging_product: "whatsapp",
            recipient_type: "individual",
            type: "text",
            text: { body: config.replyText },
          },
        });
      }
    }

    return Response.json({ ok: true }, { status: 200 });
  };
}
