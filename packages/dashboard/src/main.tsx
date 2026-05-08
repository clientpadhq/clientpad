import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clipboard,
  Cloud,
  CreditCard,
  Edit3,
  ExternalLink,
  Filter,
  KeyRound,
  LayoutDashboard,
  MoreHorizontal,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import "./styles.css";

type Session = {
  baseUrl: string;
  adminToken: string;
  demo?: boolean;
};

type Page = "overview" | "projects" | "keys" | "usage" | "billing" | "docs" | "settings";
type QuickstartLanguage = "curl" | "python" | "node" | "go" | "ruby";

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

type ApiKeyRecord = ApiKeyResult & {
  name: string;
  project_slug: string;
  created_at: string;
  last_used_at: string;
  status: "active" | "paused";
};

type ProjectFormState = { name: string; owner_email: string; plan_code: string };
type KeyFormState = { workspace_id: string; name: string; plan_code: string; scopes: string };

const sessionKey = "clientpad.cloud.session";

function App() {
  const [session, setSession] = useState<Session | null>(() => {
    const saved = localStorage.getItem(sessionKey);
    return saved ? (JSON.parse(saved) as Session) : null;
  });

  if (!session) return <Login onLogin={setSession} />;

  return (
    <Dashboard
      session={session}
      onLogout={() => {
        localStorage.removeItem(sessionKey);
        setSession(null);
      }}
    />
  );
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
        <Logo />
        <h1>ClientPad Cloud</h1>
        <p>Sign in to manage projects, API keys, usage, billing, and developer docs.</p>
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
          <button className="button primary" type="submit">
            <ShieldCheck size={16} />
            Open dashboard
          </button>
          <button className="button secondary" type="button" onClick={preview}>
            <LayoutDashboard size={16} />
            Preview dashboard
          </button>
        </form>
      </section>
      <aside className="login-aside">
        <div className="preview-card">
          <div className="mini-toolbar" />
          <div className="mini-chart" />
          <div className="mini-rows" />
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
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState("May 12 - May 19, 2025");
  const [showFilters, setShowFilters] = useState(false);
  const [quickstartLanguage, setQuickstartLanguage] = useState<QuickstartLanguage>("curl");
  const [selectedPlanCode, setSelectedPlanCode] = useState("pro");
  const [createdKey, setCreatedKey] = useState<ApiKeyResult | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh(workspaceOverride?: string) {
    setLoading(true);
    try {
      const [planData, projectData] = await Promise.all([api.plans(), api.projects()]);
      const workspace = workspaceOverride || selectedWorkspace || projectData[0]?.workspace_id || "";
      setPlans(planData);
      setProjects(projectData);
      setSelectedWorkspace(workspace);
      if (workspace) {
        const usageData = await api.usage(workspace);
        setUsage(usageData);
        setKeys(toKeyRecords(usageData, projectData));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh().catch((error) => setNotice(error.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function createProject(input: ProjectFormState) {
    if (!input.name.trim()) {
      setNotice("Project name is required.");
      return;
    }
    const project = await api.createProject(input);
    setNotice(`Created project ${project.name}.`);
    await refresh(project.workspace_id);
    setPage("projects");
  }

  async function createKey(input: KeyFormState) {
    if (!input.workspace_id.trim() || !input.name.trim()) {
      setNotice("Workspace ID and key name are required.");
      return;
    }
    const key = await api.createKey(input);
    setCreatedKey(key);
    setNotice("API key created. Copy it now; it will not be shown again.");
    await refresh(input.workspace_id);
  }

  function selectWorkspace(workspaceId: string) {
    setSelectedWorkspace(workspaceId);
    refresh(workspaceId).catch((error) => setNotice(error.message));
  }

  function selectPlan(code: string) {
    setSelectedPlanCode(code);
    setNotice(`Selected ${plans.find((plan) => plan.code === code)?.name ?? code} plan.`);
  }

  const selectedProject = projects.find((project) => project.workspace_id === selectedWorkspace) ?? projects[0];
  const selectedPlan = plans.find((plan) => plan.code === selectedPlanCode) ?? plans[2] ?? plans[0];
  const filteredProjects = filterProjects(projects, query, showFilters);
  const filteredKeys = filterKeys(keys, query, showFilters);
  const totalRequests = usage.reduce((sum, row) => sum + Number(row.request_count || 0), 0);
  const rejectedRequests = usage.reduce((sum, row) => sum + Number(row.rejected_count || 0), 0);

  return (
    <div className="console">
      <Sidebar page={page} setPage={setPage} />
      <main className="workspace">
        <Topbar
          projects={projects}
          selectedWorkspace={selectedWorkspace}
          onWorkspaceChange={selectWorkspace}
          query={query}
          setQuery={setQuery}
          onLogout={onLogout}
        />
        <section className="content">
          <PageHeader
            title={titleForPage(page)}
            subtitle={subtitleForPage(page, selectedProject)}
            dateRange={dateRange}
            setDateRange={setDateRange}
            showFilters={showFilters}
            setShowFilters={setShowFilters}
          />
          {notice ? <Notice message={notice} onDismiss={() => setNotice("")} /> : null}
          {createdKey ? <NewKeyBanner apiKey={createdKey.key} onDismiss={() => setCreatedKey(null)} /> : null}

          {page === "overview" && (
            <Overview
              loading={loading}
              totalRequests={totalRequests}
              rejectedRequests={rejectedRequests}
              projects={filteredProjects}
              keys={filteredKeys}
              usage={usage}
              selectedPlan={selectedPlan}
              selectedProject={selectedProject}
              quickstartLanguage={quickstartLanguage}
              setQuickstartLanguage={setQuickstartLanguage}
              setPage={setPage}
            />
          )}
          {page === "projects" && <Projects projects={filteredProjects} onCreate={createProject} setPage={setPage} />}
          {page === "keys" && (
            <Keys
              workspaceId={selectedWorkspace}
              keys={filteredKeys}
              onCreate={createKey}
              onCopy={(text) => copyText(text, setNotice)}
            />
          )}
          {page === "usage" && <Usage usage={usage} keys={filteredKeys} selectedProject={selectedProject} />}
          {page === "billing" && (
            <Billing plans={plans} selectedPlanCode={selectedPlanCode} onSelectPlan={selectPlan} />
          )}
          {page === "docs" && (
            <Docs
              selectedProject={selectedProject}
              language={quickstartLanguage}
              setLanguage={setQuickstartLanguage}
              onCopy={(text) => copyText(text, setNotice)}
            />
          )}
          {page === "settings" && <SettingsPage session={session} onSave={(url) => setNotice(`Saved cloud URL ${url}.`)} />}
        </section>
      </main>
    </div>
  );
}

function Sidebar({ page, setPage }: { page: Page; setPage: (page: Page) => void }) {
  const items: Array<[Page, React.ReactNode, string]> = [
    ["overview", <LayoutDashboard size={18} />, "Overview"],
    ["projects", <Building2 size={18} />, "Projects"],
    ["keys", <KeyRound size={18} />, "API Keys"],
    ["usage", <SlidersHorizontal size={18} />, "Usage"],
    ["billing", <CreditCard size={18} />, "Billing"],
    ["docs", <BookOpen size={18} />, "Docs"],
  ];

  return (
    <aside className="sidebar">
      <Logo />
      <nav className="nav-list">
        {items.map(([id, icon, label]) => (
          <button key={id} className={page === id ? "active" : ""} onClick={() => setPage(id)}>
            {icon}
            {label}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button className="status-row" onClick={() => setPage("usage")}>
          <span />
          All Systems Operational
          <ChevronRight size={14} />
        </button>
        <div className="help-card">
          <strong>Need help?</strong>
          <p>View docs or contact support.</p>
          <button onClick={() => setPage("docs")}>
            Documentation <ExternalLink size={12} />
          </button>
          <button onClick={() => setPage("settings")}>
            Contact Support <ExternalLink size={12} />
          </button>
        </div>
        <footer>
          <span>© 2025 ClientPad Cloud</span>
          <span>Status · Privacy · Terms</span>
        </footer>
      </div>
    </aside>
  );
}

function Topbar({
  projects,
  selectedWorkspace,
  onWorkspaceChange,
  query,
  setQuery,
  onLogout,
}: {
  projects: Project[];
  selectedWorkspace: string;
  onWorkspaceChange: (workspaceId: string) => void;
  query: string;
  setQuery: (query: string) => void;
  onLogout: () => void;
}) {
  return (
    <header className="topbar">
      <label className="workspace-picker">
        <span>Workspace</span>
        <div>
          <Building2 size={16} />
          <select value={selectedWorkspace} onChange={(event) => onWorkspaceChange(event.target.value)}>
            {projects.map((project) => (
              <option key={project.id} value={project.workspace_id}>
                {project.name}
              </option>
            ))}
          </select>
          <ChevronDown size={16} />
        </div>
      </label>
      <label className="searchbox">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search projects, API keys, docs..." />
        <kbd>⌘ K</kbd>
      </label>
      <div className="top-actions">
        <button aria-label="Notifications">
          <Bell size={18} />
        </button>
        <button aria-label="Help">
          <CircleHelp size={18} />
        </button>
        <button className="avatar" onClick={onLogout} title="Sign out">
          AD
        </button>
        <button className="developer-menu" onClick={onLogout}>
          Alex Developer <ChevronDown size={15} />
        </button>
      </div>
    </header>
  );
}

function PageHeader({
  title,
  subtitle,
  dateRange,
  setDateRange,
  showFilters,
  setShowFilters,
}: {
  title: string;
  subtitle: string;
  dateRange: string;
  setDateRange: (range: string) => void;
  showFilters: boolean;
  setShowFilters: (show: boolean) => void;
}) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{subtitle}</p>
      </div>
      <div className="header-actions">
        <label className="date-select">
          <CalendarDays size={16} />
          <select value={dateRange} onChange={(event) => setDateRange(event.target.value)}>
            <option>May 12 - May 19, 2025</option>
            <option>May 1 - May 31, 2025</option>
            <option>Apr 1 - Apr 30, 2025</option>
          </select>
          <ChevronDown size={14} />
        </label>
        <button className={showFilters ? "button active-filter" : "button outline"} onClick={() => setShowFilters(!showFilters)}>
          <Filter size={17} />
          Filters
        </button>
      </div>
    </div>
  );
}

function Overview({
  loading,
  totalRequests,
  rejectedRequests,
  projects,
  keys,
  usage,
  selectedPlan,
  selectedProject,
  quickstartLanguage,
  setQuickstartLanguage,
  setPage,
}: {
  loading: boolean;
  totalRequests: number;
  rejectedRequests: number;
  projects: Project[];
  keys: ApiKeyRecord[];
  usage: UsageRow[];
  selectedPlan?: Plan;
  selectedProject?: Project;
  quickstartLanguage: QuickstartLanguage;
  setQuickstartLanguage: (language: QuickstartLanguage) => void;
  setPage: (page: Page) => void;
}) {
  const requestLimit = selectedPlan?.monthly_request_limit ?? 10_000_000;
  const usedPercent = Math.min((totalRequests / requestLimit) * 100, 100);

  return (
    <div className="overview-layout">
      <Panel className="api-requests">
        <div className="panel-head">
          <h2>
            API Requests <CircleHelp size={15} />
          </h2>
          <div className="range-tabs">
            {["1H", "1D", "7D", "30D"].map((tab) => (
              <button key={tab} className={tab === "7D" ? "selected" : ""}>
                {tab}
              </button>
            ))}
          </div>
        </div>
        <div className="chart-summary">
          <span>Total requests</span>
          <strong>{loading ? "..." : formatNumber(totalRequests || 2_560_812)}</strong>
          <em>
            <TrendingUp size={16} /> 18.7%
          </em>
          <small>vs May 5 - May 11, 2025</small>
        </div>
        <LineChart />
      </Panel>

      <Panel className="quota-panel">
        <h2>Quota & Usage</h2>
        <Quota label="Requests" value={totalRequests || 2_560_812} limit={requestLimit} suffix="" />
        <Quota label="Data Transfer" value={82.1} limit={500} suffix="GB" />
        <button className="link-button" onClick={() => setPage("usage")}>
          View full usage <ChevronRight size={15} />
        </button>
      </Panel>

      <Panel className="active-projects table-panel">
        <div className="panel-head bordered">
          <h2>
            Active Projects <span>{projects.length}</span>
          </h2>
          <button className="button outline" onClick={() => setPage("projects")}>
            View all projects
          </button>
        </div>
        <ProjectsTable projects={projects} usage={usage} compact />
      </Panel>

      <Panel className="billing-panel">
        <div className="panel-head">
          <h2>Billing Plan</h2>
          <span className="price-mini">{selectedPlan ? priceForPlan(selectedPlan) : "$199 / month"}</span>
        </div>
        <strong className="plan-title">{selectedPlan?.name ?? "Pro Plan"}</strong>
        <ul className="plan-list">
          <li>10M API requests / month</li>
          <li>500 GB data transfer / month</li>
          <li>99.9% uptime SLA</li>
          <li>Priority support</li>
        </ul>
        <div className="period-row">
          <span>Current period: May 12 - Jun 12, 2025 (31 days left)</span>
          <div><i style={{ width: `${Math.max(usedPercent, 8)}%` }} /></div>
        </div>
        <div className="split-actions">
          <button className="button outline" onClick={() => setPage("billing")}>
            View billing
          </button>
          <button className="button primary blue" onClick={() => setPage("billing")}>
            Upgrade plan
          </button>
        </div>
      </Panel>

      <Panel className="api-keys table-panel">
        <div className="panel-head bordered">
          <h2>
            API Keys <span>{keys.length}</span>
          </h2>
          <div className="inline-actions">
            <button className="button outline" onClick={() => setPage("keys")}>
              View all keys
            </button>
            <button className="button primary blue" onClick={() => setPage("keys")}>
              <Plus size={15} /> Create API Key
            </button>
          </div>
        </div>
        <KeysTable keys={keys} />
        <p className="table-foot">Showing {keys.length} of {keys.length} API keys</p>
      </Panel>

      <Panel className="quickstart-panel">
        <h2>Quickstart</h2>
        <Quickstart
          language={quickstartLanguage}
          setLanguage={setQuickstartLanguage}
          selectedProject={selectedProject}
          compact
        />
        <button className="link-button" onClick={() => setPage("docs")}>
          View full documentation <ExternalLink size={14} />
        </button>
      </Panel>
    </div>
  );
}

function Projects({ projects, onCreate, setPage }: { projects: Project[]; onCreate: (input: ProjectFormState) => Promise<void>; setPage: (page: Page) => void }) {
  const [form, setForm] = useState<ProjectFormState>({ name: "", owner_email: "", plan_code: "free" });

  return (
    <div className="detail-layout">
      <Panel>
        <h2>Create project</h2>
        <FormField label="Project name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
        <FormField label="Owner email" value={form.owner_email} onChange={(value) => setForm({ ...form, owner_email: value })} />
        <label className="field">
          Plan
          <select value={form.plan_code} onChange={(event) => setForm({ ...form, plan_code: event.target.value })}>
            <option value="free">Free</option>
            <option value="developer">Developer</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
          </select>
        </label>
        <button className="button primary blue" onClick={() => onCreate(form)}>
          <Plus size={16} /> Create project
        </button>
      </Panel>
      <Panel className="table-panel wide-detail">
        <div className="panel-head bordered">
          <h2>Hosted projects</h2>
          <button className="button outline" onClick={() => setPage("keys")}>Create key</button>
        </div>
        <ProjectsTable projects={projects} usage={demoUsage} />
      </Panel>
    </div>
  );
}

function Keys({
  workspaceId,
  keys,
  onCreate,
  onCopy,
}: {
  workspaceId: string;
  keys: ApiKeyRecord[];
  onCreate: (input: KeyFormState) => Promise<void>;
  onCopy: (text: string) => void;
}) {
  const [form, setForm] = useState<KeyFormState>({
    workspace_id: workspaceId,
    name: "Production Server Key",
    plan_code: "pro",
    scopes: "leads:read,leads:write,clients:read,clients:write,usage:read",
  });

  useEffect(() => setForm((prev) => ({ ...prev, workspace_id: workspaceId })), [workspaceId]);

  return (
    <div className="detail-layout">
      <Panel>
        <h2>Create API key</h2>
        <FormField label="Workspace ID" value={form.workspace_id} onChange={(value) => setForm({ ...form, workspace_id: value })} />
        <FormField label="Key name" value={form.name} onChange={(value) => setForm({ ...form, name: value })} />
        <FormField label="Scopes" value={form.scopes} onChange={(value) => setForm({ ...form, scopes: value })} />
        <label className="field">
          Plan
          <select value={form.plan_code} onChange={(event) => setForm({ ...form, plan_code: event.target.value })}>
            <option value="free">Free</option>
            <option value="developer">Developer</option>
            <option value="pro">Pro</option>
            <option value="business">Business</option>
          </select>
        </label>
        <button className="button primary blue" onClick={() => onCreate(form)}>
          <KeyRound size={16} /> Create API key
        </button>
      </Panel>
      <Panel className="table-panel wide-detail">
        <div className="panel-head bordered">
          <h2>All API Keys</h2>
          <button className="button outline" onClick={() => onCopy(keys[0]?.key ?? "cp_live_demo")}>
            <Clipboard size={15} /> Copy latest
          </button>
        </div>
        <KeysTable keys={keys} />
      </Panel>
    </div>
  );
}

function Usage({ usage, keys, selectedProject }: { usage: UsageRow[]; keys: ApiKeyRecord[]; selectedProject?: Project }) {
  return (
    <div className="detail-layout single">
      <Panel className="api-requests wide-detail">
        <div className="panel-head">
          <h2>{selectedProject?.name ?? "Workspace"} usage</h2>
          <div className="range-tabs">
            <button>1D</button>
            <button className="selected">7D</button>
            <button>30D</button>
          </div>
        </div>
        <LineChart />
      </Panel>
      <Panel className="table-panel wide-detail">
        <div className="panel-head bordered">
          <h2>Usage activity</h2>
          <span>{usage.reduce((sum, row) => sum + row.rejected_count, 0)} rejected</span>
        </div>
        <KeysTable keys={keys} showUsage />
      </Panel>
    </div>
  );
}

function Billing({ plans, selectedPlanCode, onSelectPlan }: { plans: Plan[]; selectedPlanCode: string; onSelectPlan: (code: string) => void }) {
  return (
    <div className="billing-grid">
      {plans.map((plan) => (
        <Panel key={plan.id} className={selectedPlanCode === plan.code ? "selected-plan" : ""}>
          <div className="panel-head">
            <h2>{plan.name}</h2>
            {selectedPlanCode === plan.code ? <span className="selected-label">Current</span> : null}
          </div>
          <p className="large-price">{priceForPlan(plan)}</p>
          <ul className="plan-list">
            <li>{plan.monthly_request_limit?.toLocaleString() ?? "Custom"} API requests / month</li>
            <li>{plan.rate_limit_per_minute ? `${plan.rate_limit_per_minute}/minute` : "Custom"} rate limit</li>
            <li>{plan.included_projects} included projects</li>
            <li>Usage activity dashboard</li>
          </ul>
          <button className={selectedPlanCode === plan.code ? "button primary blue" : "button outline"} onClick={() => onSelectPlan(plan.code)}>
            {selectedPlanCode === plan.code ? "Selected" : `Select ${plan.name}`}
          </button>
        </Panel>
      ))}
    </div>
  );
}

function Docs({
  selectedProject,
  language,
  setLanguage,
  onCopy,
}: {
  selectedProject?: Project;
  language: QuickstartLanguage;
  setLanguage: (language: QuickstartLanguage) => void;
  onCopy: (text: string) => void;
}) {
  const snippet = quickstartSnippet(language, selectedProject);
  return (
    <div className="detail-layout single">
      <Panel className="quickstart-panel wide-detail docs-panel">
        <div className="panel-head">
          <h2>Quickstart</h2>
          <button className="button outline" onClick={() => onCopy(snippet)}>
            <Clipboard size={15} /> Copy
          </button>
        </div>
        <Quickstart language={language} setLanguage={setLanguage} selectedProject={selectedProject} />
      </Panel>
    </div>
  );
}

function SettingsPage({ session, onSave }: { session: Session; onSave: (baseUrl: string) => void }) {
  const [baseUrl, setBaseUrl] = useState(session.baseUrl);
  const [tokenLabel, setTokenLabel] = useState(session.demo ? "Demo token" : "Configured admin token");

  return (
    <div className="detail-layout">
      <Panel>
        <h2>Cloud connection</h2>
        <FormField label="Cloud API URL" value={baseUrl} onChange={setBaseUrl} />
        <FormField label="Token label" value={tokenLabel} onChange={setTokenLabel} />
        <button className="button primary blue" onClick={() => onSave(baseUrl)}>
          <Check size={16} /> Save settings
        </button>
      </Panel>
      <Panel className="wide-detail">
        <h2>Deployment checklist</h2>
        <ul className="plan-list">
          <li>Mount `@abdulmuiz44/clientpad-cloud` at `/api/cloud/v1`.</li>
          <li>Set `CLIENTPAD_CLOUD_ADMIN_TOKEN` for operator access.</li>
          <li>Deploy this dashboard as a static app.</li>
          <li>Use hosted API keys for paid gateway access.</li>
        </ul>
      </Panel>
    </div>
  );
}

function ProjectsTable({ projects, usage, compact = false }: { projects: Project[]; usage: UsageRow[]; compact?: boolean }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Project</th>
            <th>Environment</th>
            <th>Requests (7D)</th>
            <th>Errors (7D)</th>
            <th>P95 Latency</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project, index) => {
            const row = usage[index % Math.max(usage.length, 1)] ?? demoUsage[0];
            return (
              <tr key={project.id}>
                <td>
                  <a>{project.slug}</a>
                  <small>{project.id.replace("project_", "prj_")}</small>
                </td>
                <td><Badge tone={project.environment === "production" ? "green" : project.environment === "staging" ? "blue" : "gray"}>{toTitle(project.environment)}</Badge></td>
                <td>{compact ? formatNumber(row.request_count * (index + 2)) : formatNumber(row.request_count)}</td>
                <td><span className={row.rejected_count > 10 ? "danger" : "success"}>{((row.rejected_count / Math.max(row.request_count, 1)) * 100).toFixed(2)}%</span></td>
                <td>{142 + index * 19} ms</td>
                <td>{formatDate(project.created_at)}</td>
                <td><RowActions /></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function KeysTable({ keys, showUsage = false }: { keys: ApiKeyRecord[]; showUsage?: boolean }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Key</th>
            <th>Project</th>
            <th>{showUsage ? "Requests" : "Created"}</th>
            <th>Last Used</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((key) => (
            <tr key={key.id}>
              <td>{key.name}</td>
              <td><span className="masked">{maskKey(key.key)}</span> <Clipboard size={13} /></td>
              <td><a>{key.project_slug}</a></td>
              <td>{showUsage ? formatNumber(key.monthly_request_limit ? Math.min(key.monthly_request_limit, 512_771) : 168_939) : formatDate(key.created_at)}</td>
              <td>{formatDate(key.last_used_at)}</td>
              <td><span className="status-dot">Active</span></td>
              <td><RowActions editable /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Quickstart({
  language,
  setLanguage,
  selectedProject,
  compact = false,
}: {
  language: QuickstartLanguage;
  setLanguage: (language: QuickstartLanguage) => void;
  selectedProject?: Project;
  compact?: boolean;
}) {
  const snippet = quickstartSnippet(language, selectedProject);
  return (
    <>
      <div className="language-tabs">
        {(["curl", "python", "node", "go", "ruby"] as QuickstartLanguage[]).map((tab) => (
          <button key={tab} className={language === tab ? "selected" : ""} onClick={() => setLanguage(tab)}>
            {tab === "curl" ? "cURL" : tab === "node" ? "Node.js" : toTitle(tab)}
          </button>
        ))}
      </div>
      <pre className={compact ? "code compact" : "code"}>{snippet}</pre>
    </>
  );
}

function Quota({ label, value, limit, suffix }: { label: string; value: number; limit: number; suffix: string }) {
  const percent = Math.min((value / limit) * 100, 100);
  return (
    <div className="quota-row">
      <div>
        <span>
          {label} <CircleHelp size={14} />
        </span>
        <strong>{formatQuota(value, suffix)} / {formatQuota(limit, suffix)}</strong>
      </div>
      <div className="progress">
        <i style={{ width: `${percent}%` }} />
      </div>
      <div className="quota-meta">
        <span>{percent.toFixed(1)}% used</span>
        <span>{formatQuota(Math.max(limit - value, 0), suffix)} remaining</span>
      </div>
    </div>
  );
}

function LineChart() {
  const points = "0,120 90,95 180,52 270,117 360,38 450,70 540,70 630,145";
  return (
    <div className="line-chart" aria-label="API request trend">
      <div className="y-axis"><span>400K</span><span>300K</span><span>200K</span><span>100K</span><span>0</span></div>
      <svg viewBox="0 0 630 180" preserveAspectRatio="none">
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1f6feb" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#1f6feb" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M ${points} L 630,180 L 0,180 Z`} fill="url(#chartFill)" />
        <polyline points={points} fill="none" stroke="#1f6feb" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="x-axis">
        {["May 12", "May 13", "May 14", "May 15", "May 16", "May 17", "May 18", "May 19"].map((day) => <span key={day}>{day}</span>)}
      </div>
    </div>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{children}</section>;
}

function Logo() {
  return (
    <div className="logo">
      <Cloud size={30} />
      <strong>ClientPad Cloud</strong>
    </div>
  );
}

function Notice({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  return (
    <button className="notice" onClick={onDismiss}>
      <Check size={16} />
      {message}
    </button>
  );
}

function NewKeyBanner({ apiKey, onDismiss }: { apiKey: string; onDismiss: () => void }) {
  return (
    <div className="key-banner">
      <div>
        <strong>New API key</strong>
        <code>{apiKey}</code>
      </div>
      <CopyButton text={apiKey} />
      <button className="button outline" onClick={onDismiss}>Done</button>
    </div>
  );
}

function RowActions({ editable = false }: { editable?: boolean }) {
  return (
    <div className="row-actions">
      {editable ? <button aria-label="Edit"><Edit3 size={15} /></button> : null}
      <button aria-label="More"><MoreHorizontal size={17} /></button>
      {editable ? <button aria-label="Delete"><Trash2 size={15} /></button> : null}
    </div>
  );
}

function Badge({ children, tone }: { children: React.ReactNode; tone: "green" | "blue" | "gray" }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function FormField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="field">
      {label}
      <input value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function CopyButton({ text }: { text: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      className="copy-button"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
      }}
    >
      <Clipboard size={14} />
      {done ? "Copied" : "Copy"}
    </button>
  );
}

class CloudApi {
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
        scopes: body.scopes.split(",").map((scope) => scope.trim()).filter(Boolean),
        billing_mode: body.plan_code === "free" ? "cloud_free" : "cloud_paid",
        monthly_request_limit: 10_000_000,
        rate_limit_per_minute: 1200,
      },
    };
  }
  if (path.startsWith("/usage")) return { data: demoUsage };
  return { data: [] };
}

const demoPlans: Plan[] = [
  { id: "plan_free", code: "free", name: "Free Plan", monthly_price_cents: 0, currency: "USD", monthly_request_limit: 1_000, rate_limit_per_minute: 60, included_projects: 1, features: {} },
  { id: "plan_developer", code: "developer", name: "Developer Plan", monthly_price_cents: 1900, currency: "USD", monthly_request_limit: 100_000, rate_limit_per_minute: 300, included_projects: 3, features: {} },
  { id: "plan_pro", code: "pro", name: "Pro Plan", monthly_price_cents: 19900, currency: "USD", monthly_request_limit: 10_000_000, rate_limit_per_minute: 1200, included_projects: 10, features: {} },
  { id: "plan_business", code: "business", name: "Business Plan", monthly_price_cents: 49900, currency: "USD", monthly_request_limit: 50_000_000, rate_limit_per_minute: 5000, included_projects: 50, features: {} },
];

const demoProjects: Project[] = [
  { id: "project_8f3e2bd7", workspace_id: "workspace_prod", name: "Acme Corp", slug: "production-api", environment: "production", owner_email: "alex@example.com", created_at: "2025-04-02T00:00:00Z" },
  { id: "project_1a7d9c3e", workspace_id: "workspace_stage", name: "Staging API", slug: "staging-api", environment: "staging", owner_email: "ops@example.com", created_at: "2025-04-02T00:00:00Z" },
  { id: "project_c7b9a1f2", workspace_id: "workspace_tools", name: "Internal Tools", slug: "internal-tools", environment: "production", owner_email: "tools@example.com", created_at: "2025-04-15T00:00:00Z" },
  { id: "project_0d3f4b6a", workspace_id: "workspace_sandbox", name: "Sandbox", slug: "sandbox", environment: "development", owner_email: "dev@example.com", created_at: "2025-04-28T00:00:00Z" },
];

const demoUsage: UsageRow[] = [
  { api_key_id: "api_key_444f", name: "Production Server Key", billing_mode: "cloud_paid", monthly_request_limit: 10_000_000, rate_limit_per_minute: 1200, request_count: 1_532_984, rejected_count: 73 },
  { api_key_id: "api_key_2a7b", name: "Staging Server Key", billing_mode: "cloud_paid", monthly_request_limit: 10_000_000, rate_limit_per_minute: 1200, request_count: 512_771, rejected_count: 52 },
  { api_key_id: "api_key_9c3d", name: "Dev CLI Key", billing_mode: "cloud_free", monthly_request_limit: 100_000, rate_limit_per_minute: 300, request_count: 346_118, rejected_count: 7 },
];

function toKeyRecords(usage: UsageRow[], projects: Project[]): ApiKeyRecord[] {
  return usage.map((row, index) => {
    const project = projects[index % Math.max(projects.length, 1)] ?? demoProjects[0];
    return {
      ...row,
      id: row.api_key_id,
      key: `cp_live_${"•".repeat(24)}${["444f", "2a7b", "9c3d"][index] ?? "7f0a"}`,
      scopes: ["leads:read", "leads:write", "clients:read", "clients:write"],
      project_slug: project.slug,
      created_at: project.created_at,
      last_used_at: ["2025-05-19T00:00:00Z", "2025-05-18T00:00:00Z", "2025-05-17T00:00:00Z"][index] ?? "2025-05-16T00:00:00Z",
      status: "active",
    };
  });
}

function quickstartSnippet(language: QuickstartLanguage, selectedProject?: Project) {
  const resource = selectedProject?.slug ?? "resource";
  const snippets: Record<QuickstartLanguage, string> = {
    curl: `curl https://api.clientpad.cloud/v1/resources \\\n  -H "Authorization: Bearer cp_live_your_api_key_here" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"${resource}"}'`,
    python: `import requests\n\nrequests.post(\n  "https://api.clientpad.cloud/v1/resources",\n  headers={"Authorization": "Bearer cp_live_your_api_key_here"},\n  json={"name": "${resource}"},\n)`,
    node: `import { ClientPad } from "@abdulmuiz44/clientpad-sdk";\n\nconst clientpad = new ClientPad({\n  baseUrl: "https://api.clientpad.cloud/v1",\n  apiKey: process.env.CLIENTPAD_API_KEY!,\n});\n\nawait clientpad.leads.create({ name: "${resource}" });`,
    go: `req, _ := http.NewRequest("POST", "https://api.clientpad.cloud/v1/resources", body)\nreq.Header.Set("Authorization", "Bearer cp_live_your_api_key_here")`,
    ruby: `Net::HTTP.post(\n  URI("https://api.clientpad.cloud/v1/resources"),\n  { name: "${resource}" }.to_json,\n  "Authorization" => "Bearer cp_live_your_api_key_here"\n)`,
  };
  return snippets[language];
}

async function copyText(text: string, setNotice: (notice: string) => void) {
  await navigator.clipboard.writeText(text);
  setNotice("Copied to clipboard.");
}

function filterProjects(projects: Project[], query: string, onlyProduction: boolean) {
  return projects.filter((project) => {
    const matchesQuery = !query || `${project.name} ${project.slug} ${project.owner_email}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = !onlyProduction || project.environment === "production";
    return matchesQuery && matchesFilter;
  });
}

function filterKeys(keys: ApiKeyRecord[], query: string, paidOnly: boolean) {
  return keys.filter((key) => {
    const matchesQuery = !query || `${key.name} ${key.project_slug}`.toLowerCase().includes(query.toLowerCase());
    const matchesFilter = !paidOnly || key.billing_mode === "cloud_paid";
    return matchesQuery && matchesFilter;
  });
}

function titleForPage(page: Page) {
  return {
    overview: "Overview",
    projects: "Projects",
    keys: "API Keys",
    usage: "Usage",
    billing: "Billing",
    docs: "Docs",
    settings: "Settings",
  }[page];
}

function subtitleForPage(page: Page, project?: Project) {
  return {
    overview: "System status and workspace summary",
    projects: "Create, inspect, and manage hosted workspaces",
    keys: "Issue, copy, and inspect developer access keys",
    usage: `${project?.name ?? "Workspace"} request activity and quota usage`,
    billing: "Plan limits, billing period, and upgrade controls",
    docs: "SDK and API snippets developers can copy into apps",
    settings: "Cloud connection and operator settings",
  }[page];
}

function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

function formatQuota(value: number, suffix: string) {
  if (suffix) return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} ${suffix}`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}K`;
  return value.toLocaleString("en-US");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

function priceForPlan(plan: Plan) {
  return plan.monthly_price_cents === 0 ? "Free" : `$${(plan.monthly_price_cents / 100).toFixed(0)} / month`;
}

function maskKey(key: string) {
  return key.startsWith("cp_live_") ? key : `cp_live_${"•".repeat(24)}${key.slice(-4)}`;
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function toTitle(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

createRoot(document.getElementById("root")!).render(<App />);
