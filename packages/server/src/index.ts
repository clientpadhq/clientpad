import { createHash, timingSafeEqual } from "node:crypto";
import { Pool } from "pg";
import { verifyPaymentWebhook, type PaymentProvider, type VerifiedPaymentWebhook } from "@abdulmuiz44/clientpad-whatsapp";
import {
  getPublicPrefix,
  isLeadStatus,
  parseBearerToken,
  type ApiKeyUsageSummary,
  type ApiScope,
  type ApiKeyBillingMode,
  type LeadStatus,
} from "@abdulmuiz44/clientpad-core";
import { normalizeNigerianPhoneNumber } from "@abdulmuiz44/clientpad-core/phone";

export type QueryValue = string | number | boolean | Date | null | string[] | Record<string, unknown>;

export type QueryResult<T> = {
  rows: T[];
  rowCount: number | null;
};

export type Queryable = {
  query<T = Record<string, unknown>>(text: string, values?: QueryValue[]): Promise<QueryResult<T>>;
};

export type { ApiScope } from "@abdulmuiz44/clientpad-core";

export type ApiKeyPrincipal = {
  apiKeyId: string;
  workspaceId: string;
  name: string;
  scopes: ApiScope[];
  billingMode: ApiKeyBillingMode;
  monthlyRequestLimit: number | null;
  rateLimitPerMinute: number | null;
};

export type ClientPadServerConfig = {
  databaseUrl?: string;
  apiKeyPepper: string;
  db?: Queryable;
  payments?: PaymentWebhookConfig;
};

export type PaymentWebhookConfig = {
  paystackSecretKey?: string;
  flutterwaveSecretKey?: string;
  flutterwaveWebhookSecret?: string;
  sendWhatsAppMessage?: (message: WhatsAppPaymentConfirmationMessage) => Promise<void>;
  triggerReviewRequest?: (payment: ConfirmedPaymentRecord) => Promise<void>;
};

export type WhatsAppPaymentConfirmationMessage = {
  workspaceId: string;
  leadId: string;
  paymentId: string;
  phone: string;
  name: string;
  amount: number;
  currency: string;
  serviceItemReference: string;
  provider: PaymentProvider;
};

export type ConfirmedPaymentRecord = WhatsAppPaymentConfirmationMessage & {
  reference: string;
};

export type ClientPadHandler = (request: Request) => Promise<Response>;

type ApiKeyRow = {
  id: string;
  workspace_id: string;
  name: string;
  key_hash: string;
  scopes: ApiScope[] | null;
  billing_mode: ApiKeyBillingMode | null;
  monthly_request_limit: number | null;
  rate_limit_per_minute: number | null;
};

type UsageResult = {
  allowed: boolean;
  reason: string | null;
  statusCode: number | null;
};

type UsageMonthRow = {
  request_count: number;
  rejected_count: number;
};

type RateLimitWindowRow = {
  request_count: number;
  allowed: boolean;
};

type UsageSummaryRow = {
  request_count: number | null;
  rejected_count: number | null;
};

type PaymentWebhookUpdateRow = {
  id: string;
  workspace_id: string;
  lead_id: string;
  provider: PaymentProvider;
  provider_reference: string;
  amount: number;
  currency: string;
  service_item_reference: string;
  customer_phone: string;
  customer_name: string;
};

export function createClientPadHandler(config: ClientPadServerConfig): ClientPadHandler {
  const server = new ClientPadServer(config);
  return server.handle.bind(server);
}

export class ClientPadServer {
  private readonly db: Queryable;
  private readonly apiKeyPepper: string;
  private readonly payments: PaymentWebhookConfig;

  constructor(config: ClientPadServerConfig) {
    if (!config.apiKeyPepper.trim()) {
      throw new Error("apiKeyPepper is required.");
    }
    if (!config.db && !config.databaseUrl?.trim()) {
      throw new Error("databaseUrl or db is required.");
    }

    this.db = config.db ?? new Pool({ connectionString: config.databaseUrl });
    this.apiKeyPepper = config.apiKeyPepper;
    this.payments = config.payments ?? {};
  }

