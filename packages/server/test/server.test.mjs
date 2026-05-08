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
    body: JSON.stringify({ name: "Ada", phone: "+234" }),
  })
);
assert.equal(createLeadResponse.status, 201);
assert.deepEqual(await createLeadResponse.json(), { data: { id: "lead_created" } });

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
