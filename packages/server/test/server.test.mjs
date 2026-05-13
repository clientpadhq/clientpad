import assert from "node:assert/strict";
import { createHash, createHmac } from "node:crypto";
import { createClientPadHandler } from "../dist/index.js";

const rawKey = "cp_test_public123_secret";
const pepper = "pepper";
const keyHash = createHash("sha256").update(`${pepper}:${rawKey}`).digest("hex");
const queries = [];

const db = {
  async query(text, values = []) {
    queries.push({ text, values });

    if (text.includes("from api_keys")) {
      return {
        rows: [
          {
            id: "api_key_1",
            workspace_id: "workspace_1",
            name: "Test key",
            key_hash: keyHash,
            scopes: ["leads:read", "leads:write", "clients:read", "clients:write", "usage:read"],
            billing_mode: "cloud_free",
            monthly_request_limit: 1000,
            rate_limit_per_minute: 60,
          },
        ],
        rowCount: 1,
      };
    }

    if (text.includes("api_key_rate_limit_windows")) {
      return { rows: [{ request_count: 1, allowed: true }], rowCount: 1 };
    }

    if (text.includes("insert into api_key_usage_months")) {
      return { rows: [{ request_count: 1, rejected_count: 0, allowed: true }], rowCount: 1 };
    }

    if (text.includes("from api_key_usage_months")) {
      return { rows: [{ request_count: 12, rejected_count: 1 }], rowCount: 1 };
    }

    if (text.includes("update payments")) {
      return {
        rows: [
          {
            id: "payment_1",
            workspace_id: "workspace_1",
            lead_id: "lead_1",
            provider: values[0],
            provider_reference: values[1],
            amount: 25000,
            currency: "NGN",
            service_item_reference: "brand-identity",
            customer_phone: "+234801",
            customer_name: "Ada",
          },
        ],
        rowCount: 1,
      };
    }

    if (text.includes("from leads")) {
      return { rows: [{ id: "lead_1", workspace_id: "workspace_1", name: "Ada" }], rowCount: 1 };
    }

    if (text.includes("insert into leads")) {
      return { rows: [{ id: "lead_created" }], rowCount: 1 };
    }

    if (text.includes("from clients")) {
      return { rows: [{ id: "client_1", workspace_id: "workspace_1", business_name: "Ada Ventures" }], rowCount: 1 };
    }

    if (text.includes("insert into clients")) {
      return { rows: [{ id: "client_created" }], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  },
};

const handler = createClientPadHandler({ db, apiKeyPepper: pepper });

const leadListResponse = await handler(
  new Request("https://example.com/api/public/v1/leads?limit=10&offset=5&status=new", {
    headers: { authorization: `Bearer ${rawKey}` },
  })
);
assert.equal(leadListResponse.status, 200);
assert.deepEqual(await leadListResponse.json(), {
  data: [{ id: "lead_1", workspace_id: "workspace_1", name: "Ada" }],
  pagination: { limit: 10, offset: 5 },
});

const createLeadResponse = await handler(
  new Request("https://example.com/leads", {
    method: "POST",
    headers: { authorization: `Bearer ${rawKey}`, "content-type": "application/json" },
    body: JSON.stringify({ name: "Ada", phone: "08031234567" }),
  })
);
assert.equal(createLeadResponse.status, 201);
assert.deepEqual(await createLeadResponse.json(), { data: { id: "lead_created" } });

const upsertLeadResponse = await handler(
  new Request("https://example.com/leads/upsert", {
    method: "POST",
    headers: { authorization: `Bearer ${rawKey}`, "content-type": "application/json" },
    body: JSON.stringify({ name: "Ada", phone: "2348031234567" }),
  })
);
assert.equal(upsertLeadResponse.status, 200);
assert.deepEqual(await upsertLeadResponse.json(), { data: { id: "lead_created" } });
assert.equal(queries.some((query) => query.text.includes("on conflict (workspace_id, phone)")), true);

const createClientResponse = await handler(
  new Request("https://example.com/clients", {
    method: "POST",
    headers: { authorization: `Bearer ${rawKey}`, "content-type": "application/json" },
    body: JSON.stringify({ business_name: "Ada Ventures" }),
  })
);
assert.equal(createClientResponse.status, 201);
assert.deepEqual(await createClientResponse.json(), { data: { id: "client_created" } });

const unauthorized = await handler(new Request("https://example.com/leads"));
assert.equal(unauthorized.status, 401);

const invalidStatus = await handler(
  new Request("https://example.com/leads?status=bad", {
    headers: { authorization: `Bearer ${rawKey}` },
  })
);
assert.equal(invalidStatus.status, 400);

const usageResponse = await handler(
  new Request("https://example.com/api/public/v1/usage", {
    headers: { authorization: `Bearer ${rawKey}` },
  })
);
assert.equal(usageResponse.status, 200);
assert.deepEqual(await usageResponse.json(), {
  data: {
    api_key_id: "api_key_1",
    workspace_id: "workspace_1",
    billing_mode: "cloud_free",
    month: new Date().toISOString().slice(0, 7) + "-01",
    request_count: 12,
    rejected_count: 1,
    monthly_request_limit: 1000,
    remaining_requests: 988,
    rate_limit_per_minute: 60,
  },
});

const whatsappHandler = createClientPadHandler({
  db,
  apiKeyPepper: pepper,
  whatsapp: {
    verifyToken: "verify_me",
    accessToken: "meta_access_token",
    phoneNumberId: "phone_number_1",
    clientpadBaseUrl: "https://example.com/api/public/v1",
    clientpadApiKey: rawKey,
    appSecret: "meta_app_secret",
  },
});

const verificationResponse = await whatsappHandler(
  new Request(
    "https://example.com/api/public/v1/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=verify_me&hub.challenge=challenge_123"
  )
);
assert.equal(verificationResponse.status, 200);
assert.equal(await verificationResponse.text(), "challenge_123");

const invalidVerificationResponse = await whatsappHandler(
  new Request(
    "https://example.com/whatsapp/webhook?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=challenge_123"
  )
);
assert.equal(invalidVerificationResponse.status, 403);

const unsignedWhatsAppResponse = await whatsappHandler(
  new Request("https://example.com/whatsapp/webhook", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ object: "whatsapp_business_account" }),
  })
);
assert.equal(unsignedWhatsAppResponse.status, 401);