  async handle(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const path = normalizePath(url.pathname);

      if (path === "/leads" && request.method === "GET") return this.listLeads(request, url);
      if (path === "/leads" && request.method === "POST") return this.createLead(request);
      if (path === "/leads/upsert" && request.method === "POST") return this.upsertLead(request);
      if (path === "/clients" && request.method === "GET") return this.listClients(request, url);
      if (path === "/clients" && request.method === "POST") return this.createClient(request);
      if (path === "/usage" && request.method === "GET") return this.getUsage(request);
      if (path === "/payments/paystack/webhook" && request.method === "POST") {
        return this.handlePaymentWebhook(request, "paystack");
      }
      if (path === "/payments/flutterwave/webhook" && request.method === "POST") {
        return this.handlePaymentWebhook(request, "flutterwave");
      }

      return jsonError("Route not found.", 404);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error.";
      return jsonError(message, 500);
    }
  }

  private async listLeads(request: Request, url: URL) {
    const context = await this.requireApiKey(request, ["leads:read"]);
    if (context instanceof Response) return context;

    const limit = parseLimit(url.searchParams.get("limit"));
    const offset = parseOffset(url.searchParams.get("offset"));
    const status = url.searchParams.get("status");

    if (status && !isLeadStatus(status)) {
      return jsonError("Invalid lead status.", 400);
    }

    const values: QueryValue[] = [context.workspaceId, limit, offset];
    let statusFilter = "";
    if (status) {
      values.push(status);
      statusFilter = "and status = $4";
    }

    const { rows } = await this.db.query(
      `
        select
          id,
          workspace_id,
          name,
          phone,
          source,
          service_interest,
          status,
          owner_user_id,
          next_follow_up_at,
          urgency,
          budget_clue,
          notes,
          intent,
          ai_summary,
          created_at,
          updated_at
        from leads
        where workspace_id = $1
        ${statusFilter}
        order by created_at desc
        limit $2 offset $3
      `,
      values
    );

    await this.auditPublicApiEvent(context, request, "leads.list", { limit, offset, status });
    return Response.json({ data: rows, pagination: { limit, offset } });
  }

  private async createLead(request: Request) {
    const context = await this.requireApiKey(request, ["leads:write"]);
    if (context instanceof Response) return context;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return jsonError("Request body must be a JSON object.", 400);

    const payload = normalizeLeadPayload(body as Record<string, unknown>);
    if (!payload.ok) return jsonError(payload.error, 400);

    const { rows } = await this.db.query<{ id: string }>(
      `
        insert into leads (
          workspace_id,
          name,
          phone,
          source,
          service_interest,
          status,
          next_follow_up_at,
          urgency,
          budget_clue,
          notes,
          intent,
          ai_summary
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        returning id
      `,
      [
        context.workspaceId,
        payload.name,
        payload.phone,
        payload.source,
        payload.service_interest,
        payload.status,
        payload.next_follow_up_at,
        payload.urgency,
        payload.budget_clue,
        payload.notes,
        payload.intent,
        payload.ai_summary,
      ]
    );

    const leadId = rows[0]?.id;
    await this.auditPublicApiEvent(context, request, "leads.create", {
      lead_id: leadId,
      source: payload.source,
      status: payload.status,
    });
    return Response.json({ data: { id: leadId } }, { status: 201 });
  }


  private async upsertLead(request: Request) {
    const context = await this.requireApiKey(request, ["leads:write"]);
    if (context instanceof Response) return context;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return jsonError("Request body must be a JSON object.", 400);

    const payload = normalizeLeadPayload(body as Record<string, unknown>);
    if (!payload.ok) return jsonError(payload.error, 400);

    const { rows } = await this.db.query<{ id: string }>(
      `
        insert into leads (
          workspace_id,
          name,
          phone,
          source,
          service_interest,
          status,
          next_follow_up_at,
          urgency,
          budget_clue,
          notes
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        on conflict (workspace_id, phone)
        do update set
          name = excluded.name,
          source = excluded.source,
          service_interest = excluded.service_interest,
          status = excluded.status,
          next_follow_up_at = excluded.next_follow_up_at,
          urgency = excluded.urgency,
          budget_clue = excluded.budget_clue,
          notes = excluded.notes,
          updated_at = now()
        returning id
      `,
      [
        context.workspaceId,
        payload.name,
        payload.phone,
        payload.source,
        payload.service_interest,
        payload.status,
        payload.next_follow_up_at,
        payload.urgency,
        payload.budget_clue,
        payload.notes,
      ]
    );

    const leadId = rows[0]?.id;
    await this.auditPublicApiEvent(context, request, "leads.upsert", {
      lead_id: leadId,
      source: payload.source,
      status: payload.status,
    });
    return Response.json({ data: { id: leadId } });
  }

  private async listClients(request: Request, url: URL) {
    const context = await this.requireApiKey(request, ["clients:read"]);
    if (context instanceof Response) return context;

    const limit = parseLimit(url.searchParams.get("limit"));
    const offset = parseOffset(url.searchParams.get("offset"));
    const q = optionalString(url.searchParams.get("q"));

    const values: QueryValue[] = [context.workspaceId, limit, offset];
    let searchFilter = "";
    if (q) {
      values.push(`%${q}%`);
      searchFilter = `
        and (
          business_name ilike $4
          or primary_contact ilike $4
          or email ilike $4
          or phone ilike $4
        )
      `;
    }

    const { rows } = await this.db.query(
      `
        select
          id,
          workspace_id,
          business_name,
          primary_contact,
          phone,
          email,
          location,
          notes,
          created_at,
          updated_at
        from clients
        where workspace_id = $1
        ${searchFilter}
        order by created_at desc
        limit $2 offset $3
      `,
      values
    );

    await this.auditPublicApiEvent(context, request, "clients.list", { limit, offset, q });
    return Response.json({ data: rows, pagination: { limit, offset } });
  }

  private async createClient(request: Request) {
    const context = await this.requireApiKey(request, ["clients:write"]);
    if (context instanceof Response) return context;

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") return jsonError("Request body must be a JSON object.", 400);

    const payload = normalizeClientPayload(body as Record<string, unknown>);
    if (!payload.ok) return jsonError(payload.error, 400);

    const { rows } = await this.db.query<{ id: string }>(
      `
        insert into clients (
          workspace_id,
          business_name,
          primary_contact,
          phone,
          email,
          location,
          notes
        )
        values ($1, $2, $3, $4, $5, $6, $7)
        returning id
      `,
      [
        context.workspaceId,
        payload.business_name,
        payload.primary_contact,
        payload.phone,
        payload.email,
        payload.location,
        payload.notes,
      ]
    );

    const clientId = rows[0]?.id;
    await this.auditPublicApiEvent(context, request, "clients.create", { client_id: clientId });
    return Response.json({ data: { id: clientId } }, { status: 201 });
  }

  private async handlePaymentWebhook(request: Request, provider: PaymentProvider) {
    const rawBody = await request.text();
    let webhook: VerifiedPaymentWebhook;
    try {
      webhook = verifyPaymentWebhook({
        provider,
        rawBody,
        headers: request.headers,
        secretKey: provider === "paystack" ? this.payments.paystackSecretKey : this.payments.flutterwaveSecretKey,
        webhookSecret: provider === "flutterwave" ? this.payments.flutterwaveWebhookSecret : undefined,
      });
    } catch {
      return jsonError("Invalid payment webhook payload.", 400);
    }

    if (!webhook.verified) return jsonError("Invalid payment webhook signature.", 401);
    if (!webhook.reference) return jsonError("Payment webhook is missing a reference.", 400);

    const updated = await this.recordPaymentWebhook(webhook);
    if (updated && webhook.status === "paid") {
      await this.completePaidLead(updated);
    }

    return Response.json({ received: true });
  }

  private async recordPaymentWebhook(webhook: VerifiedPaymentWebhook): Promise<ConfirmedPaymentRecord | null> {
    const { rows } = await this.db.query<PaymentWebhookUpdateRow>(
      `
        update payments
        set
          status = $3,
          provider_payment_id = coalesce($4, provider_payment_id),
          provider_event = $5,
          webhook_payload = $6,
          paid_at = case when $3 = 'paid' then coalesce(paid_at, now()) else paid_at end,
          updated_at = now()
        where provider = $1
          and provider_reference = $2
        returning
          id,
          workspace_id,
          lead_id,
          provider,
          provider_reference,
          amount,
          currency,
          service_item_reference,
          customer_phone,
          customer_name
      `,
      [
        webhook.provider,
        webhook.reference,
        webhook.status,
        webhook.providerPaymentId,
        webhook.event,
        webhook.payload,
      ]
    );

    const row = rows[0];
    if (!row) return null;
    return {
      workspaceId: row.workspace_id,
      leadId: row.lead_id,
      paymentId: row.id,
      phone: row.customer_phone,
      name: row.customer_name,
      amount: row.amount,
      currency: row.currency,
      serviceItemReference: row.service_item_reference,
      provider: row.provider,
      reference: row.provider_reference,
    };
  }

  private async completePaidLead(payment: ConfirmedPaymentRecord) {
    await this.db.query(
      `
        update leads
        set status = 'paid', updated_at = now()
        where id = $1 and workspace_id = $2
      `,
      [payment.leadId, payment.workspaceId]
    );

    if (this.payments.sendWhatsAppMessage) {
      await this.payments.sendWhatsAppMessage(payment);
    }

    if (this.payments.triggerReviewRequest) {
      await this.payments.triggerReviewRequest(payment);
    }
  }

  private async requireApiKey(
    request: Request,
    requiredScopes: ApiScope[]
  ): Promise<ApiKeyPrincipal | Response> {
    const rawKey = parseBearerToken(request.headers.get("authorization"));
    if (!rawKey) return jsonError("Missing API key. Send Authorization: Bearer <api_key>.", 401);

    const principal = await this.verifyApiKey(rawKey);
    if (!principal) return jsonError("Invalid or revoked API key.", 401);

    const allowed = requiredScopes.every((scope) => principal.scopes.includes(scope));
    if (!allowed) return jsonError("API key does not have the required scope.", 403);

    const usage = await this.applyUsageLimits(principal, request);
    if (!usage.allowed) {
      await this.recordUsageEvent(principal, request, {
        statusCode: usage.statusCode ?? 429,
        billable: false,
        rejectedReason: usage.reason,
      });
      return jsonError(usage.reason ?? "API key usage limit exceeded.", usage.statusCode ?? 429);
    }

    await this.markApiKeyUsed(principal, request);
    return principal;
  }

  private async verifyApiKey(rawKey: string): Promise<ApiKeyPrincipal | null> {
    const publicPrefix = getPublicPrefix(rawKey);
    if (!publicPrefix) return null;

    const { rows } = await this.db.query<ApiKeyRow>(
      `
        select
          id,
          workspace_id,
          name,
          key_hash,
          scopes,
          billing_mode,
          monthly_request_limit,
          rate_limit_per_minute
        from api_keys
        where public_prefix = $1
          and revoked_at is null
          and (expires_at is null or expires_at > now())
        limit 1
      `,
      [publicPrefix]
    );

    const row = rows[0];
    if (!row) return null;

    const candidateHash = hashApiKey(rawKey, this.apiKeyPepper);
    if (!safeEqual(candidateHash, row.key_hash)) return null;

    return {
      apiKeyId: row.id,
      workspaceId: row.workspace_id,
      name: row.name,
      scopes: row.scopes ?? [],
      billingMode: row.billing_mode ?? "self_hosted",
      monthlyRequestLimit: row.monthly_request_limit,
      rateLimitPerMinute: row.rate_limit_per_minute,
    };
  }

  private async applyUsageLimits(
    principal: ApiKeyPrincipal,
    request: Request
  ): Promise<UsageResult> {
    const rateLimit = principal.rateLimitPerMinute;
    if (rateLimit !== null && rateLimit > 0) {
      const rate = await this.incrementRateLimitWindow(principal, rateLimit);
      if (!rate.allowed) {
        return { allowed: false, reason: "API key rate limit exceeded.", statusCode: 429 };
      }
    }

    const monthlyLimit = principal.monthlyRequestLimit;
    const month = getCurrentMonthStart();
    if (monthlyLimit !== null && monthlyLimit > 0) {
      const usage = await this.incrementMonthlyUsage(principal, month, monthlyLimit);
      if (!usage.allowed) {
        return { allowed: false, reason: "API key monthly quota exceeded.", statusCode: 429 };
      }
    } else {
      await this.incrementUnlimitedMonthlyUsage(principal, month);
    }

    await this.recordUsageEvent(principal, request, { statusCode: null, billable: true });
    return { allowed: true, reason: null, statusCode: null };
  }

  private async incrementRateLimitWindow(principal: ApiKeyPrincipal, limit: number) {
    const { rows } = await this.db.query<RateLimitWindowRow>(
      `
        insert into api_key_rate_limit_windows (
          api_key_id,
          window_start,
          request_count
        )
        values ($1, date_trunc('minute', now()), 1)
        on conflict (api_key_id, window_start)
        do update set
          request_count = api_key_rate_limit_windows.request_count + 1,
          updated_at = now()
        returning
          request_count,
          request_count <= $2 as allowed
      `,
      [principal.apiKeyId, limit]
    );

    return rows[0] ?? { request_count: 0, allowed: true };
  }

  private async incrementMonthlyUsage(
    principal: ApiKeyPrincipal,
    month: string,
    limit: number
  ) {
    const { rows } = await this.db.query<UsageMonthRow>(
      `
        insert into api_key_usage_months (
          api_key_id,
          workspace_id,
          month,
          request_count
        )
        values ($1, $2, $3::date, 1)
        on conflict (api_key_id, month)
        do update set
          request_count = api_key_usage_months.request_count + 1,
          updated_at = now()
        returning
          request_count,
          rejected_count
      `,
      [principal.apiKeyId, principal.workspaceId, month]
    );

    const usage = rows[0] ?? { request_count: 0, rejected_count: 0, allowed: true };
    if (usage.request_count <= limit) {
      return { ...usage, allowed: true };
    }

    await this.db.query(
      `
        update api_key_usage_months
        set
          request_count = greatest(request_count - 1, 0),
          rejected_count = rejected_count + 1,
          updated_at = now()
        where api_key_id = $1
          and month = $2::date
      `,
      [principal.apiKeyId, month]
    );

    return { ...usage, request_count: limit, allowed: false };
  }

  private async incrementUnlimitedMonthlyUsage(principal: ApiKeyPrincipal, month: string) {
    await this.db.query(
      `
        insert into api_key_usage_months (
          api_key_id,
          workspace_id,
          month,
          request_count
        )
        values ($1, $2, $3::date, 1)
        on conflict (api_key_id, month)
        do update set
          request_count = api_key_usage_months.request_count + 1,
          updated_at = now()
      `,
      [principal.apiKeyId, principal.workspaceId, month]
    );
  }

  private async markApiKeyUsed(principal: ApiKeyPrincipal, request: Request) {
    await this.db.query(
      `
        update api_keys
        set last_used_at = now(), last_used_ip = $2
        where id = $1
      `,
      [principal.apiKeyId, getRequestIp(request)]
    );
  }

  private async auditPublicApiEvent(
    principal: ApiKeyPrincipal,
    request: Request,
    eventType: string,
    metadata?: Record<string, unknown>
  ) {
    await this.db.query(
      `
        insert into api_key_audit_events (
          api_key_id,
          workspace_id,
          event_type,
          ip_address,
          user_agent,
          metadata
        )
        values ($1, $2, $3, $4, $5, $6::jsonb)
      `,
      [
        principal.apiKeyId,
        principal.workspaceId,
        eventType,
        getRequestIp(request),
        request.headers.get("user-agent"),
        JSON.stringify(metadata ?? {}),
      ]
    );
  }

  private async recordUsageEvent(
    principal: ApiKeyPrincipal,
    request: Request,
    options: {
      statusCode: number | null;
      billable: boolean;
      rejectedReason?: string | null;
    }
  ) {
    const url = new URL(request.url);
    await this.db.query(
      `
        insert into api_key_usage_events (
          api_key_id,
          workspace_id,
          route,
          method,
          status_code,
          billable,
          rejected_reason,
          ip_address,
          user_agent
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `,
      [
        principal.apiKeyId,
        principal.workspaceId,
        normalizePath(url.pathname),
        request.method,
        options.statusCode,
        options.billable,
        options.rejectedReason ?? null,
        getRequestIp(request),
        request.headers.get("user-agent"),
      ]
    );
  }

  private async getUsage(request: Request) {
    const context = await this.requireApiKey(request, ["usage:read"]);
    if (context instanceof Response) return context;

    const month = getCurrentMonthStart();
    const { rows } = await this.db.query<UsageSummaryRow>(
      `
        select request_count, rejected_count
        from api_key_usage_months
        where api_key_id = $1
          and month = $2::date
        limit 1
      `,
      [context.apiKeyId, month]
    );

    const requestCount = rows[0]?.request_count ?? 0;
    const rejectedCount = rows[0]?.rejected_count ?? 0;
    const remainingRequests =
      context.monthlyRequestLimit === null
        ? null
        : Math.max(context.monthlyRequestLimit - requestCount, 0);

    const data: ApiKeyUsageSummary = {
      api_key_id: context.apiKeyId,
      workspace_id: context.workspaceId,
      billing_mode: context.billingMode,
      month,
      request_count: requestCount,
      rejected_count: rejectedCount,
      monthly_request_limit: context.monthlyRequestLimit,
      remaining_requests: remainingRequests,
      rate_limit_per_minute: context.rateLimitPerMinute,
    };

    return Response.json({ data });
  }
}

