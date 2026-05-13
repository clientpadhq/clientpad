import type { Session, Plan, Project, ProjectFormState, ApiKeyResult, UsageRow, KeyFormState } from "../types";
import { demoPlans, demoProjects, demoUsage } from "./demo-data";
import { slugify } from "./formatters";

export class CloudApi {
  constructor(private readonly session: Session) {}

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (this.session.demo) return demoResponse(path, init) as T;

    const response = await fetch(`${this.session.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.session.adminToken}`,
        ...init.headers,
      },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error?.message ?? `Request failed with ${response.status}`);
    return body as T;
  }

  async plans() {
    const body = await this.request<{ data: Plan[] }>("/plans");
    return body.data;
  }

  async projects() {
    const body = await this.request<{ data: Project[] }>("/projects");
    return body.data;
  }

  async createProject(input: ProjectFormState) {
    const body = await this.request<{ data: Project }>("/projects", { method: "POST", body: JSON.stringify(input) });
    return body.data;
  }

  async createKey(input: KeyFormState) {
    const body = await this.request<{ data: ApiKeyResult }>("/api-keys", {
      method: "POST",
      body: JSON.stringify({ ...input, scopes: input.scopes.split(",").map((scope) => scope.trim()).filter(Boolean) }),
    });
    return body.data;
  }

  async usage(workspaceId: string) {
    const body = await this.request<{ data: UsageRow[] }>(`/usage?workspace_id=${encodeURIComponent(workspaceId)}`);
    return body.data;
  }
}

function demoResponse(path: string, init: RequestInit) {
  if (path === "/plans") return { data: demoPlans };
  if (path === "/projects" && init.method === "POST") {
    const body = JSON.parse(String(init.body ?? "{}")) as ProjectFormState;
    return {
      data: {
        id: `project_${Date.now()}`,
        workspace_id: `workspace_${Date.now()}`,
        name: body.name || "New project",
        slug: slugify(body.name || "new-project"),
        environment: "production",
        owner_email: body.owner_email || "founder@example.com",
        created_at: new Date().toISOString(),
      },
    };
  }
  if (path === "/projects") return { data: demoProjects };
  if (path === "/api-keys") {
    const body = JSON.parse(String(init.body ?? "{}")) as KeyFormState;
    return {
      data: {
        id: `api_key_${Date.now()}`,
        key: "cp_live_demo123_generated_secret_444f",
        scopes: Array.isArray(body.scopes) ? body.scopes : body.scopes.split(",").map((scope) => scope.trim()).filter(Boolean),
        billing_mode: body.plan_code === "free" ? "cloud_free" : "cloud_paid",
        monthly_request_limit: 10_000_000,
        rate_limit_per_minute: 1200,
      },
    };
  }
  if (path.startsWith("/usage")) return { data: demoUsage };
  return { data: [] };
}

export function buildPublicApiUrl(baseUrl: string): string {
  return baseUrl.replace("/api/cloud/v1", "/api/public/v1");
}
