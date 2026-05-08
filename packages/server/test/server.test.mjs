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