function normalizePath(pathname: string) {
  const apiIndex = pathname.indexOf("/api/public/v1");
  const normalized = apiIndex >= 0 ? pathname.slice(apiIndex + "/api/public/v1".length) : pathname;
  return `/${normalized.replace(/^\/+|\/+$/g, "")}`;
}

function hashApiKey(rawKey: string, pepper: string) {
  return createHash("sha256").update(`${pepper}:${rawKey}`).digest("hex");
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

function getRequestIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    null
  );
}

function jsonError(message: string, status: number) {
  return Response.json({ error: { message } }, { status });
}

function getCurrentMonthStart() {
  const now = new Date();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${now.getUTCFullYear()}-${month}-01`;
}

function parseLimit(value: string | null) {
  const limit = Number(value ?? "50");
  if (!Number.isFinite(limit)) return 50;
  return Math.min(Math.max(Math.trunc(limit), 1), 100);
}

function parseOffset(value: string | null) {
  const offset = Number(value ?? "0");
  if (!Number.isFinite(offset)) return 0;
  return Math.max(Math.trunc(offset), 0);
}

function optionalString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeLeadPayload(body: Record<string, unknown>) {
  const name = optionalString(body.name);
  const rawPhone = optionalString(body.phone);
  const phone = normalizeNigerianPhoneNumber(rawPhone);
  const status = optionalString(body.status) ?? "new";

  if (!name) return { ok: false as const, error: "name is required." };
  if (!rawPhone) return { ok: false as const, error: "phone is required." };
  if (!phone) return { ok: false as const, error: "phone must be a valid Nigerian phone number." };
  if (!isLeadStatus(status)) {
    return { ok: false as const, error: "Invalid lead status." };
  }

  return {
    ok: true as const,
    name,
    phone,
    source: optionalString(body.source),
    service_interest: optionalString(body.service_interest),
    status: status as LeadStatus,
    next_follow_up_at: optionalString(body.next_follow_up_at),
    urgency: optionalString(body.urgency),
    budget_clue: optionalString(body.budget_clue),
    notes: optionalString(body.notes),
    intent: optionalString(body.intent),
    ai_summary: optionalString(body.ai_summary),
  };
}

function normalizeClientPayload(body: Record<string, unknown>) {
  const businessName = optionalString(body.business_name);
  if (!businessName) return { ok: false as const, error: "business_name is required." };

  return {
    ok: true as const,
    business_name: businessName,
    primary_contact: optionalString(body.primary_contact),
    phone: optionalString(body.phone),
    email: optionalString(body.email),
    location: optionalString(body.location),
    notes: optionalString(body.notes),
  };
}
