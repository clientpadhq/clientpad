import assert from "node:assert/strict";
import { createHash } from "node:crypto";
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
            scopes: ["leads:read", "leads:write", "clients:read", "clients:write"],
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

assert.equal(queries.some((query) => query.text.includes("last_used_at")), true);
assert.equal(queries.some((query) => query.text.includes("api_key_audit_events")), true);
