import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createClientPadCloudHandler } from "../dist/index.js";

const queries = [];
const adminToken = "admin_secret";
const pepper = "pepper";

let operatorUser = null;
let workspaceRecord = null;
let currentSession = null;
let revokedSession = false;

const db = {
  async query(text, values = []) {
    queries.push({ text, values });

    if (text === "select 1") return { rows: [{ "?column?": 1 }], rowCount: 1 };

    if (text.includes("count(distinct users.id)::int as operator_count")) {
      return { rows: [{ operator_count: operatorUser ? 1 : 0, workspace_count: workspaceRecord ? 1 : 0 }], rowCount: 1 };
    }

    if (text.includes("from users where lower(email) = lower($1)")) {
      if (operatorUser && String(values[0]).toLowerCase() === operatorUser.email.toLowerCase()) {
        return {
          rows: [{ ...operatorUser, password_hash: operatorUser.password_hash }],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    }

    if (text.includes("insert into users")) {
      operatorUser = {
        id: "user_1",
        email: values[0],
        full_name: values[1],
        password_hash: values[2],
      };
      return { rows: [{ id: operatorUser.id, email: operatorUser.email, full_name: operatorUser.full_name }], rowCount: 1 };
    }

    if (text.includes("insert into workspaces")) {
      workspaceRecord = {
        id: "workspace_1",
        name: values[0],
        phone: values[1] ?? null,
        business_type: values[2] ?? null,
        default_currency: values[3] ?? "NGN",
        created_by: values[4] ?? null,
      };
      return {
        rows: [
          {
            id: workspaceRecord.id,
            name: workspaceRecord.name,
            phone: workspaceRecord.phone,
            business_type: workspaceRecord.business_type,
            default_currency: workspaceRecord.default_currency,
            created_by: workspaceRecord.created_by,
            created_at: "2026-05-08T00:00:00Z",
            updated_at: "2026-05-08T00:00:00Z",
          },
        ],
        rowCount: 1,
      };
    }

    if (text.includes("insert into workspace_members")) {
      return { rows: [], rowCount: 1 };
    }

    if (text.includes("insert into operator_sessions")) {
      currentSession = {
        id: "session_1",
        session_hash: values[1],
        expires_at: values[2],
        user_id: operatorUser?.id ?? "user_1",
      };
      revokedSession = false;
      return { rows: [{ id: currentSession.id, expires_at: currentSession.expires_at }], rowCount: 1 };
    }

    if (text.includes("from operator_sessions s") && text.includes("join users u on u.id = s.user_id")) {
      if (currentSession && !revokedSession && values[0] === currentSession.session_hash) {
        return {
          rows: [
            {
              id: currentSession.id,
              user_id: currentSession.user_id,
              expires_at: currentSession.expires_at,
              email: operatorUser?.email ?? "operator@example.com",
              full_name: operatorUser?.full_name ?? "Alex Developer",
            },
          ],
          rowCount: 1,
        };
      }
      return { rows: [], rowCount: 0 };
    }

    if (text.includes("update operator_sessions set revoked_at = now()")) {
      revokedSession = true;
      return { rows: [], rowCount: 1 };
    }

    if (text.includes("from workspace_members m") && text.includes("join workspaces w on w.id = m.workspace_id")) {
      if (!operatorUser || !workspaceRecord) return { rows: [], rowCount: 0 };
      return {
        rows: [
          {
            id: workspaceRecord.id,
            name: workspaceRecord.name,
            role: "owner",
            project_count: 1,
            key_count: 1,
            active_subscription_count: 1,
            whatsapp_account_count: 1,
            active_whatsapp_account_count: 1,
            payment_provider_count: 1,
            latest_whatsapp_activity_at: "2026-05-12T11:00:00Z",
            latest_payment_event_at: "2026-05-12T10:30:00Z",
            recent_webhook_count: 1,
            has_public_api_key: true,
            has_whatsapp_configuration: true,
            has_payment_provider_configuration: true,
          },
        ],
        rowCount: 1,
      };
    }

    if (text.includes("select role from workspace_members where user_id = $1 and workspace_id = $2 limit 1")) {
      return { rows: [{ role: "owner" }], rowCount: 1 };
    }

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

    if (text.includes("select count(*)::int as workspace_count from workspaces where id = any($1::uuid[])")) {
      return { rows: [{ workspace_count: 1 }], rowCount: 1 };
    }

    if (text.includes("select count(*)::int as workspace_count from workspaces")) {
      return { rows: [{ workspace_count: workspaceRecord ? 1 : 0 }], rowCount: 1 };
    }

    if (text.includes("select count(*)::int as project_count from cloud_projects where workspace_id = any($1::uuid[])")) {
      return { rows: [{ project_count: 1 }], rowCount: 1 };
    }

    if (text.includes("select count(*)::int as project_count from cloud_projects where workspace_id = $1")) {
      return { rows: [{ project_count: 1 }], rowCount: 1 };
    }

    if (text.includes("select count(*)::int as project_count from cloud_projects")) {
      return { rows: [{ project_count: workspaceRecord ? 1 : 0 }], rowCount: 1 };
    }

    if (text.includes("select count(*)::int as key_count from api_keys where revoked_at is null and workspace_id = any($1::uuid[])")) {
      return { rows: [{ key_count: 1 }], rowCount: 1 };
    }

    if (text.includes("select count(*)::int as key_count from api_keys where workspace_id = $1 and revoked_at is null")) {
      return { rows: [{ key_count: 1 }], rowCount: 1 };
    }

    if (text.includes("select count(*)::int as key_count from api_keys where revoked_at is null")) {
      return { rows: [{ key_count: workspaceRecord ? 1 : 0 }], rowCount: 1 };
    }

    if (text.includes("select count(*)::int as active_subscription_count from cloud_subscriptions where status in ('trialing', 'active') and workspace_id = any($1::uuid[])")) {
      return { rows: [{ active_subscription_count: 1 }], rowCount: 1 };
    }

    if (text.includes("select count(*)::int as active_subscription_count from cloud_subscriptions where workspace_id = $1 and status in ('trialing', 'active')")) {
      return { rows: [{ active_subscription_count: 1 }], rowCount: 1 };
    }

    if (text.includes("select count(*)::int as active_subscription_count from cloud_subscriptions where status in ('trialing', 'active')")) {
      return { rows: [{ active_subscription_count: workspaceRecord ? 1 : 0 }], rowCount: 1 };
    }

    if (text.includes("from whatsapp_conversations") && text.includes("workspace_id = any($1::uuid[])")) {
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

    if (text.includes("from whatsapp_conversations") && !text.includes("where workspace_id =")) {
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

    if (text.includes("from cloud_billing_events") && text.includes("workspace_id = any($1::uuid[])")) {
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

    if (text.includes("from cloud_billing_events") && !text.includes("where workspace_id =")) {
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

    if (text.includes("from workspaces") && text.includes("where id = $1") && text.includes("limit 1")) {
      return workspaceRecord
        ? {
            rows: [
              {
                id: workspaceRecord.id,
                name: workspaceRecord.name,
                phone: workspaceRecord.phone,
                business_type: workspaceRecord.business_type,
                default_currency: workspaceRecord.default_currency,
                created_by: workspaceRecord.created_by,
                created_at: "2026-05-08T00:00:00Z",
                updated_at: "2026-05-08T00:00:00Z",
              },
            ],
            rowCount: 1,
          }
        : { rows: [], rowCount: 0 };
    }

    if (text.includes("from workspaces w") && text.includes("left join cloud_subscriptions s")) {
      return {
        rows: [
          {
            workspace_id: workspaceRecord?.id ?? "workspace_1",
            workspace_name: workspaceRecord?.name ?? "Acme Cloud",
            plan_code: "free",
            plan_name: "Free",
            month: "2026-05-01",
            request_count: 0,
            rejected_count: 0,
            active_api_key_count: 1,
            monthly_request_limit: 1000,
            rate_limit_per_minute: 60,
            remaining_requests: 1000,
            last_used_at: null,
            billing_mode: "cloud_free",
          },
        ],
        rowCount: 1,
      };
    }

    if (text.includes("insert into cloud_projects")) {
      return {
        rows: [
          {
            id: "project_1",
            workspace_id: values[0] ?? workspaceRecord?.id ?? "workspace_1",
            name: values[1],
            slug: values[2],
            environment: values[3],
            owner_email: values[4],
            created_at: "2026-05-08T00:00:00Z",
          },
        ],
        rowCount: 1,
      };
    }

    if (text.includes("insert into api_keys")) {
      const fakeKey = "cp_live_demo123_generated_secret_444f";
      return { rows: [{ id: "api_key_1", key: fakeKey, scopes: ["usage:read"], billing_mode: "cloud_free", monthly_request_limit: 1000, rate_limit_per_minute: 60 }], rowCount: 1 };
    }

    if (text.includes("select") && text.includes("coalesce(sum(u.request_count), 0)::int as request_count") && text.includes("from api_keys k") && text.includes("left join api_key_usage_months u")) {
      return {
        rows: [
          {
            request_count: 12,
            rejected_count: 1,
            active_api_key_count: 1,
            last_used_at: "2026-05-12T11:00:00Z",
          },
        ],
        rowCount: 1,
      };
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

const authStatus = await handler(new Request("https://cloud.example.com/api/cloud/v1/auth/status"));
assert.equal(authStatus.status, 200);
const authStatusBody = await authStatus.json();
assert.equal(authStatusBody.registration_open, true);
assert.equal(authStatusBody.first_operator_setup_required, true);

const unauthorized = await handler(new Request("https://cloud.example.com/api/cloud/v1/projects"));
assert.equal(unauthorized.status, 401);

const register = await handler(
  new Request("https://cloud.example.com/api/cloud/v1/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      email: "operator@clientpad.com",
      password: "Password123!",
      full_name: "Alex Developer",
      workspace_name: "Acme Cloud",
    }),
  })
);
assert.equal(register.status, 200);
const registerBody = await register.json();
assert.equal(registerBody.auth.user.email, "operator@clientpad.com");
assert.equal(registerBody.auth.workspaces[0].name, "Acme Cloud");
assert.equal(registerBody.bootstrap.project.name, "Acme Cloud API");
assert.equal(registerBody.bootstrap.api_key.key.startsWith("cp_live_"), true);
assert.equal(register.headers.get("set-cookie")?.includes("clientpad_operator_session"), true);

const cookie = register.headers.get("set-cookie")?.split(";")[0];
assert.equal(Boolean(cookie), true);

const me = await handler(
  new Request("https://cloud.example.com/api/cloud/v1/auth/me", {
    headers: { cookie },
  })
);
assert.equal(me.status, 200);
const meBody = await me.json();
assert.equal(meBody.auth.user.email, "operator@clientpad.com");
assert.equal(meBody.auth.workspaces[0].name, "Acme Cloud");

const workspaces = await handler(
  new Request("https://cloud.example.com/api/cloud/v1/workspaces", {
    headers: { cookie },
  })
);
assert.equal(workspaces.status, 200);
assert.equal((await workspaces.json()).data[0].name, "Acme Cloud");

const loginFailure = await handler(
  new Request("https://cloud.example.com/api/cloud/v1/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "operator@clientpad.com", password: "wrong" }),
  })
);
assert.equal(loginFailure.status, 401);

const project = await handler(
  new Request("https://cloud.example.com/api/cloud/v1/projects", {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ name: "Ada", owner_email: "ada@example.com", plan_code: "free", workspace_id: "workspace_1" }),
  })
);
assert.equal(project.status, 201);
assert.equal((await project.json()).data.workspace_id, "workspace_1");

const apiKey = await handler(
  new Request("https://cloud.example.com/api/cloud/v1/api-keys", {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({ workspace_id: "workspace_1", plan_code: "free" }),
  })
);
assert.equal(apiKey.status, 201);
const apiKeyBody = await apiKey.json();
assert.equal(apiKeyBody.data.billing_mode, "cloud_free");
assert.equal(apiKeyBody.data.monthly_request_limit, 1000);
assert.equal(apiKeyBody.data.rate_limit_per_minute, 60);
assert.equal(apiKeyBody.data.key.startsWith("cp_live_"), true);

const bootstrap = await handler(
  new Request("https://cloud.example.com/api/cloud/v1/workspaces/bootstrap", {
    method: "POST",
    headers: { cookie, "content-type": "application/json" },
    body: JSON.stringify({
      workspace_id: "workspace_1",
      workspace_name: "Acme Cloud",
      project_name: "Acme Cloud API",
      api_key_name: "Starter API key",
      plan_code: "free",
    }),
  })
);
assert.equal(bootstrap.status, 201);
const bootstrapBody = await bootstrap.json();
assert.equal(bootstrapBody.data.workspace.name, "Acme Cloud");
assert.equal(bootstrapBody.data.project.workspace_id, "workspace_1");
assert.equal(bootstrapBody.data.api_key.key.startsWith("cp_live_"), true);

const expectedHash = createHash("sha256").update(`${pepper}:${apiKeyBody.data.key}`).digest("hex");
assert.equal(queries.some((query) => query.values.includes(expectedHash)), true);

const usage = await handler(
  new Request("https://cloud.example.com/api/cloud/v1/usage?workspace_id=workspace_1", {
    headers: { cookie },
  })
);
assert.equal(usage.status, 200);
assert.equal((await usage.json()).data[0].request_count, 12);

const usageSummary = await handler(
  new Request("https://cloud.example.com/api/cloud/v1/usage/summary?workspace_id=workspace_1", {
    headers: { cookie },
  })
);
assert.equal(usageSummary.status, 200);
const usageSummaryBody = await usageSummary.json();
assert.equal(usageSummaryBody.data.workspace_id, "workspace_1");
assert.equal(usageSummaryBody.data.active_api_key_count, 1);

const readiness = await handler(
  new Request("https://cloud.example.com/api/cloud/v1/readiness?workspace_id=workspace_1", {
    headers: { cookie },
  })
);
assert.equal(readiness.status, 200);
const readinessBody = await readiness.json();
assert.equal(readinessBody.status, "ok");
assert.equal(readinessBody.summary.has_public_api_key, true);
assert.equal(readinessBody.workspace.name, "Acme Cloud");
assert.equal(readinessBody.workspace.has_whatsapp_configuration, true);
assert.equal(readinessBody.workspace.has_payment_provider_configuration, true);

const logout = await handler(
  new Request("https://cloud.example.com/api/cloud/v1/auth/logout", {
    method: "POST",
    headers: { cookie },
  })
);
assert.equal(logout.status, 200);
assert.equal(logout.headers.get("set-cookie")?.includes("Expires=Thu, 01 Jan 1970"), true);

const meAfterLogout = await handler(
  new Request("https://cloud.example.com/api/cloud/v1/auth/me", {
    headers: { cookie },
  })
);
assert.equal(meAfterLogout.status, 401);