const signedBody = JSON.stringify({ object: "whatsapp_business_account" });
const invalidSignedWhatsAppResponse = await whatsappHandler(
  new Request("https://example.com/whatsapp/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-hub-signature-256": `sha256=${createHmac("sha256", "wrong_secret").update(signedBody).digest("hex")}`,
    },
    body: signedBody,
  })
);
assert.equal(invalidSignedWhatsAppResponse.status, 401);

assert.equal(queries.some((query) => query.text.includes("last_used_at")), true);
assert.equal(queries.some((query) => query.text.includes("api_key_audit_events")), true);
assert.equal(queries.some((query) => query.text.includes("api_key_usage_events")), true);

const limitedDb = {
  async query(text) {
    if (text.includes("from api_keys")) {
      return {
        rows: [
          {
            id: "api_key_limited",
            workspace_id: "workspace_1",
            name: "Limited key",
            key_hash: keyHash,
            scopes: ["leads:read"],
            billing_mode: "cloud_free",
            monthly_request_limit: 1,
            rate_limit_per_minute: null,
          },
        ],
        rowCount: 1,
      };
    }

    if (text.includes("insert into api_key_usage_months")) {
      return { rows: [{ request_count: 2, rejected_count: 0 }], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  },
};

const limitedHandler = createClientPadHandler({ db: limitedDb, apiKeyPepper: pepper });
const limitedResponse = await limitedHandler(
  new Request("https://example.com/api/public/v1/leads", {
    headers: { authorization: `Bearer ${rawKey}` },
  })
);
assert.equal(limitedResponse.status, 429);
assert.deepEqual(await limitedResponse.json(), {
  error: { message: "API key monthly quota exceeded." },
});

const paymentMessages = [];
const reviewRequests = [];
const paymentHandler = createClientPadHandler({
  db,
  apiKeyPepper: pepper,
  payments: {
    paystackSecretKey: "sk_test",
    async sendWhatsAppMessage(message) {
      paymentMessages.push(message);
    },
    async triggerReviewRequest(payment) {
      reviewRequests.push(payment);
    },
  },
});
const paymentWebhookRaw = JSON.stringify({
  event: "charge.success",
  data: {
    status: "success",
    reference: "paystack_ref_1",
    id: 12345,
    amount: 2500000,
    currency: "NGN",
    customer: { email: "ada@example.com" },
  },
});
const paymentWebhookSignature = createHmac("sha512", "sk_test").update(paymentWebhookRaw).digest("hex");
const paymentWebhookResponse = await paymentHandler(
  new Request("https://example.com/payments/paystack/webhook", {
    method: "POST",
    headers: { "x-paystack-signature": paymentWebhookSignature, "content-type": "application/json" },
    body: paymentWebhookRaw,
  })
);
assert.equal(paymentWebhookResponse.status, 200);
assert.deepEqual(await paymentWebhookResponse.json(), { received: true });
assert.equal(queries.some((query) => query.text.includes("update payments") && query.values[2] === "paid"), true);
assert.equal(queries.some((query) => query.text.includes("set status = 'paid'")), true);
assert.equal(paymentMessages.length, 1);
assert.equal(reviewRequests.length, 1);

const invalidPaymentWebhookResponse = await paymentHandler(
  new Request("https://example.com/payments/paystack/webhook", {
    method: "POST",
    headers: { "x-paystack-signature": "bad", "content-type": "application/json" },
    body: paymentWebhookRaw,
  })
);
assert.equal(invalidPaymentWebhookResponse.status, 401);

const flutterwaveWebhookRaw = JSON.stringify({
  event: "charge.completed",
  data: {
    status: "successful",
    tx_ref: "flw_ref_1",
    id: 67890,
    amount: 50000,
    currency: "NGN",
    customer: { email: "bob@example.com" },
  },
});
const flutterwaveHandler = createClientPadHandler({
  db,
  apiKeyPepper: pepper,
  payments: {
    flutterwaveWebhookSecret: "fw_secret",
  },
});
const flutterwaveWebhookResponse = await flutterwaveHandler(
  new Request("https://example.com/payments/flutterwave/webhook", {
    method: "POST",
    headers: { "verif-hash": "fw_secret", "content-type": "application/json" },
    body: flutterwaveWebhookRaw,
  })
);
assert.equal(flutterwaveWebhookResponse.status, 200);
assert.deepEqual(await flutterwaveWebhookResponse.json(), { received: true });

// WhatsApp Inbox API tests
const inboxDb = {
  async query(text, values = []) {
    queries.push({ text, values });
    if (text.includes("from api_keys")) {
      return {
        rows: [{
          id: "api_key_inbox",
          workspace_id: "workspace_1",
          name: "Inbox key",
          key_hash: keyHash,
          scopes: ["leads:read", "leads:write", "whatsapp:read", "whatsapp:write"],
          billing_mode: "cloud_free",
          monthly_request_limit: 1000,
          rate_limit_per_minute: 60,
        }],
        rowCount: 1,
      };
    }
    if (text.includes("api_key_rate_limit_windows")) return { rows: [{ request_count: 1, allowed: true }], rowCount: 1 };
    if (text.includes("insert into api_key_usage_months")) return { rows: [{ request_count: 1, rejected_count: 0, allowed: true }], rowCount: 1 };

    if (text.includes("from whatsapp_messages")) {
      return {
        rows: [{ id: "msg_1", conversation_id: "conv_1", direction: "inbound", message_text: "Hi" }],
        rowCount: 1,
      };
    }

    if (text.includes("select") && text.includes("whatsapp_conversations")) {
      if (text.includes("limit")) {
        return {
          rows: [{ id: "conv_1", contact_name: "Ada", status: "open", last_message_at: new Date().toISOString() }],
          rowCount: 1,
        };
      }
      if (values[0] !== "conv_1") {
        return { rows: [], rowCount: 0 };
      }
      if (text.includes("select phone, lead_id, metadata from whatsapp_conversations")) {
        return {
          rows: [{ id: "conv_1", workspace_id: "workspace_1", phone: "+234123", metadata: { ai: { suggestedReplies: [{ body: "AI reply" }] } } }],
          rowCount: 1,
        };
      }
      // This handles getting conversation details, including AI metadata
      if (text.includes("metadata->'ai'->'suggestedReplies'")) {
        return {
          rows: [{ id: "conv_1", workspace_id: "workspace_1", phone: "+234123", suggestions: [{ body: "AI reply" }], safety: {} }],
          rowCount: 1,
        };
      }
      // Default for other whatsapp_conversations queries if not specific enough
      return {
        rows: [{ id: "conv_1", workspace_id: "workspace_1", phone: "+234123", metadata: {} }],
        rowCount: 1,
      };
    }

    if (text.includes("insert into whatsapp_messages")) {
      return { rows: [{ id: "msg_sent" }], rowCount: 1 };
    }

    return { rows: [], rowCount: 0 };
  }
};

const inboxHandler = createClientPadHandler({ db: inboxDb, apiKeyPepper: pepper });

const listConversationsResponse = await inboxHandler(
  new Request("https://example.com/api/public/v1/whatsapp/conversations", {
    headers: { authorization: `Bearer ${rawKey}` },
  })
);
assert.equal(listConversationsResponse.status, 200);
const listData = await listConversationsResponse.json();
assert.equal(listData.data[0].id, "conv_1");

const convMessagesResponse = await inboxHandler(
  new Request("https://example.com/api/public/v1/whatsapp/conversations/conv_1/messages", {
    headers: { authorization: `Bearer ${rawKey}` },
  })
);
assert.equal(convMessagesResponse.status, 200);
const msgData = await convMessagesResponse.json();
assert.equal(msgData.data[0].message_text, "Hi");

const suggestionsResponse = await inboxHandler(
  new Request("https://example.com/api/public/v1/whatsapp/conversations/conv_1/suggestions", {
    headers: { authorization: `Bearer ${rawKey}` },
  })
);
assert.equal(suggestionsResponse.status, 200);
const sugData = await suggestionsResponse.json();
assert.equal(sugData.data.suggestions[0].body, "AI reply");

const replyResponse = await inboxHandler(
  new Request("https://example.com/api/public/v1/whatsapp/conversations/conv_1/reply", {
    method: "POST",
    headers: { authorization: `Bearer ${rawKey}`, "content-type": "application/json" },
    body: JSON.stringify({ message_text: "Hello", send: false }),
  })
);
assert.equal(replyResponse.status, 200);
assert.deepEqual(await replyResponse.json(), { data: { id: "msg_sent", meta_message_id: null } });

const approveResponse = await inboxHandler(
  new Request("https://example.com/api/public/v1/whatsapp/conversations/conv_1/approve-suggestion", {
    method: "POST",
    headers: { authorization: `Bearer ${rawKey}`, "content-type": "application/json" },
    body: JSON.stringify({ suggestion_index: 0, send: false }),
  })
);
assert.equal(approveResponse.status, 200);

const statusResponse = await inboxHandler(
  new Request("https://example.com/api/public/v1/whatsapp/conversations/conv_1/status", {
    method: "POST",
    headers: { authorization: `Bearer ${rawKey}`, "content-type": "application/json" },
    body: JSON.stringify({ status: "closed" }),
  })
);
assert.equal(statusResponse.status, 200);
assert.equal(queries.some(q => q.text.includes("update whatsapp_conversations set status = $1")), true);

// Workspace permission test
const wrongWorkspaceResponse = await inboxHandler(
  new Request("https://example.com/api/public/v1/whatsapp/conversations/wrong_id", {
    headers: { authorization: `Bearer ${rawKey}` },
  })
);
assert.equal(wrongWorkspaceResponse.status, 404); // Mock DB returns empty for other IDs
