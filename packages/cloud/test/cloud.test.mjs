import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createClientPadCloudHandler } from "../dist/index.js";

const queries = [];
const adminToken = "admin_secret";
const pepper = "pepper";

const db = {
  async query(text, values = []) {
    queries.push({ text, values });

    if (text === "select 1") return { rows: [{ "?column?": 1 }], rowCount: 1 };

    if (text.includes("from cloud_plans") && text.includes("where active = true") && !text.includes("code =")) {
      return {
        rows: [
          {
            id: "plan_free",
            code: "free",
            name: "Free",
            monthly_price_cents: 0,
            currency: "USD",
            monthly_request_limit: 1000,
            rate_limit_per_minute: 60,
            included_projects: 1,
            features: {},
          },
        ],
        rowCount: 1,
      };
    }

    if (text.includes("from cloud_plans") && text.includes("code =")) {
      return {
        rows: [
          {
            id: "plan_free",
            code: "free",
            name: "Free",
            monthly_price_cents: 0,
            currency: "USD",
            monthly_request_limit: 1000,
            rate_limit_per_minute: 60,
            included_projects: 1,
            features: {},
          },
        ],
        rowCount: 1,
      };
    }

    if (text.includes("select count(*)::int as workspace_count from workspaces")) {
      return { rows: [{ workspace_count: 1 }], rowCount: 1 };
    }

    if (text.includes("select count(*)::int as project_count from cloud_projects") && !text.includes("where workspace_id = $1")) {
      return { rows: [{ project_count: 1 }], rowCount: 1 };
    }

    if (text.includes("select count(*)::int as project_count from cloud_projects where workspace_id = $1")) {
      return { rows: [{ project_count: 1 }], rowCount: 1 };
    }

    if (text.includes("select count(*)::int as key_count from api_keys where revoked_at is null") && !text.includes("workspace_id = $1")) {
      return { rows: [{ key_count: 1 }], rowCount: 1 };
    }

    if (text.includes("select count(*)::int as key_count from api_keys where workspace_id = $1 and revoked_at is null")) {
      return { rows: [{ key_count: 1 }], rowCount: 1 };
    }

    if (text.includes("select count(*)::int as active_subscription_count from cloud_subscriptions where status in ('trialing', 'active')")) {
      return { rows: [{ active_subscription_count: 1 }], rowCount: 1 };
    }

    if (text.includes("select count(*)::int as active_subscription_count from cloud_subscriptions where workspace_id = $1 and status in ('trialing', 'active')")) {
      return { rows: [{ active_subscription_count: 1 }], rowCount: 1 };
    }

    if (text.includes("from whatsapp_conversations") && !text.includes("where workspace_id = $1")) {
      return {
        rows: [
          {
            whatsapp_account_count: 1,
            active_whatsapp_account_count: 1,
            latest_whatsapp_activity_at: "2026-05-12T11:00:00Z",
            recent_webhook_count: 1,
          },
        ],
        rowCount: 1,
      };
    }

    if (text.includes("from whatsapp_conversations") && text.includes("where workspace_id = $1")) {
      return {
        rows: [
          {
            whatsapp_account_count: 1,
            active_whatsapp_account_count: 1,
            latest_whatsapp_activity_at: "2026-05-12T11:00:00Z",
            recent_webhook_count: 1,
          },
        ],
        rowCount: 1,
      };
    }

    if (text.includes("from cloud_billing_events") && !text.includes("where workspace_id = $1")) {
      return {
        rows: [
          {
            payment_provider_count: 1,
            latest_payment_event_at: "2026-05-12T10:30:00Z",
          },
        ],
        rowCount: 1,
      };
    }

    if (text.includes("from cloud_billing_events") && text.includes("where workspace_id = $1")) {
      return {
        rows: [
          {
            payment_provider_count: 1,
            latest_payment_event_at: "2026-05-12T10:30:00Z",
          },
        ],
        rowCount: 1,
      };
    }

    if (text.includes("from workspaces where id = $1 limit 1")) {
      return { rows: [{ id: "workspace_1", name: "Acme Cloud" }], rowCount: 1 };
    }

    if (text.includes("insert into workspaces")) {
      return { rows: [{ id: "workspace_1" }], rowCount: 1 };
    }

    if (text.includes("insert into cloud_projects")) {
      return {
        rows: [
          {
            id: "project_1",
            workspace_id: "workspace_1",
            name: "Ada",
            slug: "ada",
            environment: "production",
            owner_email: "ada@example.com",
            created_at: "2026-05-08T00:00:00Z",
          },
        ],
        rowCount: 1,
      };
    }

    if (text.includes("join cloud_plans")) {
      return {
        rows: [
          {
            id: "plan_free",
            code: "free",
            name: "Free",
            monthly_price_cents: 0,
            currency: "USD",
            monthly_request_limit: 1000,
            rate_limit_per_minute: 60,
            included_projects: 1,
            features: {},
          },
        ],
        rowCount: 1,
      };
    }

    if (text.includes("insert into api_keys")) {
      return { rows: [{ id: "api_key_1" }], rowCount: 1 };
    }

    if (text.includes("from api_keys k")) {
      return {
        rows: [
          {
            api_key_id: "api_key_1",
            name: "Hosted key",
            billing_mode: "cloud_free",
            monthly_request_limit: 1000,
            rate_limit_per_minute: 60,
            request_count: 12,
            rejected_count: 1,
          },
        ],
        rowCount: 1,
      };
    }

    return { rows: [], rowCount: 0 };
  },
};

