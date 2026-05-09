import { createHmac, timingSafeEqual } from "node:crypto";
export async function createPaymentLink(input) {
    if (input.provider === "paystack")
        return createPaystackPaymentLink(input);
    if (input.provider === "flutterwave")
        return createFlutterwavePaymentLink(input);
    throw new Error(`Unsupported payment provider: ${String(input.provider)}`);
}
export async function createStoredPaymentLink(input) {
    const link = await createPaymentLink(input);
    const { rows } = await input.db.query(`
      insert into payments (
        workspace_id,
        lead_id,
        provider,
        provider_reference,
        provider_payment_id,
        status,
        amount,
        currency,
        service_item_reference,
        customer_phone,
        customer_name,
        payment_url,
        metadata
      )
      values ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9, $10, $11, $12)
      returning id
    `, [
        input.workspaceId,
        input.leadId,
        link.provider,
        link.reference,
        link.providerPaymentId ?? null,
        input.amount,
        normalizeCurrency(input.currency),
        input.serviceItemReference,
        input.customer.phone ?? "",
        input.customer.name ?? "",
        link.authorizationUrl,
        input.metadata ?? {},
    ]);
    return { ...link, paymentId: rows[0]?.id ?? "" };
}
export function verifyPaymentWebhook(input) {
    const rawBody = stringifyRawBody(input.rawBody);
    const payload = parseWebhookPayload(rawBody);
    if (input.provider === "paystack") {
        const secretKey = input.secretKey ?? process.env.PAYSTACK_SECRET_KEY;
        const signature = getHeader(input.headers, "x-paystack-signature");
        const verified = Boolean(secretKey && signature && safeEqualHex(hmacSha512(secretKey, rawBody), signature));
        return extractPaystackWebhook(payload, verified);
    }
    if (input.provider === "flutterwave") {
        const secret = input.webhookSecret ?? process.env.FLUTTERWAVE_WEBHOOK_SECRET ?? input.secretKey ?? process.env.FLUTTERWAVE_SECRET_KEY;
        const signature = getHeader(input.headers, "verif-hash") ?? getHeader(input.headers, "x-flutterwave-signature");
        const verified = Boolean(secret && signature && safeEqualText(secret, signature));
        return extractFlutterwaveWebhook(payload, verified);
    }
    throw new Error(`Unsupported payment provider: ${String(input.provider)}`);
}
export function mapProviderPaymentStatus(input) {
    const status = (input.status ?? "").toLowerCase();
    const event = (input.event ?? "").toLowerCase();
    if (input.provider === "paystack") {
        if (status === "success" || event === "charge.success")
            return "paid";
        if (["failed", "reversed", "abandoned"].includes(status))
            return "failed";
        return "pending";
    }
    if (input.provider === "flutterwave") {
        if (["successful", "success", "completed"].includes(status) || event === "charge.completed")
            return "paid";
        if (["failed", "error"].includes(status))
            return "failed";
        if (["cancelled", "canceled"].includes(status))
            return "cancelled";
        return "pending";
    }
    return "pending";
}
async function createPaystackPaymentLink(input) {
    const secretKey = input.secretKey ?? process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey)
        throw new Error("PAYSTACK_SECRET_KEY is required to create Paystack payment links.");
    const email = requireCustomerEmail(input.customer);
    const clientFetch = input.fetchImpl ?? fetch;
    const response = await clientFetch("https://api.paystack.co/transaction/initialize", {
        method: "POST",
        headers: {
            authorization: `Bearer ${secretKey}`,
            "content-type": "application/json",
        },
        body: JSON.stringify({
            email,
            amount: toMinorUnit(input.amount),
            currency: normalizeCurrency(input.currency),
            reference: input.reference,
            callback_url: input.callbackUrl ?? input.redirectUrl ?? undefined,
            metadata: {
                service_item_reference: input.serviceItemReference,
                customer_phone: input.customer.phone ?? undefined,
                customer_name: input.customer.name ?? undefined,
                ...input.metadata,
            },
        }),
    });
    const body = (await response.json().catch(() => ({})));
    if (!response.ok || body.status === false)
        throw new Error(readProviderError(body, "Paystack payment link creation failed."));
    const data = readObject(body.data);
    const authorizationUrl = readString(data.authorization_url);
    if (!authorizationUrl)
        throw new Error("Paystack did not return an authorization URL.");
    return {
        provider: "paystack",
        reference: readString(data.reference) ?? input.reference,
        authorizationUrl,
        accessCode: readString(data.access_code),
        providerPaymentId: readString(data.id),
        raw: body,
    };
}
async function createFlutterwavePaymentLink(input) {
    const secretKey = input.secretKey ?? process.env.FLUTTERWAVE_SECRET_KEY;
    if (!secretKey)
        throw new Error("FLUTTERWAVE_SECRET_KEY is required to create Flutterwave payment links.");
    const email = requireCustomerEmail(input.customer);
    const clientFetch = input.fetchImpl ?? fetch;
    const response = await clientFetch("https://api.flutterwave.com/v3/payments", {
        method: "POST",
        headers: {
            authorization: `Bearer ${secretKey}`,
            "content-type": "application/json",
        },
        body: JSON.stringify({
            tx_ref: input.reference,
            amount: input.amount,
            currency: normalizeCurrency(input.currency),
            redirect_url: input.redirectUrl ?? input.callbackUrl ?? undefined,
            customer: {
                email,
                phonenumber: input.customer.phone ?? undefined,
                name: input.customer.name ?? undefined,
            },
            customizations: {
                title: input.serviceItemReference,
            },
            meta: {
                service_item_reference: input.serviceItemReference,
                ...input.metadata,
            },
        }),
    });
    const body = (await response.json().catch(() => ({})));
    if (!response.ok || readString(body.status)?.toLowerCase() === "error") {
        throw new Error(readProviderError(body, "Flutterwave payment link creation failed."));
    }
    const data = readObject(body.data);
    const authorizationUrl = readString(data.link);
    if (!authorizationUrl)
        throw new Error("Flutterwave did not return a payment link.");
    return {
        provider: "flutterwave",
        reference: input.reference,
        authorizationUrl,
        providerPaymentId: readString(data.id),
        raw: body,
    };
}
function extractPaystackWebhook(payload, verified) {
    const data = readObject(payload.data);
    const customer = readObject(data.customer);
    const status = mapProviderPaymentStatus({ provider: "paystack", status: readString(data.status), event: readString(payload.event) });
    return {
        provider: "paystack",
        verified,
        event: readString(payload.event),
        reference: readString(data.reference),
        status,
        providerPaymentId: readString(data.id),
        amount: readNumber(data.amount),
        currency: readString(data.currency),
        customer: {
            email: readString(customer.email),
            phone: readString(customer.phone),
            name: [readString(customer.first_name), readString(customer.last_name)].filter(Boolean).join(" ") || null,
        },
        payload,
    };
}
function extractFlutterwaveWebhook(payload, verified) {
    const data = readObject(payload.data);
    const customer = readObject(data.customer);
    const status = mapProviderPaymentStatus({ provider: "flutterwave", status: readString(data.status), event: readString(payload.event) });
    return {
        provider: "flutterwave",
        verified,
        event: readString(payload.event),
        reference: readString(data.tx_ref) ?? readString(data.flw_ref),
        status,
        providerPaymentId: readString(data.id) ?? readString(data.flw_ref),
        amount: readNumber(data.amount),
        currency: readString(data.currency),
        customer: {
            email: readString(customer.email),
            phone: readString(customer.phone_number) ?? readString(customer.phonenumber),
            name: readString(customer.name),
        },
        payload,
    };
}
function normalizeCurrency(currency) {
    return (currency?.trim() || "NGN").toUpperCase();
}
function requireCustomerEmail(customer) {
    const email = customer.email?.trim();
    if (!email)
        throw new Error("customer.email is required by Paystack and Flutterwave checkout APIs.");
    return email;
}
function toMinorUnit(amount) {
    if (!Number.isFinite(amount) || amount <= 0)
        throw new Error("amount must be a positive number.");
    return Math.round(amount * 100);
}
function stringifyRawBody(rawBody) {
    return typeof rawBody === "string" ? rawBody : new TextDecoder().decode(rawBody);
}
function parseWebhookPayload(rawBody) {
    const parsed = JSON.parse(rawBody);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
        throw new Error("Webhook body must be a JSON object.");
    return parsed;
}
function getHeader(headers, name) {
    if (headers instanceof Headers)
        return headers.get(name);
    const wanted = name.toLowerCase();
    for (const [key, value] of Object.entries(headers)) {
        if (key.toLowerCase() !== wanted)
            continue;
        if (Array.isArray(value))
            return value[0] ?? null;
        return value ?? null;
    }
    return null;
}
function hmacSha512(secret, body) {
    return createHmac("sha512", secret).update(body).digest("hex");
}
function safeEqualHex(expected, actual) {
    return safeEqualText(expected.toLowerCase(), actual.toLowerCase());
}
function safeEqualText(expected, actual) {
    const expectedBytes = new TextEncoder().encode(expected);
    const actualBytes = new TextEncoder().encode(actual);
    return expectedBytes.byteLength === actualBytes.byteLength && timingSafeEqual(expectedBytes, actualBytes);
}
function readObject(value) {
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}
function readString(value) {
    if (typeof value === "string" && value.trim())
        return value;
    if (typeof value === "number" && Number.isFinite(value))
        return String(value);
    return null;
}
function readNumber(value) {
    if (typeof value === "number" && Number.isFinite(value))
        return value;
    if (typeof value === "string" && value.trim() && Number.isFinite(Number(value)))
        return Number(value);
    return null;
}
function readProviderError(body, fallback) {
    return readString(body.message) ?? readString(readObject(body.error).message) ?? fallback;
}
//# sourceMappingURL=payments.js.map