import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  BarChart3,
  BookOpen,
  Check,
  ChevronDown,
  Clipboard,
  CreditCard,
  Database,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  Plus,
  Search,
  Server,
  Settings,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import "./styles.css";

type Session = {
  baseUrl: string;
  adminToken: string;
  demo?: boolean;
};

type Plan = {
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

type Project = {
  id: string;
  workspace_id: string;
  name: string;
  slug: string;
  environment: string;
  owner_email: string | null;
  created_at: string;
};

type UsageRow = {
  api_key_id: string;
  name: string;
  billing_mode: string;
  monthly_request_limit: number | null;
  rate_limit_per_minute: number | null;
  request_count: number;
  rejected_count: number;
};

type ApiKeyResult = {
  id: string;
  key: string;
  scopes: string[];
  billing_mode: string;
  monthly_request_limit: number | null;
  rate_limit_per_minute: number | null;
};

type Page = "overview" | "projects" | "keys" | "usage" | "billing" | "docs" | "settings";

const sessionKey = "clientpad.cloud.session";

function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const saved = localStorage.getItem(sessionKey);
    return saved ? (JSON.parse(saved) as Session) : null;
  });

  if (!session) return <Login onLogin={setSession} />;

  return <Dashboard session={session} onLogout={() => {
    localStorage.removeItem(sessionKey);
    setSession(null);
  }} />;
}

function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const [baseUrl, setBaseUrl] = useState("http://localhost:3000/api/cloud/v1");
  const [adminToken, setAdminToken] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const normalized = baseUrl.replace(/\/+$/, "");
    try {
      const response = await fetch(`${normalized}/health`);
      if (!response.ok) throw new Error("Cloud API health check failed.");
      const next = { baseUrl: normalized, adminToken };
      localStorage.setItem(sessionKey, JSON.stringify(next));
      onLogin(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to ClientPad Cloud.");
    }
  }

  function preview() {
    const next = { baseUrl: "demo", adminToken: "demo", demo: true };
    localStorage.setItem(sessionKey, JSON.stringify(next));
    onLogin(next);
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <div className="brand-mark">CP</div>
        <h1>ClientPad Cloud</h1>
        <p>Sign in to manage hosted projects, API keys, quotas, usage, and billing.</p>
        <form onSubmit={submit} className="login-form">
          <label>
            Cloud API URL
            <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
          </label>
          <label>
            Admin token
            <input
              value={adminToken}
              type="password"
              autoComplete="current-password"
              onChange={(event) => setAdminToken(event.target.value)}
              placeholder="CLIENTPAD_CLOUD_ADMIN_TOKEN"
            />
          </label>
          {error ? <div className="form-error">{error}</div> : null}
          <button className="primary-button" type="submit">
            <Lock size={16} />
            Open dashboard
          </button>
          <button className="ghost-button" type="button" onClick={preview}>
            <LayoutDashboard size={16} />
            Preview dashboard
          </button>
        </form>
      </section>
      <aside className="login-aside">
        <div>
          <h2>Hosted API keys become revenue.</h2>
          <p>Meter requests, enforce plan quotas, and give developers a trustworthy activity dashboard.</p>
        </div>
        <div className="login-grid">
          <Metric label="Free quota" value="1k" />
          <Metric label="Developer" value="100k" />
          <Metric label="Business" value="1M" />
          <Metric label="Enterprise" value="SLA" />
        </div>
      </aside>
    </main>
  );
}