const handler = createClientPadCloudHandler({ db, adminToken, apiKeyPepper: pepper });

const health = await handler(new Request("https://cloud.example.com/api/cloud/v1/health"));
assert.equal(health.status, 200);

const plans = await handler(new Request("https://cloud.example.com/api/cloud/v1/plans"));
assert.equal(plans.status, 200);
assert.equal((await plans.json()).data[0].code, "free");

const unauthorized = await handler(new Request("https://cloud.example.com/api/cloud/v1/projects"));
assert.equal(unauthorized.status, 401);

const project = await handler(
  new Request("https://cloud.example.com/api/cloud/v1/projects", {
    method: "POST",
    headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
    body: JSON.stringify({ name: "Ada", owner_email: "ada@example.com", plan_code: "free" }),
  })
);
assert.equal(project.status, 201);
assert.equal((await project.json()).data.workspace_id, "workspace_1");

const apiKey = await handler(
  new Request("https://cloud.example.com/api/cloud/v1/api-keys", {
    method: "POST",
    headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
    body: JSON.stringify({ workspace_id: "workspace_1", plan_code: "free" }),
  })
);
assert.equal(apiKey.status, 201);
const apiKeyBody = await apiKey.json();
assert.equal(apiKeyBody.data.billing_mode, "cloud_free");
assert.equal(apiKeyBody.data.monthly_request_limit, 1000);
assert.equal(apiKeyBody.data.rate_limit_per_minute, 60);
assert.equal(apiKeyBody.data.key.startsWith("cp_live_"), true);

const expectedHash = createHash("sha256").update(`${pepper}:${apiKeyBody.data.key}`).digest("hex");
assert.equal(queries.some((query) => query.values.includes(expectedHash)), true);

const usage = await handler(
  new Request("https://cloud.example.com/api/cloud/v1/usage?workspace_id=workspace_1", {
    headers: { authorization: `Bearer ${adminToken}` },
  })
);
assert.equal(usage.status, 200);
assert.equal((await usage.json()).data[0].request_count, 12);

const readiness = await handler(
  new Request("https://cloud.example.com/api/cloud/v1/readiness?workspace_id=workspace_1", {
    headers: { authorization: `Bearer ${adminToken}` },
  })
);
assert.equal(readiness.status, 200);
const readinessBody = await readiness.json();
assert.equal(readinessBody.status, "ok");
assert.equal(readinessBody.summary.has_public_api_key, true);
assert.equal(readinessBody.workspace.name, "Acme Cloud");
assert.equal(readinessBody.workspace.has_whatsapp_configuration, true);
assert.equal(readinessBody.workspace.has_payment_provider_configuration, true);
