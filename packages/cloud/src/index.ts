import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
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

type OperatorStatusRow = {
  operator_count: number;
  workspace_count: number;
};

type OperatorUserRow = {
  id: string;
  email: string;
  full_name: string | null;
  password_hash: string | null;
};

type OperatorWorkspaceRow = {
  id: string;
  name: string;
  role: string;
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
  role: string;
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

type OperatorAuthUser = {
  id: string;
  email: string;
  full_name: string | null;
};

type OperatorAccess =
  | {
      kind: "admin";
      workspaceId: null;
    }
  | {
      kind: "session";
      user: OperatorAuthUser;
      session: { id: string; expires_at: string };
      workspaces: OperatorWorkspaceRow[];
      workspaceId: string | null;
    };

export function createClientPadCloudHandler(config: ClientPadCloudConfig): ClientPadCloudHandler {
  const cloud = new ClientPadCloud(config);
  return cloud.handle.bind(cloud);
}

export class ClientPadCloud {
  private readonly db: Queryable;
  private readonly apiKeyPepper: string;
  private readonly adminToken: string;
  private readonly sessionCookieName = "clientpad_operator_session";
  private readonly sessionDays = 30;

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

      if (request.method === "OPTIONS") return this.withCors(new Response(null, { status: 204 }), request);

      if (path === "/health" && request.method === "GET") return this.withCors(await this.health(), request);
      if (path === "/openapi.json" && request.method === "GET") return this.withCors(Response.json(openApiDocument), request);
      if (path === "/plans" && request.method === "GET") return this.withCors(await this.listPlans(), request);
      if (path === "/auth/status" && request.method === "GET") return this.withCors(await this.getAuthStatus(), request);
      if (path === "/auth/login" && request.method === "POST") return this.withCors(await this.login(request), request);
      if (path === "/auth/register" && request.method === "POST") return this.withCors(await this.register(request), request);
      if (path === "/auth/me" && request.method === "GET") return this.withCors(await this.getMe(request), request);
      if (path === "/auth/logout" && request.method === "POST") return this.withCors(await this.logout(request), request);
      if (path === "/billing/events" && request.method === "POST") return this.withCors(await this.recordBillingEvent(request), request);

      const operator = await this.requireOperator(request);
      if (operator instanceof Response) return this.withCors(operator, request);

      if (path === "/projects" && request.method === "GET") return this.withCors(await this.listProjects(url, operator), request);
      if (path === "/projects" && request.method === "POST") return this.withCors(await this.createProject(request, operator), request);
      if (path === "/api-keys" && request.method === "POST") return this.withCors(await this.createHostedApiKey(request, operator), request);
      if (path === "/usage" && request.method === "GET") return this.withCors(await this.getUsage(url, operator), request);
      if (path === "/readiness" && request.method === "GET") return this.withCors(await this.getReadiness(url, operator), request);

      return this.withCors(jsonError("Route not found.", 404), request);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error.";
      return this.withCors(jsonError(message, 500), request);
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

  private async getAuthStatus() {
    const { rows } = await this.db.query<OperatorStatusRow>(
      `
        select
          count(distinct users.id)::int as operator_count,
          count(distinct workspace_id)::int as workspace_count
        from users
        left join workspace_members on workspace_members.user_id = users.id
      `
    );

    const row = rows[0] ?? { operator_count: 0, workspace_count: 0 };
    return Response.json({
      status: "ok",
      service: "@clientpad/cloud",
      time: new Date().toISOString(),
      registration_open: row.operator_count === 0,
      operator_count: row.operator_count,
      workspace_count: row.workspace_count,
    });
  }

  private async login(request: Request) {
    const body = await readJsonObject(request);
    if (body instanceof Response) return body;

    const email = requiredString(body.email, "email");
    const password = requiredString(body.password, "password");
    if (!email.ok) return jsonError(email.error, 400);
    if (!password.ok) return jsonError(password.error, 400);

    const user = await this.getUserByEmail(email.value);
    if (!user || !user.password_hash) return jsonError("Invalid email or password.", 401);
    if (!verifyPassword(password.value, user.password_hash, this.apiKeyPepper)) {
      return jsonError("Invalid email or password.", 401);
    }

    const session = await this.createSession(user.id);
    const workspaces = await this.getWorkspacesForUser(user.id);
    return this.sessionResponse(request, user, session, workspaces);
  }

  private async register(request: Request) {
    const status = await this.getAuthStatus();
    const statusBody = await status.clone().json().catch(() => null);
    if (!statusBody?.registration_open) {
      return jsonError("Operator registration is closed.", 403);
    }

    const body = await readJsonObject(request);
    if (body instanceof Response) return body;

    const email = requiredString(body.email, "email");
    const password = requiredString(body.password, "password");
    if (!email.ok) return jsonError(email.error, 400);
    if (!password.ok) return jsonError(password.error, 400);

    const fullName = optionalString(body.full_name);
    const workspaceName = optionalString(body.workspace_name) ?? "My Workspace";

    const existing = await this.getUserByEmail(email.value);
    if (existing) return jsonError("An operator account already exists for that email.", 409);

    const passwordHash = hashPassword(password.value, this.apiKeyPepper);
    const user = await this.db.query<{ id: string; email: string; full_name: string | null }>(
      `
        insert into users (email, full_name, password_hash)
        values ($1, $2, $3)
        returning id, email, full_name
      `,
      [email.value, fullName, passwordHash]
    );
    const userRow = user.rows[0];
    if (!userRow) return jsonError("Could not create operator account.", 500);

    const workspace = await this.db.query<{ id: string; name: string }>(
      `
        insert into workspaces (name, created_by)
        values ($1, $2)
        returning id, name
      `,
      [workspaceName, userRow.id]
    );
    const workspaceRow = workspace.rows[0];
    if (!workspaceRow) return jsonError("Could not create workspace.", 500);

    await this.db.query(
      `
        insert into workspace_members (workspace_id, user_id, role)
        values ($1, $2, 'owner')
      `,
      [workspaceRow.id, userRow.id]
    );

    const session = await this.createSession(userRow.id);
    const workspaces = await this.getWorkspacesForUser(userRow.id);
    return this.sessionResponse(request, userRow, session, workspaces);
  }

  private async getMe(request: Request) {
    const auth = await this.requireSession(request);
    if (auth instanceof Response) return auth;
    const workspaces = await this.getWorkspacesForUser(auth.user.id);
    return this.sessionResponse(request, auth.user, auth.session, workspaces);
  }

  private async logout(request: Request) {
    const auth = await this.requireSession(request);
    if (auth instanceof Response) return auth;

    await this.db.query(`update operator_sessions set revoked_at = now(), updated_at = now() where id = $1`, [auth.session.id]);
    const response = Response.json({ status: "ok" });
    response.headers.set("Set-Cookie", this.sessionCookie("", new Date(0), new URL(request.url).protocol === "https:"));
    return response;
  }

  private async getReadiness(url: URL, auth: OperatorAccess) {
    const workspaceId = optionalString(url.searchParams.get("workspace_id")) ?? auth.workspaceId;
    const [summary, workspace] = await Promise.all([
      this.getReadinessSummary(auth),
      workspaceId ? this.getReadinessWorkspace(workspaceId, auth) : Promise.resolve(null),
    ]);

    const status = this.readinessStatus(summary, workspace);

    return Response.json({
      status,
      service: "@clientpad/cloud",
      time: new Date().toISOString(),
      auth: {
        user: auth.kind === "session" ? { id: auth.user.id, email: auth.user.email, full_name: auth.user.full_name } : null,
        session_expires_at: auth.kind === "session" ? auth.session.expires_at : null,
        mode: auth.kind === "admin" ? "admin" : "operator_session",
      },
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

  private async listProjects(url: URL, auth: OperatorAccess) {
    const workspaceId = optionalString(url.searchParams.get("workspace_id"));
    const accessibleWorkspaceIds = auth.kind === "session" ? auth.workspaces.map((workspace) => workspace.id) : [];
    if (workspaceId && auth.kind === "session" && !auth.workspaces.some((workspace) => workspace.id === workspaceId)) {
      return jsonError("You do not have access to that workspace.", 403);
    }

    const values: QueryValue[] = [];
    let filter = "";
    if (workspaceId) {
      values.push(workspaceId);
      filter = "where workspace_id = $1";
    } else if (auth.kind === "session" && accessibleWorkspaceIds.length > 0) {
      values.push(accessibleWorkspaceIds);
      filter = "where workspace_id = any($1::uuid[])";
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

  private async createProject(request: Request, auth: OperatorAccess) {
    const body = await readJsonObject(request);
    if (body instanceof Response) return body;

    const name = requiredString(body.name, "name");
    const workspaceName = optionalString(body.workspace_name) ?? optionalString(body.name) ?? "Workspace";
    if (!name.ok) return jsonError(name.error, 400);

    const ownerEmail = optionalString(body.owner_email);
    const slug = slugify(optionalString(body.slug) ?? name.value);
    const environment = optionalString(body.environment) ?? "production";
    const planCode = optionalString(body.plan_code) ?? "free";
    const workspaceId = optionalString(body.workspace_id);

    const plan = await this.getPlanByCode(planCode);
    if (!plan) return jsonError(`Unknown plan: ${planCode}`, 400);

    let targetWorkspaceId = workspaceId;
    if (targetWorkspaceId) {
      if (auth.kind === "session" && !auth.workspaces.some((workspace) => workspace.id === targetWorkspaceId)) {
        return jsonError("You do not have access to that workspace.", 403);
      }
    } else {
      const workspace = await this.db.query<{ id: string }>(
        `
          insert into workspaces (name, created_by)
          values ($1, $2)
          returning id
        `,
        [workspaceName, auth.kind === "session" ? auth.user.id : null]
      );
      targetWorkspaceId = workspace.rows[0]?.id;
      if (!targetWorkspaceId) return jsonError("Could not create workspace.", 500);

      if (auth.kind === "session") {
        await this.db.query(
          `
            insert into workspace_members (workspace_id, user_id, role)
            values ($1, $2, 'owner')
            on conflict do nothing
          `,
          [targetWorkspaceId, auth.user.id]
        );
      }
    }

    const project = await this.db.query<ProjectRow>(
      `
        insert into cloud_projects (workspace_id, name, slug, environment, owner_email)
        values ($1, $2, $3, $4, $5)
        returning id, workspace_id, name, slug, environment, owner_email, created_at
      `,
      [targetWorkspaceId, name.value, slug, environment, ownerEmail]
    );

    await this.db.query(
      `
        insert into cloud_subscriptions (workspace_id, plan_id, status)
        values ($1, $2, 'active')
      `,
      [targetWorkspaceId, plan.id]
    );

    return Response.json({ data: project.rows[0] }, { status: 201 });
  }

  private async createHostedApiKey(request: Request, auth: OperatorAccess) {
    const body = await readJsonObject(request);
    if (body instanceof Response) return body;

    const workspaceId = requiredString(body.workspace_id, "workspace_id");
    if (!workspaceId.ok) return jsonError(workspaceId.error, 400);
    if (auth.kind === "session" && !auth.workspaces.some((workspace) => workspace.id === workspaceId.value)) {
      return jsonError("You do not have access to that workspace.", 403);
    }

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

  private async getUsage(url: URL, auth: OperatorAccess) {
    const workspaceId = requiredString(url.searchParams.get("workspace_id"), "workspace_id");
    if (!workspaceId.ok) return jsonError(workspaceId.error, 400);
    if (auth.kind === "session" && !auth.workspaces.some((workspace) => workspace.id === workspaceId.value)) {
      return jsonError("You do not have access to that workspace.", 403);
    }

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

  private async getReadinessSummary(auth: OperatorAccess): Promise<ReadinessSummary> {
    const workspaceIds = auth.kind === "session" ? auth.workspaces.map((workspace) => workspace.id) : [];
    const workspaceFilter = workspaceIds.length ? `where workspace_id = any($1::uuid[])` : "";
    const [workspaceCount, projectCount, keyCount, subscriptionCount, whatsappStats, paymentStats] = await Promise.all([
      workspaceIds.length
        ? this.db.query<{ workspace_count: number }>(`select count(*)::int as workspace_count from workspaces where id = any($1::uuid[])`, [workspaceIds])
        : this.db.query<{ workspace_count: number }>(`select count(*)::int as workspace_count from workspaces`),
      workspaceIds.length
        ? this.db.query<{ project_count: number }>(`select count(*)::int as project_count from cloud_projects where workspace_id = any($1::uuid[])`, [workspaceIds])
        : this.db.query<{ project_count: number }>(`select count(*)::int as project_count from cloud_projects`),
      workspaceIds.length
        ? this.db.query<{ key_count: number }>(`select count(*)::int as key_count from api_keys where revoked_at is null and workspace_id = any($1::uuid[])`, [workspaceIds])
        : this.db.query<{ key_count: number }>(`select count(*)::int as key_count from api_keys where revoked_at is null`),
      workspaceIds.length
        ? this.db.query<{ active_subscription_count: number }>(
            `select count(*)::int as active_subscription_count from cloud_subscriptions where status in ('trialing', 'active') and workspace_id = any($1::uuid[])`,
            [workspaceIds]
          )
        : this.db.query<{ active_subscription_count: number }>(
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
          ${workspaceFilter}
        `
        ,
        workspaceIds.length ? [workspaceIds] : []
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
          ${workspaceFilter}
        `
        ,
        workspaceIds.length ? [workspaceIds] : []
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

  private async getReadinessWorkspace(workspaceId: string, auth: OperatorAccess): Promise<ReadinessWorkspace | null> {
    if (auth.kind === "session" && !auth.workspaces.some((workspace) => workspace.id === workspaceId)) {
      return null;
    }
    const membership = auth.kind === "session" ? await this.getWorkspaceMembership(auth.user.id, workspaceId) : null;
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
      role: membership?.role ?? "owner",
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
    const admin = this.requireAdmin(request);
    if (admin instanceof Response) return admin;

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

  private async requireOperator(request: Request): Promise<OperatorAccess | Response> {
    const adminToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (adminToken && safeEqualText(adminToken, this.adminToken)) {
      return { kind: "admin", workspaceId: null };
    }

    const sessionToken = this.extractSessionToken(request);
    if (!sessionToken) return jsonError("Sign in required.", 401);

    const sessionHash = hashSessionToken(sessionToken, this.apiKeyPepper);
    const { rows } = await this.db.query<{
      id: string;
      user_id: string;
      expires_at: string;
      email: string;
      full_name: string | null;
    }>(
      `
        select s.id, s.user_id, s.expires_at, u.email, u.full_name
        from operator_sessions s
        join users u on u.id = s.user_id
        where s.session_hash = $1
          and s.revoked_at is null
          and s.expires_at > now()
        limit 1
      `,
      [sessionHash]
    );

    const session = rows[0];
    if (!session) return jsonError("Session expired. Sign in again.", 401);

    const workspaces = await this.getWorkspacesForUser(session.user_id);
    return {
      kind: "session",
      user: {
        id: session.user_id,
        email: session.email,
        full_name: session.full_name,
      },
      session: {
        id: session.id,
        expires_at: session.expires_at,
      },
      workspaces,
      workspaceId: workspaces[0]?.id ?? null,
    };
  }

  private async requireSession(request: Request): Promise<Extract<OperatorAccess, { kind: "session" }> | Response> {
    const auth = await this.requireOperator(request);
    if (auth instanceof Response) return auth;
    if (auth.kind !== "session") return jsonError("Sign in required.", 401);
    return auth;
  }

  private async getUserByEmail(email: string) {
    const { rows } = await this.db.query<OperatorUserRow>(
      `
        select id, email, full_name, password_hash
        from users
        where lower(email) = lower($1)
        limit 1
      `,
      [email]
    );
    return rows[0] ?? null;
  }

  private async getWorkspacesForUser(userId: string) {
    const { rows } = await this.db.query<OperatorWorkspaceRow>(
      `
        select
          w.id,
          w.name,
          m.role,
          coalesce((select count(*)::int from cloud_projects p where p.workspace_id = w.id), 0) as project_count,
          coalesce((select count(*)::int from api_keys k where k.workspace_id = w.id and k.revoked_at is null), 0) as key_count,
          coalesce((select count(*)::int from cloud_subscriptions s where s.workspace_id = w.id and s.status in ('trialing', 'active')), 0) as active_subscription_count,
          coalesce((select count(*)::int from whatsapp_conversations wc where wc.workspace_id = w.id), 0) as whatsapp_account_count,
          coalesce((select count(*) filter (where status = 'active')::int from whatsapp_conversations wc where wc.workspace_id = w.id), 0) as active_whatsapp_account_count,
          coalesce((select count(distinct provider)::int from cloud_billing_events be where be.workspace_id = w.id), 0) as payment_provider_count,
          (select max(greatest(
            coalesce(last_message_at, timestamp 'epoch'),
            coalesce(last_inbound_at, timestamp 'epoch'),
            coalesce(last_outbound_at, timestamp 'epoch'),
            coalesce(updated_at, timestamp 'epoch')
          )) from whatsapp_conversations wc where wc.workspace_id = w.id) as latest_whatsapp_activity_at,
          (select max(created_at) from cloud_billing_events be where be.workspace_id = w.id) as latest_payment_event_at,
          coalesce((select count(*)::int from whatsapp_conversations wc where wc.workspace_id = w.id and coalesce(last_inbound_at, last_message_at, updated_at) >= now() - interval '7 days'), 0) as recent_webhook_count,
          coalesce((select count(*)::int from api_keys k where k.workspace_id = w.id and k.revoked_at is null), 0) > 0 as has_public_api_key,
          coalesce((select count(*) filter (where status = 'active')::int from whatsapp_conversations wc where wc.workspace_id = w.id), 0) > 0 as has_whatsapp_configuration,
          coalesce((select count(distinct provider)::int from cloud_billing_events be where be.workspace_id = w.id), 0) > 0 as has_payment_provider_configuration
        from workspace_members m
        join workspaces w on w.id = m.workspace_id
        where m.user_id = $1
        order by w.created_at asc
      `,
      [userId]
    );
    return rows.map((row) => ({
      ...row,
      latest_whatsapp_activity_at: normalizeTimestamp(row.latest_whatsapp_activity_at),
      latest_payment_event_at: normalizeTimestamp(row.latest_payment_event_at),
    }));
  }

  private async createSession(userId: string) {
    const token = `cp_session_${randomBytes(32).toString("hex")}`;
    const sessionHash = hashSessionToken(token, this.apiKeyPepper);
    const expiresAt = new Date(Date.now() + this.sessionDays * 24 * 60 * 60 * 1000);
    const { rows } = await this.db.query<{ id: string; expires_at: string }>(
      `
        insert into operator_sessions (user_id, session_hash, expires_at)
        values ($1, $2, $3)
        returning id, expires_at
      `,
      [userId, sessionHash, expiresAt]
    );
    const session = rows[0];
    if (!session) throw new Error("Could not create session.");
    return { id: session.id, token, expires_at: session.expires_at };
  }

  private sessionResponse(
    request: Request,
    user: OperatorAuthUser,
    session: { id: string; token?: string; expires_at: string },
    workspaces: OperatorWorkspaceRow[]
  ) {
    const selectedWorkspaceId = workspaces[0]?.id ?? null;
    const response = Response.json({
      status: "ok",
      service: "@clientpad/cloud",
      time: new Date().toISOString(),
      auth: {
        user,
        session_expires_at: session.expires_at,
        selected_workspace_id: selectedWorkspaceId,
        workspaces,
      },
    });
    if (session.token) {
      response.headers.set("Set-Cookie", this.sessionCookie(session.token, new Date(session.expires_at), new URL(request.url).protocol === "https:"));
    }
    return response;
  }

  private extractSessionToken(request: Request) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const sessionCookie = cookieHeader
        .split(";")
        .map((entry) => entry.trim())
        .find((entry) => entry.startsWith(`${this.sessionCookieName}=`));
      if (sessionCookie) return decodeURIComponent(sessionCookie.slice(this.sessionCookieName.length + 1));
    }

    const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (bearer && !safeEqualText(bearer, this.adminToken)) return bearer;
    return null;
  }

  private sessionCookie(token: string, expiresAt: Date, secure = true) {
    const sameSite = secure ? "None" : "Lax";
    const pieces = [
      `${this.sessionCookieName}=${encodeURIComponent(token)}`,
      `Path=/`,
      `Expires=${expiresAt.toUTCString()}`,
      `SameSite=${sameSite}`,
    ];
    if (secure) pieces.push("Secure");
    pieces.push("HttpOnly");
    return pieces.join("; ");
  }

  private async getWorkspaceMembership(userId: string, workspaceId: string) {
    const { rows } = await this.db.query<{ role: string }>(
      `select role from workspace_members where user_id = $1 and workspace_id = $2 limit 1`,
      [userId, workspaceId]
    );
    return rows[0] ?? null;
  }

  private async requireWorkspaceAccess(auth: OperatorAccess, workspaceId: string) {
    if (auth.kind === "admin") return true;
    if (auth.workspaces.some((workspace) => workspace.id === workspaceId)) return true;
    return false;
  }

  private withCors(response: Response, request: Request) {
    const headers = new Headers(response.headers);
    const origin = request.headers.get("origin");
    if (origin) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Vary", "Origin");
    } else {
      headers.set("Access-Control-Allow-Origin", "*");
    }
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Access-Control-Allow-Headers", "content-type, authorization");
    headers.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
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

function hashPassword(password: string, pepper: string) {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(`${pepper}:${password}`, salt, 64).toString("hex");
  return `scrypt$16384$8$1$${salt}$${digest}`;
}

function verifyPassword(password: string, stored: string, pepper: string) {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, salt, digest] = parts;
  const derived = scryptSync(`${pepper}:${password}`, salt, 64).toString("hex");
  return safeEqualText(`${n}:${r}:${p}:${digest}`, `${n}:${r}:${p}:${derived}`);
}

function hashSessionToken(token: string, pepper: string) {
  return createHash("sha256").update(`${pepper}:${token}`).digest("hex");
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