function Dashboard({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const api = useMemo(() => new CloudApi(session), [session]);
  const [page, setPage] = useState<Page>("overview");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [createdKey, setCreatedKey] = useState<ApiKeyResult | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try {
      const [planData, projectData] = await Promise.all([api.plans(), api.projects()]);
      setPlans(planData);
      setProjects(projectData);
      const workspace = selectedWorkspace || projectData[0]?.workspace_id || "";
      setSelectedWorkspace(workspace);
      if (workspace) setUsage(await api.usage(workspace));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh().catch((error) => setNotice(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createProject(input: ProjectFormState) {
    const project = await api.createProject(input);
    setNotice(`Created project ${project.name}`);
    await refresh();
  }

  async function createKey(input: KeyFormState) {
    const key = await api.createKey(input);
    setCreatedKey(key);
    setNotice("API key created. Copy it now; it will not be shown again.");
    await refresh();
  }

  const totalRequests = usage.reduce((sum, row) => sum + Number(row.request_count || 0), 0);
  const rejectedRequests = usage.reduce((sum, row) => sum + Number(row.rejected_count || 0), 0);
  const selectedProject = projects.find((project) => project.workspace_id === selectedWorkspace);
  const plan = plans[1] ?? plans[0];

  return (
    <div className="app-shell">
      <Sidebar page={page} setPage={setPage} />
      <div className="main-shell">
        <header className="topbar">
          <div className="search">
            <Search size={16} />
            <input placeholder="Search projects, keys, docs" />
          </div>
          <select value={selectedWorkspace} onChange={(event) => setSelectedWorkspace(event.target.value)}>
            {projects.map((project) => (
              <option key={project.id} value={project.workspace_id}>{project.name}</option>
            ))}
          </select>
          <button className="ghost-button" onClick={onLogout}>
            <LogOut size={16} />
            Sign out
          </button>
        </header>

        {notice ? <div className="notice"><Check size={16} />{notice}</div> : null}
        {createdKey ? <NewKeyBanner apiKey={createdKey.key} onDismiss={() => setCreatedKey(null)} /> : null}

        {page === "overview" && (
          <Overview
            loading={loading}
            totalRequests={totalRequests}
            rejectedRequests={rejectedRequests}
            selectedProject={selectedProject}
            usage={usage}
            plan={plan}
            setPage={setPage}
          />
        )}
        {page === "projects" && <Projects projects={projects} onCreate={createProject} />}
        {page === "keys" && <Keys workspaceId={selectedWorkspace} onCreate={createKey} />}
        {page === "usage" && <Usage usage={usage} selectedProject={selectedProject} />}
        {page === "billing" && <Billing plans={plans} />}
        {page === "docs" && <Docs selectedProject={selectedProject} />}
        {page === "settings" && <SettingsPage session={session} />}
      </div>
    </div>
  );
}

function Sidebar({ page, setPage }: { page: Page; setPage: (page: Page) => void }) {
  const items: Array<[Page, React.ReactNode, string]> = [
    ["overview", <LayoutDashboard size={17} />, "Overview"],
    ["projects", <Database size={17} />, "Projects"],
    ["keys", <KeyRound size={17} />, "API Keys"],
    ["usage", <BarChart3 size={17} />, "Usage"],
    ["billing", <CreditCard size={17} />, "Billing"],
    ["docs", <BookOpen size={17} />, "Docs"],
    ["settings", <Settings size={17} />, "Settings"],
  ];

  return (
    <aside className="sidebar">
      <div className="sidebar-brand"><span>CP</span>ClientPad</div>
      <nav>
        {items.map(([id, icon, label]) => (
          <button key={id} className={page === id ? "active" : ""} onClick={() => setPage(id)}>
            {icon}{label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function Overview({
  loading,
  totalRequests,
  rejectedRequests,
  selectedProject,
  usage,
  plan,
  setPage,
}: {
  loading: boolean;
  totalRequests: number;
  rejectedRequests: number;
  selectedProject?: Project;
  usage: UsageRow[];
  plan?: Plan;
  setPage: (page: Page) => void;
}) {
  const limit = usage[0]?.monthly_request_limit ?? plan?.monthly_request_limit ?? null;
  const remaining = limit === null ? null : Math.max(limit - totalRequests, 0);

  return (
    <section className="page-grid">
      <div className="page-heading">
        <div>
          <h1>Developer dashboard</h1>
          <p>Monitor hosted API keys, quota burn, projects, and billing readiness.</p>
        </div>
        <button className="primary-button" onClick={() => setPage("keys")}><Plus size={16} />Create key</button>
      </div>

      <div className="metric-row">
        <Metric label="Requests this month" value={loading ? "..." : totalRequests.toLocaleString()} />
        <Metric label="Rejected" value={rejectedRequests.toLocaleString()} />
        <Metric label="Remaining" value={remaining === null ? "Unlimited" : remaining.toLocaleString()} />
        <Metric label="Project" value={selectedProject?.slug ?? "none"} />
      </div>

      <section className="surface wide">
        <div className="section-title">
          <h2>Usage trend</h2>
          <button className="ghost-button" onClick={() => setPage("usage")}>View activity</button>
        </div>
        <div className="chart">
          {[42, 64, 38, 78, 52, 88, 71, 93, 69, 84, 58, 76].map((height, index) => (
            <span key={index} style={{ height: `${height}%` }} />
          ))}
        </div>
      </section>

      <section className="surface">
        <div className="section-title"><h2>Plan</h2><Sparkles size={17} /></div>
        <p className="plan-name">{plan?.name ?? "Free"}</p>
        <p className="muted">{plan?.monthly_request_limit?.toLocaleString() ?? "Unlimited"} requests/month</p>
        <button className="secondary-button" onClick={() => setPage("billing")}>Upgrade plan</button>
      </section>

      <section className="surface wide">
        <div className="section-title"><h2>Active keys</h2><ShieldCheck size={17} /></div>
        <DataTable
          headers={["Name", "Mode", "Requests", "Rejected", "Rate limit"]}
          rows={usage.map((row) => [
            row.name,
            row.billing_mode,
            row.request_count.toLocaleString(),
            row.rejected_count.toLocaleString(),
            row.rate_limit_per_minute ? `${row.rate_limit_per_minute}/min` : "Unlimited",
          ])}
        />
      </section>
    </section>
  );
}

type ProjectFormState = { name: string; owner_email: string; plan_code: string };
function Projects({ projects, onCreate }: { projects: Project[]; onCreate: (input: ProjectFormState) => Promise<void> }) {
  const [form, setForm] = useState<ProjectFormState>({ name: "", owner_email: "", plan_code: "free" });
  return (
    <section className="page-grid">
      <div className="page-heading"><div><h1>Projects</h1><p>Create hosted workspaces for developer teams.</p></div></div>
      <section className="surface">
        <h2>Create project</h2>
        <FormField label="Project name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
        <FormField label="Owner email" value={form.owner_email} onChange={(value) => setForm({ ...form, owner_email: value })} />
        <label className="field">Plan<select value={form.plan_code} onChange={(event) => setForm({ ...form, plan_code: event.target.value })}><option value="free">Free</option><option value="developer">Developer</option><option value="business">Business</option></select></label>
        <button className="primary-button" onClick={() => onCreate(form)}><Plus size={16} />Create project</button>
      </section>
      <section className="surface wide">
        <h2>Hosted projects</h2>
        <DataTable headers={["Name", "Slug", "Workspace", "Owner", "Environment"]} rows={projects.map((p) => [p.name, p.slug, p.workspace_id, p.owner_email ?? "-", p.environment])} />
      </section>
    </section>
  );
}

type KeyFormState = {
  workspace_id: string;
  name: string;
  plan_code: string;
  scopes: string;
};
function Keys({ workspaceId, onCreate }: { workspaceId: string; onCreate: (input: KeyFormState) => Promise<void> }) {
  const [form, setForm] = useState<KeyFormState>({
    workspace_id: workspaceId,
    name: "Production key",
    plan_code: "free",
    scopes: "leads:read,leads:write,clients:read,clients:write,usage:read",
  });

  useEffect(() => setForm((prev) => ({ ...prev, workspace_id: workspaceId })), [workspaceId]);

  return (
    <section className="page-grid">
      <div className="page-heading"><div><h1>API keys</h1><p>Issue hosted keys with plan limits, scopes, and usage tracking.</p></div></div>
      <section className="surface">
        <h2>Create API key</h2>
        <FormField label="Workspace ID" value={form.workspace_id} onChange={(value) => setForm({ ...form, workspace_id: value })} />
        <FormField label="Key name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
        <FormField label="Scopes" value={form.scopes} onChange={(value) => setForm({ ...form, scopes: value })} />
        <label className="field">Plan<select value={form.plan_code} onChange={(event) => setForm({ ...form, plan_code: event.target.value })}><option value="free">Free</option><option value="developer">Developer</option><option value="business">Business</option><option value="enterprise">Enterprise</option></select></label>
        <button className="primary-button" onClick={() => onCreate(form)}><KeyRound size={16} />Create key</button>
      </section>
      <section className="surface wide">
        <h2>Production guidance</h2>
        <div className="guidance-grid">
          <Guidance icon={<ShieldCheck />} title="Show once" text="Raw keys are returned only at creation. Store only hashed keys in PostgreSQL." />
          <Guidance icon={<Activity />} title="Metered" text="Each request writes usage events and updates monthly counters." />
          <Guidance icon={<Server />} title="Scoped" text="Scopes keep integrations limited to the permissions developers request." />
        </div>
      </section>
    </section>
  );
}

function Usage({ usage, selectedProject }: { usage: UsageRow[]; selectedProject?: Project }) {
  return (
    <section className="page-grid">
      <div className="page-heading"><div><h1>Usage activity</h1><p>{selectedProject?.name ?? "Selected project"} month-to-date quota and rejected request activity.</p></div></div>
      <section className="surface wide">
        <DataTable
          headers={["Key", "Billing mode", "Requests", "Rejected", "Monthly limit", "Rate limit"]}
          rows={usage.map((row) => [
            row.name,
            row.billing_mode,
            row.request_count.toLocaleString(),
            row.rejected_count.toLocaleString(),
            row.monthly_request_limit?.toLocaleString() ?? "Unlimited",
            row.rate_limit_per_minute ? `${row.rate_limit_per_minute}/min` : "Unlimited",
          ])}
        />
      </section>
    </section>
  );
}

function Billing({ plans }: { plans: Plan[] }) {
  return (
    <section className="page-grid">
      <div className="page-heading"><div><h1>Plans and billing</h1><p>Plan limits map directly to hosted API key quotas.</p></div></div>
      <div className="plans">
        {plans.map((plan) => (
          <section className="surface" key={plan.id}>
            <h2>{plan.name}</h2>
            <p className="price">{plan.monthly_price_cents === 0 ? "Free" : `$${(plan.monthly_price_cents / 100).toFixed(0)}/mo`}</p>
            <p className="muted">{plan.monthly_request_limit?.toLocaleString() ?? "Custom"} requests/month</p>
            <p className="muted">{plan.rate_limit_per_minute ? `${plan.rate_limit_per_minute}/minute` : "Custom rate limit"}</p>
            <button className={plan.code === "business" ? "primary-button" : "secondary-button"}>Select {plan.name}</button>
          </section>
        ))}
      </div>
    </section>
  );
}

function Docs({ selectedProject }: { selectedProject?: Project }) {
  const snippet = `import { ClientPad } from "@abdulmuiz44/clientpad-sdk";

const clientpad = new ClientPad({
  baseUrl: "https://api.clientpad.com/api/public/v1",
  apiKey: process.env.CLIENTPAD_API_KEY!,
});

await clientpad.leads.create({
  name: "Ada Customer",
  phone: "+234...",
  source: "Website",
});`;
  return (
    <section className="page-grid">
      <div className="page-heading"><div><h1>Quickstart</h1><p>Copy this into your app and replace the API key.</p></div></div>
      <section className="surface wide code-surface">
        <div className="section-title"><h2>{selectedProject?.name ?? "ClientPad"} SDK setup</h2><CopyButton text={snippet} /></div>
        <pre>{snippet}</pre>
      </section>
    </section>
  );
}

function SettingsPage({ session }: { session: Session }) {
  return (
    <section className="page-grid">
      <div className="page-heading"><div><h1>Settings</h1><p>Control-plane connection and deployment details.</p></div></div>
      <section className="surface">
        <h2>Connection</h2>
        <p className="muted">Cloud API URL</p>
        <code>{session.baseUrl}</code>
      </section>
    </section>
  );
}

class CloudApi {
  constructor(private readonly session: Session) {}

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (this.session.demo) {
      return demoResponse(path, init) as T;
    }

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
    const body = await this.request<{ data: Plan[] }>("/plans", { headers: {} });
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
      body: JSON.stringify({ ...input, scopes: input.scopes.split(",").map((scope) => scope.trim()) }),
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
    return {
      data: {
        id: "project_new",
        workspace_id: "workspace_new",
        name: "New project",
        slug: "new-project",
        environment: "production",
        owner_email: "founder@example.com",
        created_at: new Date().toISOString(),
      },
    };
  }
  if (path === "/projects") return { data: demoProjects };
  if (path === "/api-keys") {
    return {
      data: {
        id: "api_key_new",
        key: "cp_live_demo123_generated_secret",
        scopes: ["leads:read", "leads:write", "clients:read", "clients:write", "usage:read"],
        billing_mode: "cloud_free",
        monthly_request_limit: 1000,
        rate_limit_per_minute: 60,
      },
    };
  }
  if (path.startsWith("/usage")) return { data: demoUsage };
  return { data: [] };
}

const demoPlans: Plan[] = [
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
  {
    id: "plan_developer",
    code: "developer",
    name: "Developer",
    monthly_price_cents: 1900,
    currency: "USD",
    monthly_request_limit: 100000,
    rate_limit_per_minute: 300,
    included_projects: 3,
    features: {},
  },
  {
    id: "plan_business",
    code: "business",
    name: "Business",
    monthly_price_cents: 9900,
    currency: "USD",
    monthly_request_limit: 1000000,
    rate_limit_per_minute: 1200,
    included_projects: 10,
    features: {},
  },
];

const demoProjects: Project[] = [
  {
    id: "project_1",
    workspace_id: "workspace_1",
    name: "Production API",
    slug: "production-api",
    environment: "production",
    owner_email: "alex@example.com",
    created_at: "2026-05-08T00:00:00Z",
  },
  {
    id: "project_2",
    workspace_id: "workspace_2",
    name: "Staging API",
    slug: "staging-api",
    environment: "staging",
    owner_email: "ops@example.com",
    created_at: "2026-05-08T00:00:00Z",
  },
];

const demoUsage: UsageRow[] = [
  {
    api_key_id: "api_key_1",
    name: "Production server key",
    billing_mode: "cloud_paid",
    monthly_request_limit: 100000,
    rate_limit_per_minute: 300,
    request_count: 42810,
    rejected_count: 12,
  },
  {
    api_key_id: "api_key_2",
    name: "Importer key",
    billing_mode: "cloud_free",
    monthly_request_limit: 1000,
    rate_limit_per_minute: 60,
    request_count: 714,
    rejected_count: 3,
  },
];

function DataTable({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>
          {rows.length ? rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>) : <tr><td colSpan={headers.length}>No records yet.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="metric"><span>{label}</span><strong>{value}</strong></div>;
}

function FormField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="field">{label}<input value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function Guidance({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return <div className="guidance">{icon}<strong>{title}</strong><p>{text}</p></div>;
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return <button className="ghost-button" onClick={async () => { await navigator.clipboard.writeText(text); setDone(true); }}><Clipboard size={16} />{done ? "Copied" : "Copy"}</button>;
}

function NewKeyBanner({ apiKey, onDismiss }: { apiKey: string; onDismiss: () => void }) {
  return (
    <div className="key-banner">
      <div><strong>New API key</strong><code>{apiKey}</code></div>
      <CopyButton text={apiKey} />
      <button className="ghost-button" onClick={onDismiss}>Done</button>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
