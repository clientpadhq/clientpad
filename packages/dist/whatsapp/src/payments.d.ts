import type { Queryable } from "./types.js";
export type PaymentProvider = "paystack" | "flutterwave";
export type PaymentStatus = "pending" | "paid" | "failed" | "cancelled";
export type PaymentCustomer = {
    email?: string | null;
    phone?: string | null;
    name?: string | null;
};
export type WhatsAppFlowPaymentConfig = {
    provider: PaymentProvider;
    amount: number;
    currency?: string | null;
    serviceItemReference: string;
    customer: PaymentCustomer;
    callbackUrl?: string | null;
    redirectUrl?: string | null;
};
export type WhatsAppFlowAction = {
    type: "payment";
    payment: WhatsAppFlowPaymentConfig;
};
export type CreatePaymentLinkInput = WhatsAppFlowPaymentConfig & {
    reference: string;
    metadata?: Record<string, unknown>;
    secretKey?: string;
    fetchImpl?: typeof fetch;
};
export type PaymentLinkResult = {
    provider: PaymentProvider;
    reference: string;
    authorizationUrl: string;
    accessCode?: string | null;
    providerPaymentId?: string | null;
    raw: unknown;
};
export type StoredPaymentLinkInput = CreatePaymentLinkInput & {
    db: Queryable;
    workspaceId: string;
    leadId: string;
};
export type StoredPaymentLinkResult = PaymentLinkResult & {
    paymentId: string;
};
export type VerifyPaymentWebhookInput = {
    provider: PaymentProvider;
    rawBody: string | Uint8Array;
    headers: Headers | Record<string, string | string[] | undefined>;
    secretKey?: string;
    webhookSecret?: string;
};
export type VerifiedPaymentWebhook = {
    provider: PaymentProvider;
    verified: boolean;
    event: string | null;
    reference: string | null;
    status: PaymentStatus;
    providerPaymentId: string | null;
    amount: number | null;
    currency: string | null;
    customer: PaymentCustomer;
    payload: Record<string, unknown>;
};
type ProviderStatusInput = {
    provider: PaymentProvider;
    status?: string | null;
    event?: string | null;
};
export declare function createPaymentLink(input: CreatePaymentLinkInput): Promise<PaymentLinkResult>;
export declare function createStoredPaymentLink(input: StoredPaymentLinkInput): Promise<StoredPaymentLinkResult>;
export declare function verifyPaymentWebhook(input: VerifyPaymentWebhookInput): VerifiedPaymentWebhook;
export declare function mapProviderPaymentStatus(input: ProviderStatusInput): PaymentStatus;
export {};
//# sourceMappingURL=payments.d.ts.map