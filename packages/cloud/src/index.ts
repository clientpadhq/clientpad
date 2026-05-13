import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { Pool } from "pg";
import { API_SCOPES, type ApiScope, type ApiKeyBillingMode } from "@clientpad/core";

export type QueryValue = string | number | boolean | Date | null | string[] | Record<string, unknown>;

export type QueryResult<T> = {
  rows: T[];
  rowCount: number | null;
};

export type Queryable = {
  query<T = Record<string, unknown>>(text: string, values?: QueryValue[]): Promise<QueryResult<T>>;
};

export type ClientPadCloudConfig = {
  databaseUrl?: string;
  apiKeyPepper: string;
  adminToken: string;
  db?: Queryable;
};

export type ClientPadCloudHandler = (request: Request) => Promise<Response>;

type PlanRow = {
  id: string;
  code: string;
  name: string;
  monthly_price_cents: number;
  currency: string;
  monthly_request_limit: number | null;
  rate_limit_per_minute: number | null;
  included_projects: number;
  features: Record<string, unknown>;
};

type ProjectRow = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  environment: string;
  owner_email: string | null;
  created_at: string;
};

type SubscriptionRow = {
  id: string;
  workspace_id: string;
  status: string;
  provider: string | null;
  provider_customer_id: string | null;
  provider_subscription_id: string | null;
  plan_code: string;
};

type ReadinessSummary = {
  workspace_count: number;
  project_count: number;
  key_count: number;
  active_subscription_count: number;
  whatsapp_account_count: number;
  active_whatsapp_account_count: number;
  payment_provider_count: number;
  latest_whatsapp_activity_at: string | null;
  latest_payment_event_at: string | null;
  recent_webhook_count: number;
  has_public_api_key: boolean;
  has_whatsapp_configuration: boolean;
  has_payment_provider_configuration: boolean;
};

type ReadinessWorkspace = {
  id: string;
  name: string;
  project_count: number;
  key_count: number;
  active_subscription_count: number;
  whatsapp_account_count: number;
  active_whatsapp_account_count: number;
  payment_provider_count: number;
  latest_whatsapp_activity_at: string | null;
  latest_payment_event_at: string | null;
  recent_webhook_count: number;
  has_public_api_key: boolean;
  has_whatsapp_configuration: boolean;
  has_payment_provider_configuration: boolean;
};

export function createClientPadCloudHandler(config: ClientPadCloudConfig): ClientPadCloudHandler {
  const cloud = new ClientPadCloud(config);
  return cloud.handle.bind(cloud);
}

export class ClientPadCloud {
  private readonly db: Queryable;
  private readonly apiKeyPepper: string;
  private readonly adminToken: string;

  constructor(config: ClientPadCloudConfig) {
    if (!config.apiKeyPepper.trim()) throw new Error("apiKeyPepper is required.");
    if (!config.adminToken.trim()) throw new Error("adminToken is required.");
    if (!config.db && !config.databaseUrl?.trim()) throw new Error("databaseUrl or db is required.");

    this.db = config.db ?? new Pool({ connectionString: config.databaseUrl });
    this.apiKeyPepper = config.apiKeyPepper;
    this.adminToken = config.adminToken;
  }

