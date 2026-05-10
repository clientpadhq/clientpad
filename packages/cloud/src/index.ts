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

const openApiDocument = {
  openapi: "3.1.0",
  info: {
    title: "ClientPad Cloud Control Plane",
    version: "0.2.0",
  },
  paths: {
    "/health": { get: { summary: "Health check" } },
    "/plans": { get: { summary: "List public plans" } },
    "/projects": {
      get: { summary: "List hosted projects" },
      post: { summary: "Create hosted project and workspace" },
    },
    "/api-keys": { post: { summary: "Create hosted API key" } },
    "/usage": { get: { summary: "List workspace usage by API key" } },
    "/billing/events": { post: { summary: "Record billing provider event" } },
  },
};
