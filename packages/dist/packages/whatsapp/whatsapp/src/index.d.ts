import { type WhatsAppWebhookHandlerConfig } from "./webhook.js";
export * from "./webhook.js";
export * from "./messages.js";
export * from "./service-flow.js";
export * from "./payments.js";
export * from "./ai.js";
export * from "./types.js";
export declare function createWhatsAppHandler(config: WhatsAppWebhookHandlerConfig): (request: Request) => Promise<Response>;
export declare function createClientPadWhatsAppHandler(config: WhatsAppWebhookHandlerConfig): (request: Request) => Promise<Response>;
export declare function createWhatsAppWebhookHandler(config: WhatsAppWebhookHandlerConfig): (request: Request) => Promise<Response>;
export declare function normalizeNigerianPhoneNumber(phoneNumber: string): string;
//# sourceMappingURL=index.d.ts.map