  async handle(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const path = normalizePath(url.pathname);

      if (path === "/health" && request.method === "GET") return this.health();
      if (path === "/openapi.json" && request.method === "GET") return Response.json(openApiDocument);
      if (path === "/plans" && request.method === "GET") return this.listPlans();

      const auth = this.requireAdmin(request);
      if (auth instanceof Response) return auth;

      if (path === "/projects" && request.method === "GET") return this.listProjects(url);
      if (path === "/projects" && request.method === "POST") return this.createProject(request);
      if (path === "/api-keys" && request.method === "POST") return this.createHostedApiKey(request);
      if (path === "/usage" && request.method === "GET") return this.getUsage(url);
      if (path === "/billing/events" && request.method === "POST") return this.recordBillingEvent(request);
      if (path === "/readiness" && request.method === "GET") return this.getReadiness(url);

      return jsonError("Route not found.", 404);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error.";
      return jsonError(message, 500);
    }
  }

  private async health() {
    await this.db.query("select 1");
    return Response.json({
      status: "ok",
      service: "@clientpad/cloud",
      time: new Date().toISOString(),
    });
  }

  private async getReadiness(url: URL) {
    const workspaceId = optionalString(url.searchParams.get("workspace_id"));
    const [summary, workspace] = await Promise.all([
      this.getReadinessSummary(),
      workspaceId ? this.getReadinessWorkspace(workspaceId) : Promise.resolve(null),
    ]);

    const status = this.readinessStatus(summary, workspace);

    return Response.json({
      status,
      service: "@clientpad/cloud",
      time: new Date().toISOString(),
      auth: { token: "accepted" },
      summary,
      workspace,
      diagnostics: this.buildDiagnostics(summary, workspace, Boolean(workspaceId)),
    });
  }

  private async listPlans() {
    const { rows } = await this.db.query<PlanRow>(
      `
        select
          id,
          code,
          name,
          monthly_price_cents,
          currency,
          monthly_request_limit,
          rate_limit_per_minute,
          included_projects,
          features
        from cloud_plans
        where active = true
        order by monthly_price_cents asc, code asc
      `
    );

    return Response.json({ data: rows });
  }

  private async listProjects(url: URL) {
    const workspaceId = optionalString(url.searchParams.get("workspace_id"));
    const values: QueryValue[] = [];
    let filter = "";
    if (workspaceId) {
      values.push(workspaceId);
      filter = "where workspace_id = $1";
    }

    const { rows } = await this.db.query<ProjectRow>(
      `
        select id, workspace_id, name, slug, environment, owner_email, created_at
        from cloud_projects
        ${filter}
        order by created_at desc
        limit 100
      `,
      values
    );

    return Response.json({ data: rows });
  }

  private async createProject(request: Request) {
    const body = await readJsonObject(request);
    if (body instanceof Response) return body;

    const name = requiredString(body.name, "name");
    const workspaceName = requiredString(body.workspace_name ?? body.name, "workspace_name");
    if (!name.ok) return jsonError(name.error, 400);
    if (!workspaceName.ok) return jsonError(workspaceName.error, 400);

    const ownerEmail = optionalString(body.owner_email);
    const slug = slugify(optionalString(body.slug) ?? name.value);
    const environment = optionalString(body.environment) ?? "production";
    const planCode = optionalString(body.plan_code) ?? "free";

    const plan = await this.getPlanByCode(planCode);
    if (!plan) return jsonError(`Unknown plan: ${planCode}`, 400);

    const workspace = await this.db.query<{ id: string }>(
      `
        insert into workspaces (name)
        values ($1)
        returning id
      `,
      [workspaceName.value]
    );
    const workspaceId = workspace.rows[0]?.id;

    const project = await this.db.query<ProjectRow>(
      `
        insert into cloud_projects (workspace_id, name, slug, environment, owner_email)
        values ($1, $2, $3, $4, $5)
        returning id, workspace_id, name, slug, environment, owner_email, created_at
      `,
      [workspaceId, name.value, slug, environment, ownerEmail]
    );

    await this.db.query(
      `
        insert into cloud_subscriptions (workspace_id, plan_id, status)
        values ($1, $2, 'active')
      `,
      [workspaceId, plan.id]
    );

    return Response.json({ data: project.rows[0] }, { status: 201 });
  }

  private async createHostedApiKey(request: Request) {
    const body = await readJsonObject(request);
    if (body instanceof Response) return body;

    const workspaceId = requiredString(body.workspace_id, "workspace_id");
    if (!workspaceId.ok) return jsonError(workspaceId.error, 400);

    const name = optionalString(body.name) ?? "Hosted API key";
    const planCode = optionalString(body.plan_code);
    const plan = planCode ? await this.getPlanByCode(planCode) : await this.getActivePlan(workspaceId.value);
    if (!plan) return jsonError("No active plan found for workspace.", 400);

    const billingMode = normalizeBillingMode(optionalString(body.billing_mode) ?? planToBillingMode(plan.code));
    const monthlyLimit = optionalPositiveInteger(body.monthly_request_limit) ?? plan.monthly_request_limit;
    const rateLimit = optionalPositiveInteger(body.rate_limit_per_minute) ?? plan.rate_limit_per_minute;
    const scopes = normalizeScopes(body.scopes);

    const publicPrefix = randomBytes(6).toString("hex");
    const secret = randomBytes(24).toString("base64url");
    const rawKey = `cp_live_${publicPrefix}_${secret}`;
    const keyHash = createHash("sha256").update(`${this.apiKeyPepper}:${rawKey}`).digest("hex");

    const result = await this.db.query<{ id: string }>(
      `
        insert into api_keys (
          workspace_id,
          name,
          public_prefix,
          key_hash,
          scopes,
          billing_mode,
          monthly_request_limit,
          rate_limit_per_minute
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8)
        returning id
      `,
      [workspaceId.value, name, publicPrefix, keyHash, scopes, billingMode, monthlyLimit, rateLimit]
    );

    return Response.json(
      {
        data: {
          id: result.rows[0]?.id,
          key: rawKey,
          scopes,
          billing_mode: billingMode,
          monthly_request_limit: monthlyLimit,
          rate_limit_per_minute: rateLimit,
        },
      },
      { status: 201 }
    );
  }

  private async getUsage(url: URL) {
    const workspaceId = requiredString(url.searchParams.get("workspace_id"), "workspace_id");
    if (!workspaceId.ok) return jsonError(workspaceId.error, 400);

    const month = optionalString(url.searchParams.get("month")) ?? getCurrentMonthStart();
    const { rows } = await this.db.query(
      `
        select
          k.id as api_key_id,
          k.name,
          k.billing_mode,
          k.monthly_request_limit,
          k.rate_limit_per_minute,
          coalesce(u.request_count, 0) as request_count,
          coalesce(u.rejected_count, 0) as rejected_count
        from api_keys k
        left join api_key_usage_months u
          on u.api_key_id = k.id
         and u.month = $2::date
        where k.workspace_id = $1
          and k.revoked_at is null
        order by k.created_at desc
      `,
      [workspaceId.value, month]
    );

    return Response.json({ data: rows, month });
  }

  private async getReadinessSummary(): Promise<ReadinessSummary> {
    const [workspaceCount, projectCount, keyCount, subscriptionCount, whatsappStats, paymentStats] = await Promise.all([
      this.db.query<{ workspace_count: number }>(`select count(*)::int as workspace_count from workspaces`),
      this.db.query<{ project_count: number }>(`select count(*)::int as project_count from cloud_projects`),
      this.db.query<{ key_count: number }>(`select count(*)::int as key_count from api_keys where revoked_at is null`),
      this.db.query<{ active_subscription_count: number }>(
        `select count(*)::int as active_subscription_count from cloud_subscriptions where status in ('trialing', 'active')`
      ),
      this.db.query<{
        whatsapp_account_count: number;
        active_whatsapp_account_count: number;
        latest_whatsapp_activity_at: string | null;
        recent_webhook_count: number;
      }>(
        `
          select
            count(*)::int as whatsapp_account_count,
            count(*) filter (where status = 'active')::int as active_whatsapp_account_count,
            max(greatest(
              coalesce(last_message_at, timestamp 'epoch'),
              coalesce(last_inbound_at, timestamp 'epoch'),
              coalesce(last_outbound_at, timestamp 'epoch'),
              coalesce(updated_at, timestamp 'epoch')
            )) as latest_whatsapp_activity_at,
            count(*) filter (where coalesce(last_inbound_at, last_message_at, updated_at) >= now() - interval '7 days')::int as recent_webhook_count
          from whatsapp_conversations
        `
      ),
      this.db.query<{
        payment_provider_count: number;
        latest_payment_event_at: string | null;
      }>(
        `
          select
            count(distinct provider)::int as payment_provider_count,
            max(created_at) as latest_payment_event_at
          from cloud_billing_events
        `
      ),
    ]);

    const whatsappRow = whatsappStats.rows[0] ?? {
      whatsapp_account_count: 0,
      active_whatsapp_account_count: 0,
      latest_whatsapp_activity_at: null,
      recent_webhook_count: 0,
    };
    const paymentRow = paymentStats.rows[0] ?? { payment_provider_count: 0, latest_payment_event_at: null };

    return {
      workspace_count: workspaceCount.rows[0]?.workspace_count ?? 0,
      project_count: projectCount.rows[0]?.project_count ?? 0,
      key_count: keyCount.rows[0]?.key_count ?? 0,
      active_subscription_count: subscriptionCount.rows[0]?.active_subscription_count ?? 0,
      whatsapp_account_count: whatsappRow.whatsapp_account_count ?? 0,
      active_whatsapp_account_count: whatsappRow.active_whatsapp_account_count ?? 0,
      payment_provider_count: paymentRow.payment_provider_count ?? 0,
      latest_whatsapp_activity_at: normalizeTimestamp(whatsappRow.latest_whatsapp_activity_at),
      latest_payment_event_at: normalizeTimestamp(paymentRow.latest_payment_event_at),
      recent_webhook_count: whatsappRow.recent_webhook_count ?? 0,
      has_public_api_key: (keyCount.rows[0]?.key_count ?? 0) > 0,
      has_whatsapp_configuration: (whatsappRow.active_whatsapp_account_count ?? 0) > 0,
      has_payment_provider_configuration: (paymentRow.payment_provider_count ?? 0) > 0,
    };
  }

  private async getReadinessWorkspace(workspaceId: string): Promise<ReadinessWorkspace | null> {
    const [workspace, projectCount, keyCount, subscriptionCount, whatsappStats, paymentStats] = await Promise.all([
      this.db.query<{ id: string; name: string }>(`select id, name from workspaces where id = $1 limit 1`, [workspaceId]),
      this.db.query<{ project_count: number }>(`select count(*)::int as project_count from cloud_projects where workspace_id = $1`, [workspaceId]),
      this.db.query<{ key_count: number }>(`select count(*)::int as key_count from api_keys where workspace_id = $1 and revoked_at is null`, [workspaceId]),
      this.db.query<{ active_subscription_count: number }>(
        `select count(*)::int as active_subscription_count from cloud_subscriptions where workspace_id = $1 and status in ('trialing', 'active')`,
        [workspaceId]
      ),
      this.db.query<{
        whatsapp_account_count: number;
        active_whatsapp_account_count: number;
        latest_whatsapp_activity_at: string | null;
        recent_webhook_count: number;
      }>(
        `
          select
            count(*)::int as whatsapp_account_count,
            count(*) filter (where status = 'active')::int as active_whatsapp_account_count,
            max(greatest(
              coalesce(last_message_at, timestamp 'epoch'),
              coalesce(last_inbound_at, timestamp 'epoch'),
              coalesce(last_outbound_at, timestamp 'epoch'),
              coalesce(updated_at, timestamp 'epoch')
            )) as latest_whatsapp_activity_at,
            count(*) filter (where coalesce(last_inbound_at, last_message_at, updated_at) >= now() - interval '7 days')::int as recent_webhook_count
          from whatsapp_conversations
          where workspace_id = $1
        `,
        [workspaceId]
      ),
      this.db.query<{
        payment_provider_count: number;
        latest_payment_event_at: string | null;
      }>(
        `
          select
            count(distinct provider)::int as payment_provider_count,
            max(created_at) as latest_payment_event_at
          from cloud_billing_events
          where workspace_id = $1
        `,
        [workspaceId]
      ),
    ]);

    if (!workspace.rows[0]) return null;

    const whatsappRow = whatsappStats.rows[0] ?? {
      whatsapp_account_count: 0,
      active_whatsapp_account_count: 0,
      latest_whatsapp_activity_at: null,
      recent_webhook_count: 0,
    };
    const paymentRow = paymentStats.rows[0] ?? { payment_provider_count: 0, latest_payment_event_at: null };

    return {
      id: workspace.rows[0].id,
      name: workspace.rows[0].name,
      project_count: projectCount.rows[0]?.project_count ?? 0,
      key_count: keyCount.rows[0]?.key_count ?? 0,
      active_subscription_count: subscriptionCount.rows[0]?.active_subscription_count ?? 0,
      whatsapp_account_count: whatsappRow.whatsapp_account_count ?? 0,
      active_whatsapp_account_count: whatsappRow.active_whatsapp_account_count ?? 0,
      payment_provider_count: paymentRow.payment_provider_count ?? 0,
      latest_whatsapp_activity_at: normalizeTimestamp(whatsappRow.latest_whatsapp_activity_at),
      latest_payment_event_at: normalizeTimestamp(paymentRow.latest_payment_event_at),
      recent_webhook_count: whatsappRow.recent_webhook_count ?? 0,
      has_public_api_key: (keyCount.rows[0]?.key_count ?? 0) > 0,
      has_whatsapp_configuration: (whatsappRow.active_whatsapp_account_count ?? 0) > 0,
      has_payment_provider_configuration: (paymentRow.payment_provider_count ?? 0) > 0,
    };
  }

  private readinessStatus(summary: ReadinessSummary, workspace: ReadinessWorkspace | null) {
    const hasWorkspace = workspace ? true : summary.workspace_count > 0;
    const hasProject = workspace ? workspace.project_count > 0 : summary.project_count > 0;
    const hasKey = workspace ? workspace.has_public_api_key : summary.has_public_api_key;
    if (hasWorkspace && hasProject && hasKey) return "ok";
    return "degraded";
  }

  private buildDiagnostics(summary: ReadinessSummary, workspace: ReadinessWorkspace | null, workspaceRequested: boolean) {
    const projectCount = workspace ? workspace.project_count : summary.project_count;
    const keyCount = workspace ? workspace.key_count : summary.key_count;
    const whatsappAccountCount = workspace ? workspace.whatsapp_account_count : summary.whatsapp_account_count;
    const activeWhatsAppCount = workspace ? workspace.active_whatsapp_account_count : summary.active_whatsapp_account_count;
    const paymentProviderCount = workspace ? workspace.payment_provider_count : summary.payment_provider_count;
    const recentWebhookCount = workspace ? workspace.recent_webhook_count : summary.recent_webhook_count;
    const hasPublicApiKey = workspace ? workspace.has_public_api_key : summary.has_public_api_key;
    const hasWhatsappConfiguration = workspace ? workspace.has_whatsapp_configuration : summary.has_whatsapp_configuration;
    const hasPaymentProviderConfiguration = workspace ? workspace.has_payment_provider_configuration : summary.has_payment_provider_configuration;
    return [
      {
        key: "workspace",
        label: "Workspace",
        status: workspace ? "ok" : workspaceRequested ? "missing" : summary.workspace_count > 0 ? "ok" : "missing",
        detail: workspace
          ? `${workspace.name} selected`
          : workspaceRequested
            ? "Requested workspace was not found"
            : `${summary.workspace_count} workspaces available`,
      },
      {
        key: "projects",
        label: "Projects",
        status: projectCount > 0 ? "ok" : "missing",
        detail: projectCount > 0 ? `${projectCount} project${projectCount === 1 ? "" : "s"} found` : "Create a first project",
      },
      {
        key: "keys",
        label: "API keys",
        status: keyCount > 0 || hasPublicApiKey ? "ok" : "missing",
        detail: hasPublicApiKey ? "At least one public API key is active" : "Create a workspace public API key",
      },
      {
        key: "whatsapp",
        label: "WhatsApp",
        status: hasWhatsappConfiguration ? "ok" : whatsappAccountCount > 0 ? "missing" : "missing",
        detail: hasWhatsappConfiguration
          ? `${activeWhatsAppCount} active WhatsApp account${activeWhatsAppCount === 1 ? "" : "s"}`
          : "No active WhatsApp account is configured",
      },
      {
        key: "payments",
        label: "Payments",
        status: hasPaymentProviderConfiguration ? "ok" : "missing",
        detail: hasPaymentProviderConfiguration
          ? `${paymentProviderCount} payment provider${paymentProviderCount === 1 ? "" : "s"} reporting activity`
          : "No payment provider events received yet",
      },
      {
        key: "webhooks",
        label: "Recent webhooks",
        status: recentWebhookCount > 0 ? "ok" : "missing",
        detail: recentWebhookCount > 0 ? `${recentWebhookCount} recent webhook conversation${recentWebhookCount === 1 ? "" : "s"}` : "No recent webhook traffic recorded",
      },
    ];
  }

  private async recordBillingEvent(request: Request) {
    const body = await readJsonObject(request);
    if (body instanceof Response) return body;

    const provider = requiredString(body.provider, "provider");
    const providerEventId = requiredString(body.provider_event_id, "provider_event_id");
    const eventType = requiredString(body.event_type, "event_type");
    if (!provider.ok) return jsonError(provider.error, 400);
    if (!providerEventId.ok) return jsonError(providerEventId.error, 400);
    if (!eventType.ok) return jsonError(eventType.error, 400);

    const workspaceId = optionalString(body.workspace_id);
    await this.db.query(
      `
        insert into cloud_billing_events (
          workspace_id,
          provider,
          provider_event_id,
          event_type,
          payload,
          processed_at
        )
        values ($1, $2, $3, $4, $5::jsonb, now())
        on conflict (provider_event_id) do nothing
      `,
      [workspaceId, provider.value, providerEventId.value, eventType.value, JSON.stringify(body.payload ?? body)]
    );

    return Response.json({ data: { accepted: true } });
  }

  private async getPlanByCode(code: string) {
    const { rows } = await this.db.query<PlanRow>(
      `
        select id, code, name, monthly_price_cents, currency, monthly_request_limit, rate_limit_per_minute, included_projects, features
        from cloud_plans
        where code = $1 and active = true
        limit 1
      `,
      [code]
    );

    return rows[0] ?? null;
  }

  private async getActivePlan(workspaceId: string) {
    const { rows } = await this.db.query<PlanRow & SubscriptionRow>(
      `
        select
          p.id,
          p.code,
          p.name,
          p.monthly_price_cents,
          p.currency,
          p.monthly_request_limit,
          p.rate_limit_per_minute,
          p.included_projects,
          p.features
        from cloud_subscriptions s
        join cloud_plans p on p.id = s.plan_id
        where s.workspace_id = $1
          and s.status in ('trialing', 'active')
        order by s.created_at desc
        limit 1
      `,
      [workspaceId]
    );

    return rows[0] ?? null;
  }

  private requireAdmin(request: Request) {
    const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) return jsonError("Missing admin token.", 401);
    if (!safeEqualText(token, this.adminToken)) return jsonError("Invalid admin token.", 401);
    return true;
  }
}

