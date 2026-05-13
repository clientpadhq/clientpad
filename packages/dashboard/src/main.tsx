import React, { useEffect, useMemo, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import { ClientPad, type WhatsAppConversation, type WhatsAppMessage, type WhatsAppSuggestion } from "@clientpad/sdk";
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
  MessageCircle,
  KeyRound,
  KanbanSquare,
  LayoutDashboard,
  MoreHorizontal,
  Phone,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  Smartphone,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  WalletCards,
  Send,
  User,
  Bot,
  AlertCircle,
  Clock,
  Archive,
  CheckCircle2,
} from "lucide-react";
import "./styles.css";

type ConnectionMode = "preview" | "live";

type Session = {
  baseUrl: string;
  adminToken: string;
  publicApiKey?: string;
  demo?: boolean;
  mode?: ConnectionMode;
  validatedAt?: string;
  readiness?: CloudReadiness;
};

type CloudHealth = {
  status: "ok" | "degraded" | "error";
  service: string;
  time: string;
};

type CloudReadinessDiagnostic = {
  key: string;
  label: string;
  status: "ok" | "missing";
  detail: string;
};

type CloudReadinessWorkspaceSummary = {
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

type CloudReadinessWorkspace = {
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

type CloudReadiness = {
  status: "ok" | "degraded";
  service: string;
  time: string;
  auth: { token: "accepted" };
  summary: CloudReadinessWorkspaceSummary;
  workspace: CloudReadinessWorkspace | null;
  diagnostics: CloudReadinessDiagnostic[];
};

type ConnectionState = "preview" | "checking" | "connected" | "misconfigured" | "unavailable";

type Page = "overview" | "connect" | "pipeline" | "clients" | "inbox" | "revenue" | "usage" | "billing" | "projects" | "keys" | "docs" | "settings";
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

type ClientRecord = {
  id: string;
  name: string;
  phone: string;
  status: string;
  service: string;
  value: number;
  lastMessage: string;
};

type RevenueClient = {
  name: string;
  phone: string;
  amount: number;
  paidAt: string;
  provider: "Paystack" | "Flutterwave";
};

const serviceStages = ["New Lead", "Quoted", "Booked", "In Progress", "Completed", "Paid", "Review Requested"] as const;

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
  const [mode, setMode] = useState<ConnectionMode>("preview");
  const [baseUrl, setBaseUrl] = useState("http://localhost:3000/api/cloud/v1");
  const [adminToken, setAdminToken] = useState("");
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (mode === "preview") {
      const next = { baseUrl: "demo", adminToken: "demo", demo: true, mode: "preview" as const };
      localStorage.setItem(sessionKey, JSON.stringify(next));
      onLogin(next);
      return;
    }

    const normalized = baseUrl.replace(/\/+$/, "");
    try {
      const healthResponse = await fetch(`${normalized}/health`);
      if (!healthResponse.ok) throw new Error("Cloud API health check failed.");

      const readinessResponse = await fetch(`${normalized}/readiness`, {
        headers: { authorization: `Bearer ${adminToken}` },
      });
      const readinessBody = await readinessResponse.json().catch(() => null);
      if (!readinessResponse.ok) {
        throw new Error(readinessBody?.error?.message ?? "Cloud operator token was rejected.");
      }

      const next = {
        baseUrl: normalized,
        adminToken,
        mode: "live" as const,
        validatedAt: new Date().toISOString(),
        readiness: readinessBody as CloudReadiness,
      };
      localStorage.setItem(sessionKey, JSON.stringify(next));
      onLogin(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to ClientPad Cloud.");
    }
  }

  return (
    <main className="login-shell">
      <section className="login-panel">
        <Logo />
        <div className="mode-switch">
          {(["preview", "live"] as ConnectionMode[]).map((item) => (
            <button key={item} type="button" className={mode === item ? "selected" : ""} onClick={() => setMode(item)}>
              {item === "preview" ? "Preview" : "Live"}
            </button>
          ))}
        </div>
        <h1>{mode === "preview" ? "Preview workspace" : "ClientPad Cloud"}</h1>
        <p>
          {mode === "preview"
            ? "Open a sample workspace to understand the dashboard layout before connecting a real Cloud API."
            : "Connect the operator dashboard to a live Cloud API to manage projects, keys, usage, billing, and WhatsApp activity."}
        </p>
        <form onSubmit={submit} className="login-form">
          {mode === "live" ? (
            <>
              <label>
                Cloud API URL
                <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
              </label>
              <label>
                Operator token
                <input
                  value={adminToken}
                  type="password"
                  autoComplete="current-password"
                  onChange={(event) => setAdminToken(event.target.value)}
                  placeholder="CLIENTPAD_CLOUD_ADMIN_TOKEN"
                />
              </label>
            </>
          ) : (
            <div className="preview-note">
              Preview mode uses generated sample data, no Cloud API credentials, and no live WhatsApp traffic.
            </div>
          )}
          {error ? <div className="form-error">{error}</div> : null}
          <button className="button primary" type="submit">
            <ShieldCheck size={16} />
            {mode === "preview" ? "Open preview dashboard" : "Open live dashboard"}
          </button>
        </form>
      </section>
      <aside className="login-aside">
        <div className="preview-card">
          <div className="preview-card-head">
            <span>{mode === "preview" ? "Sample data" : "Live operator view"}</span>
            <strong>{mode === "preview" ? "Safe to explore" : "Connected to a real Cloud API"}</strong>
          </div>
          <div className="mini-toolbar" />
          <div className="mini-chart" />
          <div className="mini-rows" />
        </div>
      </aside>
    </main>
  );
}

function Dashboard({ session, onLogout }: { session: Session; onLogout: () => void }) {
  const [currentSession, setCurrentSession] = useState(session);
  const sessionRef = useRef(currentSession);
  useEffect(() => {
    setCurrentSession(session);
  }, [session]);
  useEffect(() => {
    sessionRef.current = currentSession;
  }, [currentSession]);

  const api = useMemo(() => new CloudApi(currentSession), [currentSession]);
  const mode = currentSession.mode ?? (currentSession.demo ? "preview" : "live");
  const [page, setPage] = useState<Page>("overview");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState("");
  const [publicApiKey, setPublicApiKey] = useState(currentSession.publicApiKey || "");
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState("May 12 - May 19, 2025");
  const [showFilters, setShowFilters] = useState(false);
  const [quickstartLanguage, setQuickstartLanguage] = useState<QuickstartLanguage>("curl");
  const [selectedPlanCode, setSelectedPlanCode] = useState("pro");
  const [createdKey, setCreatedKey] = useState<ApiKeyResult | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<CloudHealth | null>(null);
  const [readiness, setReadiness] = useState<CloudReadiness | null>(currentSession.readiness ?? null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(mode === "preview" ? "preview" : currentSession.readiness ? (currentSession.readiness.status === "ok" ? "connected" : "misconfigured") : "checking");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  async function refresh(workspaceOverride?: string, sessionOverride?: Session) {
    setLoading(true);
    try {
      const activeApi = new CloudApi(sessionOverride ?? sessionRef.current);
      const [planData, projectData, healthData] = await Promise.all([activeApi.plans(), activeApi.projects(), activeApi.health()]);
      const workspace = workspaceOverride || selectedWorkspace || projectData[0]?.workspace_id || "";
      const readinessData = await activeApi.readiness(workspace || undefined);
      setPlans(planData);
      setProjects(projectData);
      setSelectedWorkspace(workspace);
      setHealth(healthData);
      setReadiness(readinessData);
      setConnectionState(mode === "preview" ? "preview" : readinessData.status === "ok" ? "connected" : "misconfigured");
      const snapshot: Session = {
        ...currentSession,
        publicApiKey,
        readiness: readinessData,
        validatedAt: readinessData.time,
        mode,
      };
      setCurrentSession(snapshot);
      localStorage.setItem(sessionKey, JSON.stringify(snapshot));
      if (workspace) {
        const usageData = await activeApi.usage(workspace);
        setUsage(usageData);
        setKeys(toKeyRecords(usageData, projectData));
      }
      setLastSyncedAt(new Date().toISOString());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not refresh ClientPad Cloud.";
      setNotice(message);
      if (message.toLowerCase().includes("token")) {
        setConnectionState("misconfigured");
      } else {
        setConnectionState("unavailable");
      }
      throw error;
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

  function updatePublicApiKey(key: string) {
    setPublicApiKey(key);
    const next = { ...currentSession, publicApiKey: key };
    localStorage.setItem(sessionKey, JSON.stringify(next));
    setCurrentSession(next);
  }

  const selectedProject = projects.find((project) => project.workspace_id === selectedWorkspace) ?? projects[0];
  const selectedPlan = plans.find((plan) => plan.code === selectedPlanCode) ?? plans[2] ?? plans[0];
  const filteredProjects = filterProjects(projects, query, showFilters);
  const filteredKeys = filterKeys(keys, query, showFilters);
  const totalRequests = usage.reduce((sum, row) => sum + Number(row.request_count || 0), 0);
  const rejectedRequests = usage.reduce((sum, row) => sum + Number(row.rejected_count || 0), 0);
  const connectionSummary: ConnectionState = mode === "preview" ? "preview" : connectionState;

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
          mode={mode}
          connectionState={connectionSummary}
          health={health}
          readiness={readiness}
          lastSyncedAt={lastSyncedAt}
          onLogout={onLogout}
        />
        <section className="content">
          <StatusBanner
            mode={mode}
            connectionState={connectionSummary}
            health={health}
            readiness={readiness}
            hasPublicApiKey={Boolean(publicApiKey.trim())}
            projectCount={projects.length}
            onGoToConnect={() => setPage("connect")}
            onGoToProjects={() => setPage("projects")}
            onGoToKeys={() => setPage("keys")}
            onRetry={() => refresh().catch((error) => setNotice(error.message))}
          />
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

          {page === "connect" && (
            <ConnectWhatsApp
              mode={mode}
              readiness={readiness}
              selectedWorkspace={selectedWorkspace}
              onCopy={(text) => copyText(text, setNotice)}
              onGoToProjects={() => setPage("projects")}
              onGoToKeys={() => setPage("keys")}
              onRefresh={() => refresh(selectedWorkspace).catch((error) => setNotice(error.message))}
            />
          )}
          {page === "pipeline" && <PipelineScreen clients={filterClients(demoClients, query)} mode={mode} />}
          {page === "clients" && <ClientSearch clients={filterClients(demoClients, query)} query={query} setQuery={setQuery} />}
          {page === "inbox" && (
            <TeamInbox
              session={currentSession}
              publicApiKey={publicApiKey}
              mode={mode}
              onGoToSettings={() => setPage("settings")}
              onGoToKeys={() => setPage("keys")}
              readiness={readiness}
            />
          )}
          {page === "revenue" && <RevenueDashboard />}

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
              mode={mode}
              health={health}
              readiness={readiness}
              hasPublicApiKey={Boolean(publicApiKey.trim())}
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
          {page === "settings" && (
            <SettingsPage
              session={currentSession}
              publicApiKey={publicApiKey}
              mode={mode}
              onSave={(url, key) => {
                setNotice(`Saved settings.`);
                const next = { ...currentSession, baseUrl: url.replace(/\/+$/, ""), publicApiKey: key };
                localStorage.setItem(sessionKey, JSON.stringify(next));
                setCurrentSession(next);
                setPublicApiKey(key);
                refresh(selectedWorkspace, next).catch((error) => setNotice(error.message));
              }}
            />
          )}
        </section>
      </main>
    </div>
  );
}

function Sidebar({ page, setPage }: { page: Page; setPage: (page: Page) => void }) {
  const items: Array<[Page, React.ReactNode, string]> = [
    ["overview", <LayoutDashboard size={18} />, "Overview"],
    ["connect", <Smartphone size={18} />, "Connect WhatsApp"],
    ["pipeline", <KanbanSquare size={18} />, "Pipeline"],
    ["clients", <Phone size={18} />, "Clients"],
    ["inbox", <MessageCircle size={18} />, "Team Inbox"],
    ["revenue", <WalletCards size={18} />, "Revenue"],
    ["usage", <SlidersHorizontal size={18} />, "Usage"],
    ["billing", <CreditCard size={18} />, "Billing"],
    ["projects", <Building2 size={18} />, "Projects"],
    ["keys", <KeyRound size={18} />, "API Keys"],
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
  mode,
  connectionState,
  health,
  readiness,
  lastSyncedAt,
  onLogout,
}: {
  projects: Project[];
  selectedWorkspace: string;
  onWorkspaceChange: (workspaceId: string) => void;
  query: string;
  setQuery: (query: string) => void;
  mode: ConnectionMode;
  connectionState: ConnectionState;
  health: CloudHealth | null;
  readiness: CloudReadiness | null;
  lastSyncedAt: string | null;
  onLogout: () => void;
}) {
  const connectionLabel =
    mode === "preview"
      ? "Preview mode"
      : connectionState === "connected"
        ? "Live connected"
        : connectionState === "checking"
          ? "Checking live"
          : connectionState === "misconfigured"
            ? "Live misconfigured"
            : "Live unavailable";
  return (
    <header className="topbar">
      <label className="workspace-picker">
        <span>Workspace</span>
        <div>
          <Building2 size={16} />
          <select value={selectedWorkspace} onChange={(event) => onWorkspaceChange(event.target.value)}>
            {!projects.length ? <option value="">No workspace yet</option> : null}
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
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clients by phone/name, projects, keys..." />
        <kbd>⌘ K</kbd>
      </label>
      <div className="top-actions">
        <StatusChip tone={mode === "preview" ? "blue" : connectionState === "connected" ? "green" : connectionState === "checking" ? "amber" : "gray"} label={connectionLabel} />
        <StatusChip
          tone={health?.status === "ok" ? "green" : health?.status === "degraded" ? "amber" : "gray"}
          label={health?.status === "ok" ? "Cloud healthy" : health?.status === "degraded" ? "Cloud degraded" : "Cloud pending"}
        />
        <StatusChip
          tone={readiness?.summary?.has_public_api_key ? "green" : "amber"}
          label={readiness?.summary?.has_public_api_key ? "Public API key ready" : "Public API key missing"}
        />
        <StatusChip tone={projects.length > 0 ? "green" : "amber"} label={projects.length > 0 ? `${projects.length} projects` : "No project selected"} />
        <StatusChip tone={lastSyncedAt ? "green" : "gray"} label={lastSyncedAt ? `Synced ${timeAgo(lastSyncedAt)}` : "Waiting for sync"} />
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
  mode,
  health,
  readiness,
  hasPublicApiKey,
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
  mode: ConnectionMode;
  health: CloudHealth | null;
  readiness: CloudReadiness | null;
  hasPublicApiKey: boolean;
}) {
  const requestLimit = selectedPlan?.monthly_request_limit ?? 10_000_000;
  const usedPercent = Math.min((totalRequests / requestLimit) * 100, 100);

  return (
    <div className="overview-layout">
      <ActivationPanel
        mode={mode}
        health={health}
        readiness={readiness}
        projectCount={projects.length}
        keyCount={keys.length}
        hasPublicApiKey={hasPublicApiKey}
        onGoToConnect={() => setPage("connect")}
        onGoToProjects={() => setPage("projects")}
        onGoToKeys={() => setPage("keys")}
        onGoToDocs={() => setPage("docs")}
      />
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
        {projects.length > 0 ? (
          <ProjectsTable projects={projects} usage={demoUsage} />
        ) : (
          <div className="empty-state-panel compact">
            <h3>No projects yet</h3>
            <p>Create your first workspace project to activate API keys, usage tracking, and live WhatsApp workflows.</p>
          </div>
        )}
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
        {keys.length > 0 ? <KeysTable keys={keys} /> : <div className="empty-state-panel compact"><h3>No API keys yet</h3><p>Create a key to let the dashboard load live inbox, usage, and pipeline data.</p></div>}
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
        {keys.length > 0 ? <KeysTable keys={keys} showUsage /> : <div className="empty-state-panel compact"><h3>No usage yet</h3><p>Issue API keys and send traffic through the public API to start collecting usage data.</p></div>}
      </Panel>
    </div>
  );
}

function Billing({ plans, selectedPlanCode, onSelectPlan }: { plans: Plan[]; selectedPlanCode: string; onSelectPlan: (code: string) => void }) {
  return (
    <div className="billing-grid">
      <Panel className="billing-summary">
        <div className="panel-head"><h2>Current cloud usage</h2><Badge tone="green">Synced</Badge></div>
        <Quota label="Requests" value={2_391_873} limit={10_000_000} suffix="" />
        <Quota label="Data Transfer" value={82.1} limit={500} suffix="GB" />
        <p className="helper-text">Uses the same quota model as Usage: request count, rejections, rate limits, and monthly included projects.</p>
      </Panel>
      {plans.length > 0 ? plans.map((plan) => (
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
      )) : <Panel className="empty-state-panel compact"><h3>No plans loaded</h3><p>Connect the Cloud API to show available plans and current limits.</p></Panel>}
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

function SettingsPage({ session, publicApiKey: initialKey, mode, onSave }: { session: Session; publicApiKey: string; mode: ConnectionMode; onSave: (baseUrl: string, publicApiKey: string) => void }) {
  const [baseUrl, setBaseUrl] = useState(session.baseUrl);
  const [publicApiKey, setPublicApiKey] = useState(initialKey);
  const [tokenLabel, setTokenLabel] = useState(session.demo ? "Demo token" : "Configured admin token");

  return (
    <div className="detail-layout">
      <Panel>
        <h2>Cloud connection</h2>
        <FormField label="Cloud API URL" value={baseUrl} onChange={setBaseUrl} />
        <FormField label="Token label" value={tokenLabel} onChange={setTokenLabel} />
        <div className="status-callout compact">
          <strong>{mode === "preview" ? "Preview mode" : "Live mode"}</strong>
          <p>{mode === "preview" ? "Preview mode uses generated sample data. No live backend access is required." : "Live mode points the dashboard at your Cloud API and uses an operator token for admin access."}</p>
        </div>
        
        <h2 style={{ marginTop: "2rem" }}>Workspace Preview</h2>
        <FormField 
          label="Workspace Public API Key" 
          value={publicApiKey} 
          onChange={setPublicApiKey} 
        />
        <p className="helper-text">Enter a `cp_live_...` key to enable live WhatsApp inbox, usage, and pipeline data.</p>
        
        <button className="button primary blue" onClick={() => onSave(baseUrl, publicApiKey)}>
          <Check size={16} /> Save settings
        </button>
      </Panel>
      <Panel className="wide-detail">
        <h2>Deployment checklist</h2>
        <ul className="plan-list">
          <li>Mount `@clientpad/cloud` at `/api/cloud/v1`.</li>
          <li>Set `CLIENTPAD_CLOUD_ADMIN_TOKEN` for operator access.</li>
          <li>Deploy this dashboard as a static app.</li>
          <li>Use hosted API keys for live gateway access and WhatsApp inbox sync.</li>
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

function StatusChip({ tone, label }: { tone: "green" | "amber" | "blue" | "gray"; label: string }) {
  return <span className={`status-chip ${tone}`}>{label}</span>;
}

function StatusBanner({
  mode,
  connectionState,
  health,
  readiness,
  hasPublicApiKey,
  projectCount,
  onGoToConnect,
  onGoToProjects,
  onGoToKeys,
  onRetry,
}: {
  mode: ConnectionMode;
  connectionState: ConnectionState;
  health: CloudHealth | null;
  readiness: CloudReadiness | null;
  hasPublicApiKey: boolean;
  projectCount: number;
  onGoToConnect: () => void;
  onGoToProjects: () => void;
  onGoToKeys: () => void;
  onRetry: () => void;
}) {
  const connectionLabel =
    mode === "preview"
      ? "Preview dataset"
      : connectionState === "connected"
        ? "Live connected"
        : connectionState === "checking"
          ? "Live connection checking"
          : connectionState === "misconfigured"
            ? "Live misconfigured"
            : "Live unavailable";
  const workspaceLabel = readiness?.workspace?.name ?? `${readiness?.summary.workspace_count ?? projectCount} workspaces`;
  return (
    <Panel className="status-banner">
      <div className="status-banner-copy">
        <div className="status-banner-head">
          <StatusChip tone={mode === "preview" ? "blue" : connectionState === "connected" ? "green" : connectionState === "checking" ? "amber" : "gray"} label={connectionLabel} />
          <span className="status-muted">
            {mode === "preview"
              ? "sample data only"
              : readiness?.auth?.token === "accepted"
                ? "operator token accepted"
                : "waiting for live validation"}
          </span>
        </div>
        <h2>{mode === "preview" ? "Preview workspace is active" : connectionState === "connected" ? "Live dashboard is connected" : "Live dashboard needs attention"}</h2>
        <p>
          {mode === "preview"
            ? "This workspace uses generated data so operators can learn the flow without risking production access."
            : connectionState === "connected"
              ? "This workspace is connected to a real ClientPad Cloud API. Use the readiness, WhatsApp, project, and key states below to confirm the system is usable."
              : "The Cloud API is reachable, but at least one live dependency still needs attention before the workspace is fully operational."}
        </p>
      </div>
      <div className="status-banner-metrics">
        <div><strong>{connectionLabel}</strong><span>{mode === "preview" ? "sample data only" : health ? `Health ${timeAgo(health.time)}` : "Health not checked yet"}</span></div>
        <div><strong>{hasPublicApiKey ? "Public API key ready" : "Public API key missing"}</strong><span>{hasPublicApiKey ? "Live inbox can load" : "Inbox stays in setup mode"}</span></div>
        <div><strong>{workspaceLabel}</strong><span>{mode === "preview" ? "demo workspace" : readiness?.workspace ? `Selected ${timeAgo(readiness.time)}` : "Choose a workspace or create one"}</span></div>
      </div>
      <div className="status-banner-actions">
        <button className="button outline" onClick={onGoToConnect}>Connect WhatsApp</button>
        <button className="button outline" onClick={onGoToProjects}>Projects</button>
        <button className="button primary blue" onClick={onGoToKeys}>API keys</button>
        {mode === "live" ? <button className="button outline" onClick={onRetry}>Re-check live connection</button> : null}
      </div>
    </Panel>
  );
}

function ActivationPanel({
  mode,
  health,
  readiness,
  projectCount,
  keyCount,
  hasPublicApiKey,
  onGoToConnect,
  onGoToProjects,
  onGoToKeys,
  onGoToDocs,
}: {
  mode: ConnectionMode;
  health: CloudHealth | null;
  readiness: CloudReadiness | null;
  projectCount: number;
  keyCount: number;
  hasPublicApiKey: boolean;
  onGoToConnect: () => void;
  onGoToProjects: () => void;
  onGoToKeys: () => void;
  onGoToDocs: () => void;
}) {
  const summary = readiness?.summary;
  const items = [
    { label: "Cloud connection", state: mode === "preview" ? "Preview" : readiness?.status === "ok" ? "Connected" : readiness ? "Needs attention" : "Checking", done: mode === "preview" || Boolean(readiness) },
    { label: "Project / workspace", state: summary?.workspace_count ? `${summary.workspace_count} workspaces` : "Missing", done: Boolean(summary?.workspace_count) },
    { label: "API key", state: summary?.has_public_api_key ? "Ready" : keyCount > 0 ? "Issued" : "Missing", done: Boolean(summary?.has_public_api_key || keyCount > 0) },
    { label: "WhatsApp", state: summary?.has_whatsapp_configuration ? "Configured" : "Missing", done: Boolean(summary?.has_whatsapp_configuration) },
    { label: "Webhooks", state: summary?.recent_webhook_count ? `${summary.recent_webhook_count} recent` : "Idle", done: Boolean(summary?.recent_webhook_count) },
  ];

  return (
    <Panel className="activation-panel">
      <div className="panel-head bordered">
        <div>
          <h2>First-run activation</h2>
          <p className="helper-text">Complete these steps to move from a shell to a live operator workspace.</p>
        </div>
        <StatusChip tone={mode === "preview" ? "blue" : readiness?.status === "ok" ? "green" : "amber"} label={mode === "preview" ? "Preview" : readiness?.status === "ok" ? "Live connected" : "Live needs attention"} />
      </div>
      <div className="activation-grid">
        {items.map((item) => (
          <div key={item.label} className={`activation-item ${item.done ? "done" : ""}`}>
            <span className={`dot ${item.done ? "good" : "warn"}`} />
            <div>
              <strong>{item.label}</strong>
              <small>{item.state}</small>
            </div>
          </div>
        ))}
      </div>
      <div className="status-banner-actions">
        <button className="button primary blue" onClick={onGoToProjects}>Create project</button>
        <button className="button outline" onClick={onGoToKeys}>Create API key</button>
        <button className="button outline" onClick={onGoToConnect}>Connect WhatsApp</button>
        <button className="button outline" onClick={onGoToDocs}>Read setup docs</button>
      </div>
    </Panel>
  );
}

function timeAgo(value: string) {
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.max(Math.floor(diff / 60000), 0);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
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


function ConnectWhatsApp({
  mode,
  readiness,
  selectedWorkspace,
  onCopy,
  onGoToProjects,
  onGoToKeys,
  onRefresh,
}: {
  mode: ConnectionMode;
  readiness: CloudReadiness | null;
  selectedWorkspace: string;
  onCopy: (text: string) => void;
  onGoToProjects: () => void;
  onGoToKeys: () => void;
  onRefresh: () => void;
}) {
  const summary = readiness?.summary;
  const workspace = readiness?.workspace;
  const webhookUrl = `${window.location.origin.replace(/\/$/, "")}/whatsapp/webhook`;
  const connectionLabel =
    mode === "preview"
      ? "Preview mode"
      : readiness
        ? readiness.status === "ok"
          ? "Live ready"
          : "Live needs attention"
        : "Checking live readiness";
  const checklistItems = [
    readiness?.auth?.token === "accepted" ? "Operator token accepted" : "Operator token not validated yet",
    workspace ? `Workspace selected: ${workspace.name}` : selectedWorkspace ? `Workspace selected: ${selectedWorkspace}` : "No workspace selected",
    summary?.has_public_api_key ? "Public API key is available" : "Create a workspace public API key",
    summary?.has_whatsapp_configuration ? "WhatsApp account is configured" : "Configure WhatsApp account credentials in the backend",
    summary?.recent_webhook_count ? `${summary.recent_webhook_count} recent webhook conversations` : "No recent webhook traffic recorded",
    summary?.has_payment_provider_configuration ? "Payment provider events are present" : "No payment provider events recorded",
  ];
  const diagnostics = readiness?.diagnostics ?? [];
  const nextFix =
    !readiness
      ? "Refresh live connection to load backend readiness."
      : !workspace
        ? "Create or select a workspace first."
        : !summary?.has_public_api_key
          ? "Create a workspace public API key."
          : !summary?.has_whatsapp_configuration
            ? "Finish WhatsApp setup and webhook wiring."
            : !summary?.recent_webhook_count
              ? "Send a test WhatsApp message to confirm webhook traffic."
              : !summary?.has_payment_provider_configuration
                ? "Connect a payment provider if revenue flows are expected."
                : "Everything required for live WhatsApp traffic is present.";

  return (
    <div className="detail-layout connect-layout">
      <Panel>
        <div className="panel-head bordered">
          <h2>WhatsApp connection</h2>
          <StatusChip tone={mode === "preview" ? "blue" : readiness?.status === "ok" ? "green" : "amber"} label={connectionLabel} />
        </div>
        <p className="helper-text">
          This screen only shows state the backend can actually prove. If the cloud is connected but WhatsApp is incomplete, the dashboard stays honest about it.
        </p>
        <div className="status-stack">
          {[
            { label: "Cloud API", value: readiness ? "Reachable" : "Not checked yet", ok: Boolean(readiness) },
            { label: "Operator token", value: readiness?.auth?.token === "accepted" ? "Accepted" : "Pending", ok: readiness?.auth?.token === "accepted" },
            { label: "Workspace", value: workspace ? workspace.name : selectedWorkspace || "Missing", ok: Boolean(workspace || selectedWorkspace) },
            { label: "Public API key", value: summary?.has_public_api_key ? "Ready" : "Missing", ok: Boolean(summary?.has_public_api_key) },
            { label: "WhatsApp config", value: summary?.has_whatsapp_configuration ? "Configured" : "Missing", ok: Boolean(summary?.has_whatsapp_configuration) },
            { label: "Webhook traffic", value: summary?.recent_webhook_count ? `${summary.recent_webhook_count} recent` : "None yet", ok: Boolean(summary?.recent_webhook_count) },
          ].map((item) => (
            <div key={item.label} className="status-item">
              <span className={item.ok ? "dot good" : "dot warn"} />
              <div>
                <strong>{item.label}</strong>
                <small>{item.value}</small>
              </div>
            </div>
          ))}
        </div>
      </Panel>
      <Panel className="wide-detail setup-card">
        <div className="panel-head">
          <h2>Connection diagnostics</h2>
          <div className="inline-actions">
            <button className="button outline" onClick={onRefresh}><Clock size={15} /> Refresh</button>
            <button className="button outline" onClick={() => onCopy(checklistItems.join("\n"))}><Clipboard size={15} /> Copy checklist</button>
          </div>
        </div>
        <div className="webhook-box">
          <span>Webhook endpoint</span>
          <code>{webhookUrl}</code>
          <small className="helper-text">Mount this endpoint on the host serving your ClientPad webhook handler, then subscribe Meta to it.</small>
          <div className="inline-actions">
            <button className="button primary blue" onClick={() => onCopy(webhookUrl)}>Copy URL</button>
            <button className="button outline" onClick={onGoToKeys}>Open API keys</button>
          </div>
        </div>
        <div className="status-callout">
          <strong>{connectionLabel}</strong>
          <p>
            {nextFix}
          </p>
        </div>
        <div className="status-stack">
          {diagnostics.map((item) => (
            <div key={item.key} className="status-item">
              <span className={item.status === "ok" ? "dot good" : "dot warn"} />
              <div>
                <strong>{item.label}</strong>
                <small>{item.detail}</small>
              </div>
            </div>
          ))}
        </div>
        <ol className="checklist">
          {checklistItems.map((item) => <li key={item}>{item}</li>)}
        </ol>
        <div className="empty-actions">
          <button className="button primary blue" onClick={onGoToProjects}>Create or select project</button>
          <button className="button outline" onClick={onGoToKeys}>Create API key</button>
        </div>
      </Panel>
    </div>
  );
}

function PipelineScreen({ clients, mode }: { clients: ClientRecord[]; mode: ConnectionMode }) {
  const counts = Object.fromEntries(serviceStages.map((stage) => [stage, clients.filter((client) => client.status === stage).length]));
  return (
    <div className="pipeline-stack">
      <Panel className="pipeline-summary">
        <div className="panel-head bordered">
          <h2>Pipeline status</h2>
          <StatusChip tone={mode === "preview" ? "blue" : "green"} label={mode === "preview" ? "Preview data" : "Live pipeline"} />
        </div>
        <div className="pipeline-metrics">
          {serviceStages.map((stage) => (
            <div key={stage} className="pipeline-metric">
              <strong>{counts[stage] ?? 0}</strong>
              <span>{stage}</span>
            </div>
          ))}
        </div>
      </Panel>
      <div className="pipeline-board">
      {serviceStages.map((stage) => {
        const stageClients = clients.filter((client) => client.status === stage);
        return (
          <Panel key={stage} className="stage-panel">
            <div className="panel-head bordered compact-head">
              <h2>{stage} <span>{stageClients.length}</span></h2>
            </div>
            <div className="stage-cards">
              {stageClients.map((client) => (
                <article className="client-card" key={client.id}>
                  <strong>{client.name}</strong>
                  <span>{client.phone}</span>
                  <small>{client.service}</small>
                  <b>${client.value.toLocaleString()}</b>
                </article>
              ))}
              {!stageClients.length ? <p className="empty-state">No clients here yet. Move a lead forward from the inbox or create a test lead to populate this stage.</p> : null}
            </div>
          </Panel>
        );
      })}
      </div>
    </div>
  );
}

function ClientSearch({ clients, query, setQuery }: { clients: ClientRecord[]; query: string; setQuery: (query: string) => void }) {
  return (
    <div className="detail-layout single">
      <Panel>
        <h2>Phone/name lookup</h2>
        <label className="lookup-input">
          <Search size={18} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Type +234..., 0803..., Ada, Musa..." />
        </label>
        <p className="helper-text">Search removes spaces, dashes, parentheses, and leading + so phone lookups stay fast on low-data Android devices.</p>
      </Panel>
      <Panel className="table-panel wide-detail">
        <div className="panel-head bordered"><h2>Matched clients <span>{clients.length}</span></h2></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Stage</th><th>Service</th><th>Value</th><th>Last message</th></tr></thead>
            <tbody>{clients.map((client) => (
              <tr key={client.id}><td>{client.name}</td><td><a>{client.phone}</a></td><td>{client.status}</td><td>{client.service}</td><td>${client.value.toLocaleString()}</td><td>{client.lastMessage}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function TeamInbox({
  session,
  publicApiKey,
  mode,
  readiness,
  onGoToSettings,
  onGoToKeys,
}: {
  session: Session;
  publicApiKey: string;
  mode: ConnectionMode;
  readiness: CloudReadiness | null;
  onGoToSettings: () => void;
  onGoToKeys: () => void;
}) {
  const [conversations, setConversations] = useState<WhatsAppConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);
  const [suggestions, setSuggestions] = useState<WhatsAppSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const sdk = useMemo(() => {
    return new ClientPad({
      baseUrl: session.baseUrl.replace("/api/cloud/v1", "/api/public/v1"),
      apiKey: publicApiKey || "",
    });
  }, [session.baseUrl, publicApiKey]);

  useEffect(() => {
    if (!publicApiKey) {
      setConversations([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    sdk.whatsapp.list().then((res) => {
      setConversations(res.data);
      if (res.data.length > 0 && !selectedId) {
        setSelectedId(res.data[0].id);
      }
      setLoading(false);
    }).catch(err => {
      console.error("Failed to load conversations", err);
      setLoading(false);
    });
  }, [sdk, publicApiKey]);

  useEffect(() => {
    if (!selectedId || !publicApiKey) {
      setMessages([]);
      setSuggestions([]);
      return;
    }
    
    Promise.all([
      sdk.whatsapp.messages(selectedId),
      sdk.whatsapp.suggestions(selectedId)
    ]).then(([msgRes, sugRes]) => {
      setMessages(msgRes.data);
      setSuggestions(sugRes.data.suggestions);
    }).catch(err => console.error("Failed to load conversation detail", err));
  }, [selectedId, sdk, publicApiKey]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const selectedConversation = conversations.find(c => c.id === selectedId);

  async function sendReply(textOverride?: string) {
    if (!selectedId) return;
    const text = textOverride || replyText;
    if (!text.trim()) return;

    setSending(true);
    try {
      await sdk.whatsapp.reply(selectedId, { message_text: text, send: true });
      setReplyText("");
      const msgRes = await sdk.whatsapp.messages(selectedId);
      setMessages(msgRes.data);
    } catch (err) {
      alert("Failed to send reply");
    } finally {
      setSending(false);
    }
  }

  async function approveSuggestion(index: number) {
    if (!selectedId) return;
    setSending(true);
    try {
      await sdk.whatsapp.approveSuggestion(selectedId, { suggestion_index: index, send: true });
      const msgRes = await sdk.whatsapp.messages(selectedId);
      setMessages(msgRes.data);
    } catch (err) {
      alert("Failed to approve suggestion");
    } finally {
      setSending(false);
    }
  }

  async function updateStatus(status: WhatsAppConversation["status"]) {
    if (!selectedId) return;
    try {
      await sdk.whatsapp.updateStatus(selectedId, { status });
      setConversations(prev => prev.map(c => c.id === selectedId ? { ...c, status } : c));
    } catch (err) {
      alert("Failed to update status");
    }
  }

  if (!publicApiKey) {
    return (
      <div className="empty-state-panel">
        <AlertCircle size={48} />
        <h2>{mode === "preview" ? "Preview inbox" : "Live inbox is not connected yet"}</h2>
        <p>
          {mode === "preview"
            ? "Preview mode uses sample workflow data. Connect a live workspace API key to load real WhatsApp conversations."
            : readiness?.summary.has_public_api_key
              ? "The cloud is connected, but the live inbox still needs a usable workspace API key."
              : "Set a workspace API key in Settings to load live WhatsApp conversations, suggestions, and status updates."}
        </p>
        <div className="empty-actions">
          <button className="button primary blue" onClick={onGoToSettings}>Open settings</button>
          <button className="button outline" onClick={onGoToKeys}>Create API key</button>
        </div>
      </div>
    );
  }

  return (
    <div className="inbox-layout">
      <Panel className="conversation-list">
        <div className="panel-head">
          <h2>Conversations</h2>
          <StatusChip tone={mode === "preview" ? "blue" : readiness?.summary.has_public_api_key ? "green" : "amber"} label={mode === "preview" ? "Preview inbox" : readiness?.summary.has_public_api_key ? "Live inbox" : "Live inbox needs key"} />
        </div>
        <div className="scroll-area">
          {loading ? <p className="loading">Loading...</p> : conversations.map((c) => (
            <button 
              key={c.id} 
              className={`conversation ${selectedId === c.id ? "active" : ""}`}
              onClick={() => setSelectedId(c.id)}
            >
              <div className="conv-header">
                <strong>{c.contact_name || c.phone}</strong>
                <small>{c.last_message_at ? new Date(c.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}</small>
              </div>
              <p className="preview">{c.ai_summary || "No messages yet"}</p>
              <div className="conv-badges">
                {c.requires_owner_approval && <Badge tone="blue">Owner Approval</Badge>}
                {c.ai_intent && <Badge tone="gray">{c.ai_intent}</Badge>}
                {c.status ? <Badge tone={c.status === "open" ? "green" : "gray"}>{c.status}</Badge> : null}
              </div>
            </button>
          ))}
          {!loading && conversations.length === 0 && <p className="empty">No live conversations yet. Send a test WhatsApp message or connect the public API key to start seeing traffic.</p>}
        </div>
      </Panel>

      <Panel className="timeline-panel">
        {selectedConversation ? (
          <>
            <div className="panel-head">
              <div className="header-info">
                <h2>{selectedConversation.contact_name || selectedConversation.phone}</h2>
                <Badge tone={selectedConversation.status === "open" ? "green" : "gray"}>
                  {selectedConversation.status.toUpperCase()}
                </Badge>
              </div>
              <div className="header-actions">
                <button className="button outline" onClick={() => updateStatus("closed")}>Close</button>
                <button className="button outline" onClick={() => updateStatus("archived")}>Archive</button>
              </div>
            </div>
            <div className="messages" ref={scrollRef}>
              {messages.map((m) => (
                <div key={m.id} className={`bubble-row ${m.direction}`}>
                  <div className="bubble-icon">
                    {m.direction === "inbound" ? <User size={14} /> : <Bot size={14} />}
                  </div>
                  <div className="bubble">
                    <p>{m.message_text}</p>
                    <small>{new Date(m.created_at).toLocaleTimeString()}</small>
                  </div>
                </div>
              ))}
            </div>
            <div className="composer">
              <textarea 
                placeholder="Type a reply..." 
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                disabled={sending}
              />
              <button 
                className="button primary blue" 
                onClick={() => sendReply()}
                disabled={sending || !replyText.trim()}
              >
                <Send size={16} />
                Send
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">Select a conversation to review its timeline, send a reply, or promote it through the pipeline.</div>
        )}
      </Panel>

      <Panel className="quick-replies">
        <div className="panel-head">
          <h2>AI Drafts</h2>
          <StatusChip tone="green" label={`${suggestions.length} drafts`} />
        </div>
        <div className="suggestions-list">
          {suggestions.length > 0 ? suggestions.map((s, i) => (
            <div key={i} className="suggestion-card">
              <div className="suggestion-meta">
                <Badge tone={s.requiresOwnerApproval ? "blue" : "gray"}>
                  {s.intent} ({(s.confidence * 100).toFixed(0)}%)
                </Badge>
                {s.requiresOwnerApproval && <AlertCircle size={14} className="warning-icon" />}
              </div>
              <p>{s.body}</p>
              <div className="suggestion-actions">
                <button 
                  className="button outline"
                  onClick={() => setReplyText(s.body)}
                >
                  Edit
                </button>
                <button 
                  className="button primary"
                  onClick={() => approveSuggestion(i)}
                  disabled={sending}
                >
                  Approve & Send
                </button>
              </div>
            </div>
          )) : <p className="empty">No AI suggestions yet. New messages will generate drafts here once the inbox receives live traffic.</p>}
        </div>

        {selectedConversation && (
          <div className="lead-panel">
            <h3>Lead Context</h3>
            <div className="lead-info">
              <div className="info-row">
                <span>Pipeline Stage</span>
                <strong>{(selectedConversation as any).lead_pipeline_stage || "New Lead"}</strong>
              </div>
              <div className="info-row">
                <span>Phone</span>
                <strong>{selectedConversation.phone}</strong>
              </div>
              <div className="info-row">
                <span>Intent</span>
                <strong>{selectedConversation.ai_intent || "General"}</strong>
              </div>
            </div>
            <div className="pipeline-actions">
              <select 
                onChange={(e) => sdk.whatsapp.updateStatus(selectedConversation.id, { pipeline_stage: e.target.value })}
                defaultValue={(selectedConversation as any).lead_pipeline_stage}
              >
                {serviceStages.map(s => <option key={s} value={s.toLowerCase().replace(" ", "_")}>{s}</option>)}
              </select>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

function TeamInboxDemo() {
  return (
    <div className="inbox-layout">
      <Panel className="conversation-list">
        <h2>Conversations</h2>
        {demoConversations.map((conversation, index) => (
          <button key={conversation.name} className={index === 0 ? "conversation active" : "conversation"}>
            <strong>{conversation.name}</strong>
            <span>{conversation.preview}</span>
            <small>{conversation.time}</small>
          </button>
        ))}
      </Panel>
      <Panel className="timeline-panel">
        <div className="panel-head"><h2>Message timeline</h2><Badge tone="green">Assigned</Badge></div>
        <div className="messages">
          <p className="bubble inbound">Hi, can I get the quote for AC servicing today?</p>
          <p className="bubble outbound">Yes — ₦45,000 including call-out. We can book 3 PM.</p>
          <p className="bubble inbound">Great, please book it and send payment link.</p>
        </div>
        <label className="mention-field">Assignment / mentions<input defaultValue="@Aisha assigned · @Ops please watch payment" /></label>
      </Panel>
      <Panel className="quick-replies">
        <h2>Quick reply suggestions</h2>
        {demoReplies.map((reply) => <button className="reply-chip" key={reply}>{reply}</button>)}
      </Panel>
    </div>
  );
}

function RevenueDashboard() {
  const totalPaid = demoRevenue.reduce((sum, client) => sum + client.amount, 0);
  const pending = demoClients.filter((client) => ["Quoted", "Booked", "Completed"].includes(client.status)).reduce((sum, client) => sum + client.value, 0);
  return (
    <div className="detail-layout single">
      <div className="metric-grid revenue-metrics">
        <Panel><span className="metric-label">Total paid</span><strong className="metric-value">${totalPaid.toLocaleString()}</strong></Panel>
        <Panel><span className="metric-label">Pending payments</span><strong className="metric-value">${pending.toLocaleString()}</strong></Panel>
        <Panel><span className="metric-label">Paystack</span><strong className="metric-value healthy">Live</strong><small>Webhook synced 2 min ago</small></Panel>
        <Panel><span className="metric-label">Flutterwave</span><strong className="metric-value healthy">Live</strong><small>Settlement pending: $420</small></Panel>
      </div>
      <Panel className="table-panel wide-detail">
        <div className="panel-head bordered"><h2>Recent paid clients</h2><span>{demoRevenue.length} payments</span></div>
        <div className="table-wrap"><table><thead><tr><th>Client</th><th>Phone</th><th>Amount</th><th>Provider</th><th>Paid at</th></tr></thead><tbody>
          {demoRevenue.map((client) => <tr key={`${client.phone}-${client.paidAt}`}><td>{client.name}</td><td>{client.phone}</td><td>${client.amount.toLocaleString()}</td><td>{client.provider}</td><td>{client.paidAt}</td></tr>)}
        </tbody></table></div>
      </Panel>
    </div>
  );
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

  async health() {
    return this.request<CloudHealth>("/health");
  }

  async readiness(workspaceId?: string) {
    const query = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : "";
    return this.request<CloudReadiness>(`/readiness${query}`);
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
  if (path === "/health") return { status: "ok", service: "@clientpad/cloud", time: new Date().toISOString() };
  if (path.startsWith("/readiness")) {
    const workspace = path.includes("workspace_id=workspace_stage")
      ? demoReadinessWorkspace("workspace_stage", "Staging API", 1, 1, 1, 1, 1, 1)
      : demoReadinessWorkspace("workspace_prod", "Acme Corp", 2, 2, 1, 1, 1, 1);
    const summary = {
      workspace_count: 4,
      project_count: 4,
      key_count: 3,
      active_subscription_count: 3,
      whatsapp_account_count: 2,
      active_whatsapp_account_count: 2,
      payment_provider_count: 2,
      latest_whatsapp_activity_at: "2026-05-12T11:00:00Z",
      latest_payment_event_at: "2026-05-12T10:30:00Z",
      recent_webhook_count: 4,
      has_public_api_key: true,
      has_whatsapp_configuration: true,
      has_payment_provider_configuration: true,
    };
    return {
      status: "ok",
      service: "@clientpad/cloud",
      time: new Date().toISOString(),
      auth: { token: "accepted" },
      summary,
      workspace,
      diagnostics: [
        { key: "workspace", label: "Workspace", status: "ok", detail: `${workspace.name} selected` },
        { key: "projects", label: "Projects", status: "ok", detail: `${workspace.project_count} projects found` },
        { key: "keys", label: "API keys", status: "ok", detail: "At least one public API key is active" },
        { key: "whatsapp", label: "WhatsApp", status: "ok", detail: `${workspace.active_whatsapp_account_count} active WhatsApp accounts` },
        { key: "payments", label: "Payments", status: "ok", detail: `${workspace.payment_provider_count} payment providers reporting activity` },
        { key: "webhooks", label: "Recent webhooks", status: "ok", detail: `${workspace.recent_webhook_count} recent webhook conversations` },
      ],
    };
  }
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


const demoClients: ClientRecord[] = [
  { id: "client_ada", name: "Ada Okafor", phone: "+234 803 555 0198", status: "New Lead", service: "Solar audit", value: 320, lastMessage: "Please confirm roof photos." },
  { id: "client_musa", name: "Musa Bello", phone: "+234 701 222 4444", status: "Quoted", service: "Generator repair", value: 460, lastMessage: "Quote sent on WhatsApp." },
  { id: "client_zuri", name: "Zuri Homes", phone: "+254 711 300 902", status: "Booked", service: "Cleaning package", value: 780, lastMessage: "Technician booked for Friday." },
  { id: "client_kofi", name: "Kofi Mensah", phone: "+233 24 900 1122", status: "In Progress", service: "AC servicing", value: 520, lastMessage: "Team is on-site." },
  { id: "client_lina", name: "Lina Patel", phone: "+1 (404) 555-0188", status: "Completed", service: "Website handover", value: 1250, lastMessage: "Awaiting payment confirmation." },
  { id: "client_noah", name: "Noah Carter", phone: "+44 7700 900123", status: "Paid", service: "Consulting sprint", value: 2100, lastMessage: "Receipt sent." },
  { id: "client_amara", name: "Amara Nwosu", phone: "0803-777-4422", status: "Review Requested", service: "Salon booking flow", value: 640, lastMessage: "Review request delivered." },
];

const demoRevenue: RevenueClient[] = [
  { name: "Noah Carter", phone: "+44 7700 900123", amount: 2100, paidAt: "May 8, 2026", provider: "Paystack" },
  { name: "Amara Nwosu", phone: "0803-777-4422", amount: 640, paidAt: "May 7, 2026", provider: "Flutterwave" },
  { name: "Kofi Mensah", phone: "+233 24 900 1122", amount: 520, paidAt: "May 6, 2026", provider: "Paystack" },
];

const demoConversations = [
  { name: "Ada Okafor", preview: "Please confirm roof photos.", time: "09:42" },
  { name: "Musa Bello", preview: "Can you discount the generator repair?", time: "08:18" },
  { name: "Zuri Homes", preview: "Friday still works for us.", time: "Yesterday" },
];

const demoReplies = [
  "Thanks — we are checking this now.",
  "Here is your payment link.",
  "Can you share your preferred time window?",
  "Your booking is confirmed.",
];

const demoUsage: UsageRow[] = [
  { api_key_id: "api_key_444f", name: "Production Server Key", billing_mode: "cloud_paid", monthly_request_limit: 10_000_000, rate_limit_per_minute: 1200, request_count: 1_532_984, rejected_count: 73 },
  { api_key_id: "api_key_2a7b", name: "Staging Server Key", billing_mode: "cloud_paid", monthly_request_limit: 10_000_000, rate_limit_per_minute: 1200, request_count: 512_771, rejected_count: 52 },
  { api_key_id: "api_key_9c3d", name: "Dev CLI Key", billing_mode: "cloud_free", monthly_request_limit: 100_000, rate_limit_per_minute: 300, request_count: 346_118, rejected_count: 7 },
];

function demoReadinessWorkspace(
  id: string,
  name: string,
  projectCount: number,
  keyCount: number,
  whatsappAccountCount: number,
  activeWhatsappAccountCount: number,
  paymentProviderCount: number,
  recentWebhookCount: number
): CloudReadinessWorkspace {
  return {
    id,
    name,
    project_count: projectCount,
    key_count: keyCount,
    active_subscription_count: 1,
    whatsapp_account_count: whatsappAccountCount,
    active_whatsapp_account_count: activeWhatsappAccountCount,
    payment_provider_count: paymentProviderCount,
    latest_whatsapp_activity_at: "2026-05-12T11:00:00Z",
    latest_payment_event_at: "2026-05-12T10:30:00Z",
    recent_webhook_count: recentWebhookCount,
    has_public_api_key: keyCount > 0,
    has_whatsapp_configuration: activeWhatsappAccountCount > 0,
    has_payment_provider_configuration: paymentProviderCount > 0,
  };
}

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
    node: `import { ClientPad } from "@clientpad/sdk";\n\nconst clientpad = new ClientPad({\n  baseUrl: "https://api.clientpad.cloud/v1",\n  apiKey: process.env.CLIENTPAD_API_KEY!,\n});\n\nawait clientpad.leads.create({ name: "${resource}" });`,
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

function filterClients(clients: ClientRecord[], query: string) {
  const normalizedQuery = normalizeLookup(query);
  if (!normalizedQuery) return clients;
  return clients.filter((client) => {
    const name = client.name.toLowerCase();
    const phone = normalizeLookup(client.phone);
    return name.includes(query.toLowerCase()) || phone.includes(normalizedQuery);
  });
}

function normalizeLookup(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function titleForPage(page: Page) {
  return {
    overview: "Overview",
    connect: "Connect WhatsApp",
    pipeline: "Live Pipeline",
    clients: "Client Search",
    inbox: "Team Inbox",
    revenue: "Revenue",
    usage: "Usage",
    billing: "Usage & Billing",
    projects: "Projects",
    keys: "API Keys",
    docs: "Docs",
    settings: "Settings",
  }[page];
}

function subtitleForPage(page: Page, project?: Project) {
  return {
    overview: "System status and workspace summary",
    connect: "Paste Meta credentials and copy webhook setup steps",
    pipeline: "Track every client across service stages in real time",
    clients: "Fast lookup by normalized phone number or client name",
    inbox: "Shared conversations, assignment, mentions, and quick replies",
    revenue: "Paid totals, pending payments, gateway health, and recent clients",
    usage: `${project?.name ?? "Workspace"} request activity and quota usage`,
    billing: "Cloud quotas, plan limits, billing period, and upgrade controls",
    projects: "Create, inspect, and manage hosted workspaces",
    keys: "Issue, copy, and inspect developer access keys",
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

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("ClientPad service worker registration failed", error);
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
registerServiceWorker();
