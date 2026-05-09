export const LEAD_STATUSES = ["new", "contacted", "qualified", "unqualified", "paid"];
export class ClientPadError extends Error {
    name = "ClientPadError";
    status;
    payload;
    constructor(status, payload) {
        super(getErrorMessage(status, payload));
        this.status = status;
        this.payload = payload;
    }
}
export class ClientPad {
    leads;
    clients;
    whatsapp;
    usage;
    baseUrl;
    apiKey;
    fetcher;
    constructor(config) {
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
        const resourceConfig = {
            request: this.request.bind(this),
        };
        this.leads = new LeadsResource(resourceConfig);
        this.clients = new ClientsResource(resourceConfig);
        this.whatsapp = new WhatsAppResource(resourceConfig);
        this.usage = new UsageResource(resourceConfig);
    }
    async request(path, options = {}) {
        const url = buildUrl(this.baseUrl, path, options.query);
        const headers = new Headers({
            Authorization: `Bearer ${this.apiKey}`,
            Accept: "application/json",
        });
        let body;
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
        return payload;
    }
}
class LeadsResource {
    config;
    constructor(config) {
        this.config = config;
    }
    list(params) {
        return this.config.request("/leads", { query: params });
    }
    create(input) {
        return this.config.request("/leads", {
            method: "POST",
            body: input,
        });
    }
    upsert(input) {
        return this.config.request("/leads/upsert", {
            method: "POST",
            body: input,
        });
    }
}
class ClientsResource {
    config;
    constructor(config) {
        this.config = config;
    }
    list(params) {
        return this.config.request("/clients", { query: params });
    }
    create(input) {
        return this.config.request("/clients", {
            method: "POST",
            body: input,
        });
    }
}
class WhatsAppResource {
    config;
    constructor(config) {
        this.config = config;
    }
    list(params) {
        return this.config.request("/whatsapp/conversations", {
            query: params,
        });
    }
    retrieve(id) {
        return this.config.request(`/whatsapp/conversations/${id}`);
    }
    messages(id, params) {
        return this.config.request(`/whatsapp/conversations/${id}/messages`, {
            query: params,
        });
    }
    suggestions(id) {
        return this.config.request(`/whatsapp/conversations/${id}/suggestions`);
    }
    reply(id, input) {
        return this.config.request(`/whatsapp/conversations/${id}/reply`, {
            method: "POST",
            body: input,
        });
    }
    approveSuggestion(id, input) {
        return this.config.request(`/whatsapp/conversations/${id}/approve-suggestion`, {
            method: "POST",
            body: input,
        });
    }
    updateStatus(id, input) {
        return this.config.request(`/whatsapp/conversations/${id}/status`, {
            method: "POST",
            body: input,
        });
    }
}
class UsageResource {
    config;
    constructor(config) {
        this.config = config;
    }
    retrieve() {
        return this.config.request("/usage");
    }
}
function normalizeBaseUrl(baseUrl) {
    return baseUrl.trim().replace(/\/+$/, "");
}
function buildUrl(baseUrl, path, query) {
    const url = new URL(`${normalizeBaseUrl(baseUrl)}/${path.replace(/^\/+/, "")}`);
    for (const [key, value] of Object.entries(query ?? {})) {
        if (value === undefined || value === null || value === "")
            continue;
        url.searchParams.set(key, String(value));
    }
    return url.toString();
}
async function readResponsePayload(response) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
        return (await response.json());
    }
    const text = await response.text();
    return text || null;
}
function getErrorMessage(status, payload) {
    if (typeof payload === "string" && payload)
        return payload;
    if (payload && typeof payload === "object" && payload.error?.message) {
        return payload.error.message;
    }
    return `ClientPad request failed with status ${status}.`;
}
//# sourceMappingURL=index.js.map