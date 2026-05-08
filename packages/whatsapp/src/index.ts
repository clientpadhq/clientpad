import { ClientPadWhatsAppWebhookHandler, type WhatsAppWebhookHandlerConfig } from "./webhook.js";

export * from "./webhook.js";
export * from "./messages.js";
export * from "./service-flow.js";
export * from "./payments.js";
export * from "./ai.js";
export * from "./types.js";

export function createWhatsAppHandler(config: WhatsAppWebhookHandlerConfig) {
  const handler = new ClientPadWhatsAppWebhookHandler(config);
  return handler.handle.bind(handler);
}

export function createClientPadWhatsAppHandler(config: WhatsAppWebhookHandlerConfig) {
  return createWhatsAppHandler(config);
}

export function createWhatsAppWebhookHandler(config: WhatsAppWebhookHandlerConfig) {
  return createWhatsAppHandler(config);
}

export function normalizeNigerianPhoneNumber(phoneNumber: string): string {
  const digits = phoneNumber.replace(/[^\d+]/g, "").replace(/^\+/, "");

  if (digits.startsWith("234") && digits.length === 13) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 11) return `+234${digits.slice(1)}`;
  if (digits.length === 10) return `+234${digits}`;

  return phoneNumber.trim();
}
