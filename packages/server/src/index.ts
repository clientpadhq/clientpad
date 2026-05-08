import { createHash, timingSafeEqual } from "node:crypto";
import { Pool } from "pg";
import {
  getPublicPrefix,
  isLeadStatus,
  parseBearerToken,
  type ApiScope,
  type LeadStatus,
} from "@abdulmuiz44/clientpad-core";

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
};

export type ClientPadServerConfig = {
  databaseUrl?: string;
  apiKeyPepper: string;
  db?: Queryable;
};

export type ClientPadHandler = (request: Request) => Promise<Response>;

type ApiKeyRow = {
  id: string;
  workspace_id: string;
  name: string;
  key_hash: string;
  scopes: ApiScope[] | null;
};

export function createClientPadHandler(config: ClientPadServerConfig): ClientPadHandler {
  const server = new ClientPadServer(config);
  return server.handle.bind(server);
}

export class ClientPadServer {
  private readonly db: Queryable;
  private readonly apiKeyPepper: string;

  constructor(config: ClientPadServerConfig) {
    if (!config.apiKeyPepper.trim()) {
      throw new Error("apiKeyPepper is required.");
    }
    if (!config.db && !config.databaseUrl?.trim()) {
      throw new Error("databaseUrl or db is required.");
    }

    this.db = config.db ?? new Pool({ connectionString: config.databaseUrl });
    this.apiKeyPepper = config.apiKeyPepper;
  }

  async handle(request: Request): Promise<Response> {
    try {
      const url = new URL(request.url);
      const path = normalizePath(url.pathname);

      if (path === "/leads" && request.method === "GET") return this.listLeads(request, url);
      if (path === "/leads" && request.method === "POST") return this.createLead(request);
      if (path === "/clients" && request.method === "GET") return this.listClients(request, url);
      if (path === "/clients" && request.method === "POST") return this.createClient(request);

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
          notes
        )
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
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
    await this.auditPublicApiEvent(context, request, "leads.create", {
      lead_id: leadId,
      source: payload.source,
      status: payload.status,
    });
    return Response.json({ data: { id: leadId } }, { status: 201 });
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

    await this.markApiKeyUsed(principal, request);
    return principal;
  }

  private async verifyApiKey(rawKey: string): Promise<ApiKeyPrincipal | null> {
    const publicPrefix = getPublicPrefix(rawKey);
    if (!publicPrefix) return null;

    const { rows } = await this.db.query<ApiKeyRow>(
      `
        select id, workspace_id, name, key_hash, scopes
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
    };
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
  const phone = optionalString(body.phone);
  const status = optionalString(body.status) ?? "new";

  if (!name) return { ok: false as const, error: "name is required." };
  if (!phone) return { ok: false as const, error: "phone is required." };
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