async function readJsonObject(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return jsonError("Request body must be a JSON object.", 400);
  }
  return body as Record<string, unknown>;
}

function requiredString(value: unknown, name: string) {
  const normalized = optionalString(value);
  if (!normalized) return { ok: false as const, error: `${name} is required.` };
  return { ok: true as const, value: normalized };
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function optionalPositiveInteger(value: unknown) {
  if (value === undefined || value === null || value === "") return null;
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return null;
  return parsed;
}

function normalizeScopes(value: unknown): ApiScope[] {
  const source =
    typeof value === "string"
      ? value.split(",")
      : Array.isArray(value)
        ? value
        : ["leads:read", "leads:write", "clients:read", "clients:write", "usage:read"];

  const scopes = source
    .map((scope) => (typeof scope === "string" ? scope.trim() : ""))
    .filter((scope): scope is ApiScope => (API_SCOPES as readonly string[]).includes(scope));

  return scopes.length ? scopes : ["usage:read"];
}

function normalizeBillingMode(value: string): ApiKeyBillingMode {
  if (value === "cloud_free" || value === "cloud_paid" || value === "cloud_enterprise" || value === "self_hosted") {
    return value;
  }
  return "cloud_free";
}

function planToBillingMode(planCode: string): ApiKeyBillingMode {
  if (planCode === "free") return "cloud_free";
  if (planCode === "enterprise") return "cloud_enterprise";
  return "cloud_paid";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function normalizePath(pathname: string) {
  const apiIndex = pathname.indexOf("/api/cloud/v1");
  const normalized = apiIndex >= 0 ? pathname.slice(apiIndex + "/api/cloud/v1".length) : pathname;
  return `/${normalized.replace(/^\/+|\/+$/g, "")}`;
}

function safeEqualText(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function jsonError(message: string, status: number) {
  return Response.json({ error: { message } }, { status });
}

function getCurrentMonthStart() {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${now.getUTCFullYear()}-${month}-01`;
}

function normalizeTimestamp(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "ClientPad Cloud Control Plane",
    version: "0.2.0",
  },
  paths: {
    "/health": { get: { summary: "Health check" } },
    "/plans": { get: { summary: "List public plans" } },
    "/readiness": { get: { summary: "Operator readiness summary" } },
    "/projects": {
      get: { summary: "List hosted projects" },
      post: { summary: "Create hosted project and workspace" },
    },
    "/api-keys": { post: { summary: "Create hosted API key" } },
    "/usage": { get: { summary: "List workspace usage by API key" } },
    "/billing/events": { post: { summary: "Record billing provider event" } },
  },
};
