export const LEAD_STATUSES = ["new", "contacted", "qualified", "unqualified"] as const;

export type LeadStatus = (typeof LEAD_STATUSES)[number];

export type PaginationParams = {
  limit?: number | null;
  offset?: number | null;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    limit: number;
    offset: number;
  };
};

export type CreatedIdResponse = {
  data: {
    id: string;
  };
};

export type Lead = {
  id: string;
  workspace_id: string;
  name: string;
  phone: string;
  source: string | null;
  service_interest: string | null;
  status: LeadStatus;
  owner_user_id: string | null;
  next_follow_up_at: string | null;
  urgency: string | null;
  budget_clue: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateLeadInput = {
  name: string;
  phone: string;
  source?: string | null;
  service_interest?: string | null;
  status?: LeadStatus | null;
  next_follow_up_at?: string | null;
  urgency?: string | null;
  budget_clue?: string | null;
  notes?: string | null;
};

export type ListLeadsParams = PaginationParams & {
  status?: LeadStatus | null;
};

export type Client = {
  id: string;
  workspace_id: string;
  business_name: string;
  primary_contact: string | null;
  phone: string | null;
  email: string | null;
  location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateClientInput = {
  business_name: string;
  primary_contact?: string | null;
  phone?: string | null;
  email?: string | null;
  location?: string | null;
  notes?: string | null;
};

export type ListClientsParams = PaginationParams & {
  q?: string | null;
};

export type ClientPadErrorPayload = {
  error?: {
    message?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type ApiKeyBillingMode = "self_hosted" | "cloud_free" | "cloud_paid" | "cloud_enterprise";

export type ApiKeyUsageSummary = {
  api_key_id: string;
  workspace_id: string;
  billing_mode: ApiKeyBillingMode;
  month: string;
  request_count: number;
  rejected_count: number;
  monthly_request_limit: number | null;
  remaining_requests: number | null;
  rate_limit_per_minute: number | null;
};

export type FetchLike = (input: string | URL, init?: RequestInit) => Promise<Response>;

export type ClientPadConfig = {
  baseUrl: string;
  apiKey: string;
  fetch?: FetchLike;
};

type RequestOptions = {
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | null | undefined>;
  body?: unknown;
};

type ResourceConfig = {
  request<T>(path: string, options?: RequestOptions): Promise<T>;
};

export class ClientPadError extends Error {
  readonly name = "ClientPadError";
  readonly status: number;
  readonly payload: ClientPadErrorPayload | string | null;

  constructor(status: number, payload: ClientPadErrorPayload | string | null) {
    super(getErrorMessage(status, payload));
    this.status = status;
    this.payload = payload;
  }
}

export class ClientPad {
  readonly leads: LeadsResource;
  readonly clients: ClientsResource;
  readonly usage: UsageResource;

  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly fetcher: FetchLike;

  constructor(config: ClientPadConfig) {
    if (!config.baseUrl.trim()) {
      throw new Error("ClientPad baseUrl is required.");
    }
    if (!config.apiKey.trim()) {
      throw new Error("ClientPad apiKey is required.");
    }

    this.baseUrl = normalizeBaseUrl(config.baseUrl);
    this.apiKey = config.apiKey;
    this.fetcher = config.fetch ?? globalThis.fetch?.bind(globalThis);

    if (!this.fetcher) {
      throw new Error("ClientPad requires a fetch implementation.");
    }

    const resourceConfig: ResourceConfig = {
      request: this.request.bind(this),
    };

    this.leads = new LeadsResource(resourceConfig);
    this.clients = new ClientsResource(resourceConfig);
    this.usage = new UsageResource(resourceConfig);
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const url = buildUrl(this.baseUrl, path, options.query);
    const headers = new Headers({
      Authorization: `Bearer ${this.apiKey}`,
      Accept: "application/json",
    });

    let body: string | undefined;
    if (options.body !== undefined) {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(options.body);
    }

    const response = await this.fetcher(url, {
      method: options.method ?? "GET",
      headers,
      body,
    });

    const payload = await readResponsePayload(response);
    if (!response.ok) {
      throw new ClientPadError(response.status, payload);
    }

    return payload as T;
  }
}

class LeadsResource {
  constructor(private readonly config: ResourceConfig) {}

  list(params?: ListLeadsParams): Promise<PaginatedResponse<Lead>> {
    return this.config.request<PaginatedResponse<Lead>>("/leads", { query: params });
  }

  create(input: CreateLeadInput): Promise<CreatedIdResponse> {
    return this.config.request<CreatedIdResponse>("/leads", {
      method: "POST",
      body: input,
    });
  }
}

class ClientsResource {
  constructor(private readonly config: ResourceConfig) {}

  list(params?: ListClientsParams): Promise<PaginatedResponse<Client>> {
    return this.config.request<PaginatedResponse<Client>>("/clients", { query: params });
  }

  create(input: CreateClientInput): Promise<CreatedIdResponse> {
    return this.config.request<CreatedIdResponse>("/clients", {
      method: "POST",
      body: input,
    });
  }
}

class UsageResource {
  constructor(private readonly config: ResourceConfig) {}

  retrieve(): Promise<{ data: ApiKeyUsageSummary }> {
    return this.config.request<{ data: ApiKeyUsageSummary }>("/usage");
  }
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.trim().replace(/\/+$/, "");
}

function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, string | number | boolean | null | undefined>
) {
  const url = new URL(`${normalizeBaseUrl(baseUrl)}/${path.replace(/^\/+/, "")}`);

  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  return url.toString();
}

async function readResponsePayload(
  response: Response
): Promise<ClientPadErrorPayload | string | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as ClientPadErrorPayload;
  }

  const text = await response.text();
  return text || null;
}

function getErrorMessage(status: number, payload: ClientPadErrorPayload | string | null) {
  if (typeof payload === "string" && payload) return payload;
  if (payload && typeof payload === "object" && payload.error?.message) {
    return payload.error.message;
  }
  return `ClientPad request failed with status ${status}.`;
}
