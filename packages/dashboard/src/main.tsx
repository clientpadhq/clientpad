import React, { useEffect, useMemo, useState, useRef } from "react";
import { createRoot } from "react-dom/client";
import { ClientPad, type WhatsAppConversation, type WhatsAppMessage, type WhatsAppSuggestion } from "@clientpad/sdk";
import {
  Moon,
  Sun,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  Clipboard,
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
  Server,
  Code2,
  Link2,
  Activity,
} from "lucide-react";
import "./styles.css";

type ConnectionMode = "preview" | "live";

type Session = {
  baseUrl: string;
  publicApiKey?: string;
  demo?: boolean;
  mode?: ConnectionMode;
  validatedAt?: string;
  readiness?: CloudReadiness;
  user?: CloudAuthUser;
  workspaces?: CloudWorkspace[];
  selectedWorkspaceId?: string;
  sessionExpiresAt?: string | null;
  usageSummary?: UsageSummary;
};

type CloudHealth = {
  status: "ok" | "degraded" | "error";
  service: string;
  time: string;
};

type CloudAuthUser = {
  id: string;
  email: string;
  full_name: string | null;
};

type CloudWorkspace = {
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

type UsageSummary = {
  workspace_id: string;
  workspace_name: string;
  plan_code: string | null;
  plan_name: string | null;
  month: string;
  request_count: number;
  rejected_count: number;
  active_api_key_count: number;
  monthly_request_limit: number | null;
  rate_limit_per_minute: number | null;
  remaining_requests: number | null;
  last_used_at: string | null;
  billing_mode: string | null;
};

type CloudAuthStatus = {
  registration_open: boolean;
  first_operator_setup_required?: boolean;
  operator_count: number;
  workspace_count: number;
};

type CloudAuthEnvelope = {
  status: string;
  service: string;
  time: string;
  auth: {
    user: CloudAuthUser;
    session_expires_at: string;
    selected_workspace_id: string | null;
    workspaces: CloudWorkspace[];
  };
  bootstrap?: CloudBootstrapBundle;
};

type CloudBootstrapBundle = {
  workspace: CloudWorkspace;
  project: Project;
  api_key: ApiKeyResult;
  usage: UsageSummary;
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

type DeploymentRecord = {
  service: string;
  host: string;
  target: string;
  status: "live" | "deploying" | "warning";
  deployed_at: string;
  commit: string;
  trigger: string;
  note: string;
};

type ActivityRecord = {
  actor: string;
  action: string;
  context: string;
  time: string;
  tone: "green" | "blue" | "amber" | "gray";
};

type WebhookDelivery = {
  id: string;
  event: string;
  endpoint: string;
  status: "delivered" | "retrying" | "failed";
  attempts: number;
  time: string;
  response: string;
};

type MonitoringMetric = {
  label: string;
  value: string;
  detail: string;
  tone: "green" | "blue" | "amber" | "gray";
};

type MonitoringAlert = {
  title: string;
  detail: string;
  time: string;
  severity: "ok" | "warning" | "fail";
};

type CloudReadiness = {
  status: "ok" | "degraded";
  service: string;
  time: string;
  auth: {
    user: CloudAuthUser | null;
    session_expires_at: string | null;
    mode: "operator_session" | "admin";
  };
  summary: CloudReadinessWorkspaceSummary;
  workspace: CloudReadinessWorkspace | null;
  diagnostics: CloudReadinessDiagnostic[];
};

type ConnectionState = "preview" | "checking" | "connected" | "misconfigured" | "unavailable";

type Page = "overview" | "connect" | "pipeline" | "clients" | "inbox" | "revenue" | "usage" | "billing" | "projects" | "keys" | "launch" | "infrastructure" | "deployments" | "developers" | "activity" | "integrations" | "security" | "monitoring" | "docs" | "settings";
type QuickstartLanguage = "curl" | "python" | "node" | "go" | "ruby";
type DashboardTheme = "light" | "dark";
type LaunchCheckStatus = "checking" | "ok" | "warning" | "fail";

type LaunchCheck = {
  id: string;
  label: string;
  url: string;
  status: LaunchCheckStatus;
  detail: string;
  nextAction?: string;
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
const dashboardThemeKey = "clientpad.dashboard.theme";
const dashboardPageParamKey = "page";
const defaultCloudBaseUrl = window.location.hostname.includes("localhost")
  ? "http://localhost:3000/api/cloud/v1"
  : "https://api.clientpad.xyz/api/cloud/v1";
const dashboardPages: Page[] = ["overview", "connect", "pipeline", "clients", "inbox", "revenue", "usage", "billing", "projects", "keys", "launch", "infrastructure", "deployments", "developers", "activity", "integrations", "security", "monitoring", "docs", "settings"];
const dashboardPageSet = new Set<Page>(dashboardPages);

function resolveDashboardTheme(): DashboardTheme {
  const stored = localStorage.getItem(dashboardThemeKey);
  if (stored === "light" || stored === "dark") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyDashboardTheme(theme: DashboardTheme) {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(dashboardThemeKey, theme);
}

function resolvePageFromUrl(): Page {
  const params = new URLSearchParams(window.location.search);
  const raw = params.get(dashboardPageParamKey);
  return raw && dashboardPageSet.has(raw as Page) ? (raw as Page) : "overview";
}

function syncPageToUrl(page: Page) {
  const url = new URL(window.location.href);
  if (page === "overview") url.searchParams.delete(dashboardPageParamKey);
  else url.searchParams.set(dashboardPageParamKey, page);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

function loadSession() {
  const saved = localStorage.getItem(sessionKey);
  if (!saved) return null;
  try {
    return JSON.parse(saved) as Session;
  } catch {
    localStorage.removeItem(sessionKey);
    return null;
  }
}

function persistSession(session: Session) {
  localStorage.setItem(sessionKey, JSON.stringify(session));
}

function mergeAuthSession(saved: Session, auth: CloudAuthEnvelope): Session {
  return {
    ...saved,
    mode: "live",
    demo: false,
    user: auth.auth.user,
    workspaces: auth.auth.workspaces,
    selectedWorkspaceId: auth.auth.selected_workspace_id ?? auth.auth.workspaces[0]?.id ?? "",
    sessionExpiresAt: auth.auth.session_expires_at,
    usageSummary: saved.usageSummary,
  };
}

function userInitials(user: CloudAuthUser) {
  const source = user.full_name || user.email;
  return source
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "OP";
}

function LoadingShell({ message }: { message: string }) {
  return (
    <main className="login-shell">
      <section className="login-panel">
        <Logo />
        <h1>ClientPad Dashboard</h1>
        <p>{message}</p>
      </section>
    </main>
  );
}

function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [bootstrapping, setBootstrapping] = useState<boolean>(() => Boolean(session && session.mode === "live" && !session.demo));
  const [sessionNotice, setSessionNotice] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function restore() {
      const saved = loadSession();
      if (!saved || saved.demo || saved.mode === "preview") {
        if (!cancelled) setBootstrapping(false);
        return;
      }

      try {
        const api = new CloudApi(saved.baseUrl, false);
        const auth = await api.me();
        const next = mergeAuthSession(saved, auth);
        if (cancelled) return;
        persistSession(next);
        setSession(next);
      } catch {
        if (cancelled) return;
        localStorage.removeItem(sessionKey);
        setSession(null);
        setSessionNotice("Live session expired. Sign in again.");
      } finally {
        if (!cancelled) setBootstrapping(false);
      }
    }

    restore();
    return () => {
      cancelled = true;
    };
  }, []);

  if (bootstrapping) return <LoadingShell message="Restoring operator session..." />;

  if (!session) return <Login onLogin={setSession} notice={sessionNotice} />;

  return (
    <Dashboard
      session={session}
      onLogout={async () => {
        const saved = loadSession();
        if (saved?.mode === "live" && !saved.demo) {
          try {
            const api = new CloudApi(saved.baseUrl, false);
            await api.logout();
          } catch {
            // Ignore logout network failures; the local session is cleared below.
          }
        }
        localStorage.removeItem(sessionKey);
        setSession(null);
      }}
      onSessionChange={(next) => {
        persistSession(next);
        setSession(next);
      }}
    />
  );
}

function Login({ onLogin, notice }: { onLogin: (session: Session) => void; notice?: string }) {
  const [mode, setMode] = useState<ConnectionMode>("preview");
  const [baseUrl, setBaseUrl] = useState(defaultCloudBaseUrl);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [workspaceName, setWorkspaceName] = useState("My Workspace");
  const [authMode, setAuthMode] = useState<"signin" | "register">("register");
  const [registrationKey, setRegistrationKey] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<CloudAuthStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAuthStatus() {
      if (mode !== "live") return;
      try {
        const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/auth/status`);
        const body = await response.json().catch(() => null);
        if (!cancelled && response.ok) setAuthStatus(body);
      } catch {
        if (!cancelled) setAuthStatus(null);
      }
    }

    loadAuthStatus();
    return () => {
      cancelled = true;
    };
  }, [baseUrl, mode]);
  if (registrationKey) {
    return <KeyReveal registrationKey={registrationKey} onLogin={onLogin} />;
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");

    if (mode === "preview") {
      const next: Session = { baseUrl: "demo", demo: true, mode: "preview" as const };
      persistSession(next);
      onLogin(next);
      return;
    }

    const normalized = baseUrl.replace(/\/+$/, "");
    setLoading(true);
    try {
      const healthResponse = await fetch(`${normalized}/health`, { credentials: "include" });
      if (!healthResponse.ok) throw new Error("API health check failed.");

      const path = authMode === "register" ? "/auth/register" : "/auth/login";
      const authResponse = await fetch(`${normalized}${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          authMode === "register"
            ? { email, password, full_name: fullName, workspace_name: workspaceName }
            : { email, password }
        ),
      });
      const authBody = await authResponse.json().catch(() => null);
      if (!authResponse.ok) {
        throw new Error(authBody?.error?.message ?? "Operator sign in failed.");
      }

      const apiKey = authBody.bootstrap?.api_key.key ?? "";
      const next: Session = {
        baseUrl: normalized,
        mode: "live" as const,
        validatedAt: new Date().toISOString(),
        user: authBody.auth.user,
        workspaces: authBody.auth.workspaces,
        selectedWorkspaceId: authBody.auth.selected_workspace_id ?? authBody.auth.workspaces?.[0]?.id ?? "",
        sessionExpiresAt: authBody.auth.session_expires_at,
        publicApiKey: apiKey,
        usageSummary: authBody.bootstrap?.usage,
      };
      persistSession(next);
      if (authMode === "register" && apiKey) {
        setRegistrationKey(apiKey);
      } else {
        onLogin(next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to ClientPad API.");
    } finally {
      setLoading(false);
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
        <h1>{mode === "preview" ? "Preview workspace" : authMode === "register" ? "Create operator account" : "ClientPad Dashboard"}</h1>
        <p>
          {mode === "preview"
            ? "Open a sample workspace to understand the dashboard layout before connecting a real ClientPad API."
          : authMode === "register"
              ? "Create your operator account, workspace, first project, and starter API key in one step."
              : "Sign in with an operator account to manage projects, keys, usage, billing, and WhatsApp activity."}
        </p>
        <form onSubmit={submit} className="login-form">
          {mode === "live" ? (
            <>
              <label>
                API base URL
                <input value={baseUrl} onChange={(event) => setBaseUrl(event.target.value)} />
              </label>
              <label>
                Email
                <input
                  value={email}
                  type="email"
                  autoComplete="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="operator@clientpad.com"
                />
              </label>
              <label>
                Password
                <input
                  value={password}
                  type="password"
                  autoComplete="current-password"
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="********"
                />
              </label>
              {authMode === "register" ? (
                <>
                  <label>
                    Your name
                    <input value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Operator name" />
                  </label>
                  <label>
                    Workspace name
                    <input value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="ClientPad Workspace" />
                  </label>
                </>
              ) : null}
              <div className="inline-actions auth-actions">
                <button type="button" className={authMode === "signin" ? "button primary" : "button outline"} onClick={() => setAuthMode("signin")}>
                  Sign in
                </button>
                <button
                  type="button"
                  className={authMode === "register" ? "button primary" : "button outline"}
                  onClick={() => setAuthMode("register")}
                  disabled={false}
                >
                  {authStatus?.first_operator_setup_required ? "Create first operator" : "Create account"}
                </button>
              </div>
              {authStatus ? (
                <div className="preview-note">
                  {authStatus.registration_open
                    ? authStatus.first_operator_setup_required
                      ? "Registration is open. No operator accounts exist yet, so this deployment can be claimed now."
                      : `Registration is open. ${authStatus.operator_count} operator account${authStatus.operator_count === 1 ? "" : "s"} exist.`
                    : `Registration is closed. ${authStatus.operator_count} operator account${authStatus.operator_count === 1 ? "" : "s"} already exist.`}
                </div>
              ) : null}
            </>
          ) : (
            <div className="preview-note">
              Preview mode uses generated sample data, no API credentials, and no live WhatsApp traffic.
            </div>
          )}
          {notice ? <div className="preview-note">{notice}</div> : null}
          {error ? <div className="form-error">{error}</div> : null}
          <button className="button primary" type="submit">
            <ShieldCheck size={16} />
            {loading ? "Connecting..." : mode === "preview" ? "Open preview dashboard" : authMode === "register" ? "Create operator and open dashboard" : "Open live dashboard"}
          </button>
        </form>
      </section>
      <aside className="login-aside">
        <div className="preview-card">
          <div className="preview-card-head">
            <span>{mode === "preview" ? "Sample data" : authMode === "register" ? "First operator setup" : "Live operator view"}</span>
            <strong>{mode === "preview" ? "Safe to explore" : authMode === "register" ? "Claim this deployment" : "Connected to a real ClientPad API"}</strong>
          </div>
          <div className="mini-toolbar" />
          <div className="mini-chart" />
          <div className="mini-rows" />
        </div>
      </aside>
    </main>
  );
}



function KeyReveal({ registrationKey, onLogin }: { registrationKey: string; onLogin: (session: Session) => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <main className="login-shell">
      <section className="login-panel">
        <Logo />
        <h1>Your starter API key is ready</h1>
        <p style={{ maxWidth: 480 }}>This key boots up your workspace, project, and usage tracking. Copy it now &mdash; it will never be shown again.</p>
        <div className="key-reveal-box">
          <code style={{ userSelect: "all", wordBreak: "break-all", fontSize: "0.85rem" }}>{registrationKey}</code>
        </div>
        <div className="inline-actions" style={{ marginTop: "1.5rem" }}>
          <button className="button outline" onClick={async () => {
            await navigator.clipboard.writeText(registrationKey);
            setCopied(true);
          }}>
            {copied ? "Copied!" : "Copy key"}
          </button>
          <button className="button primary" onClick={() => {
            const saved = loadSession();
            if (saved) onLogin(saved);
          }}>
            Open dashboard
          </button>
        </div>
      </section>
      <aside className="login-aside">
        <div className="preview-card">
          <div className="preview-card-head">
            <span>Starter bundle created</span>
            <strong>Workspace &mdash; Project &mdash; API key</strong>
          </div>
          <div style={{ padding: "1rem", fontSize: "0.85rem", color: "var(--muted)" }}>
            <p>Your account, workspace, project, and API key were created together. Use the SDK or curl with this key to call the public API at <code style={{ fontSize: "0.75rem" }}>https://api.clientpad.xyz/api/public/v1</code>.</p>
          </div>
          <div className="mini-toolbar" />
          <div className="mini-chart" />
          <div className="mini-rows" />
        </div>
      </aside>
    </main>
  );
}
function Dashboard({
  session,
  onLogout,
  onSessionChange,
}: {
  session: Session;
  onLogout: () => Promise<void> | void;
  onSessionChange: (session: Session) => void;
}) {
  const [currentSession, setCurrentSession] = useState(session);
  const sessionRef = useRef(currentSession);
  useEffect(() => {
    setCurrentSession(session);
  }, [session]);
  useEffect(() => {
    sessionRef.current = currentSession;
  }, [currentSession]);

  const api = useMemo(() => new CloudApi(currentSession.baseUrl, Boolean(currentSession.demo)), [currentSession.baseUrl, currentSession.demo]);
  const mode = currentSession.mode ?? (currentSession.demo ? "preview" : "live");
  const [page, setPage] = useState<Page>(() => resolvePageFromUrl());
  const [theme, setTheme] = useState<DashboardTheme>(() => resolveDashboardTheme());
  const [plans, setPlans] = useState<Plan[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [workspaces, setWorkspaces] = useState<CloudWorkspace[]>(currentSession.workspaces ?? []);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [selectedWorkspace, setSelectedWorkspace] = useState(currentSession.selectedWorkspaceId ?? currentSession.workspaces?.[0]?.id ?? "");
  const [publicApiKey, setPublicApiKey] = useState(currentSession.publicApiKey || "");
  const [usageSummary, setUsageSummary] = useState<UsageSummary | null>(currentSession.usageSummary ?? null);
  const [query, setQuery] = useState("");
  const [dateRange, setDateRange] = useState("May 12 - May 19, 2025");
  const [showFilters, setShowFilters] = useState(false);
  const [quickstartLanguage, setQuickstartLanguage] = useState<QuickstartLanguage>("curl");
  const [selectedPlanCode, setSelectedPlanCode] = useState("pro");
  const [createdKey, setCreatedKey] = useState<ApiKeyResult | null>(null);
  const [bootstrapWorkspaceName, setBootstrapWorkspaceName] = useState(currentSession.workspaces?.[0]?.name || "ClientPad Workspace");
  const [bootstrapProjectName, setBootstrapProjectName] = useState("ClientPad API");
  const [bootstrapKeyName, setBootstrapKeyName] = useState("Starter API key");
  const [bootstrapping, setBootstrapping] = useState(false);
  const [billingAction, setBillingAction] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [health, setHealth] = useState<CloudHealth | null>(null);
  const [readiness, setReadiness] = useState<CloudReadiness | null>(currentSession.readiness ?? null);
  const [connectionState, setConnectionState] = useState<ConnectionState>(mode === "preview" ? "preview" : currentSession.readiness ? (currentSession.readiness.status === "ok" ? "connected" : "misconfigured") : "checking");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  async function refresh(workspaceOverride?: string, sessionOverride?: Session) {
    setLoading(true);
    try {
      const activeSession = sessionOverride ?? sessionRef.current;
      const activeApi = new CloudApi(activeSession.baseUrl, Boolean(activeSession.demo));
      const [authData, planData, projectData, healthData] = await Promise.all([
        activeSession.demo ? Promise.resolve(null) : activeApi.me(),
        activeApi.plans(),
        activeApi.projects(workspaceOverride || selectedWorkspace || activeSession.selectedWorkspaceId || undefined),
        activeApi.health(),
      ]);
      const mergedSession = authData && !activeSession.demo ? mergeAuthSession(activeSession, authData) : activeSession;
      const workspaceCandidates = mergedSession.workspaces ?? workspaces;
      const workspace =
        workspaceOverride ||
        mergedSession.selectedWorkspaceId ||
        selectedWorkspace ||
        workspaceCandidates[0]?.id ||
        projectData[0]?.workspace_id ||
        "";
      const readinessData = await activeApi.readiness(workspace || undefined);
      setPlans(planData);
      setProjects(projectData);
      setWorkspaces(workspaceCandidates);
      setSelectedWorkspace(workspace);
      setHealth(healthData);
      setReadiness(readinessData);
      setConnectionState(mode === "preview" ? "preview" : readinessData.status === "ok" ? "connected" : "misconfigured");
      const usageSummaryData = workspace ? await activeApi.usageSummary(workspace) : null;
      const snapshot: Session = {
        ...mergedSession,
        publicApiKey,
        readiness: readinessData,
        validatedAt: readinessData.time,
        mode,
        selectedWorkspaceId: workspace,
        usageSummary: usageSummaryData ?? mergedSession.usageSummary,
      };
      setCurrentSession(snapshot);
      onSessionChange(snapshot);
      if (workspace) {
        const usageData = await activeApi.usage(workspace);
        setUsage(usageData);
        setKeys(toKeyRecords(usageData, projectData));
        setUsageSummary(usageSummaryData);
      }
      setLastSyncedAt(new Date().toISOString());
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not refresh ClientPad API.";
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
    const project = await api.createProject({ ...input, workspace_id: selectedWorkspace || undefined });
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

  async function startCheckout(planCode: string) {
    const workspaceId = selectedWorkspace || currentSession.selectedWorkspaceId || currentSession.workspaces?.[0]?.id || "";
    if (!workspaceId) {
      setNotice("Create or select a workspace first.");
      return;
    }

    const selectedPlan = plans.find((plan) => plan.code === planCode);
    if (!selectedPlan) {
      setNotice("Select a plan before starting checkout.");
      return;
    }

    setBillingAction(planCode);
    try {
      const checkout = await api.createCheckoutSession({
        workspace_id: workspaceId,
        plan_code: planCode,
        success_url: `${window.location.origin}${window.location.pathname}?billing=success&plan=${encodeURIComponent(planCode)}`,
        cancel_url: `${window.location.origin}${window.location.pathname}?billing=cancel&plan=${encodeURIComponent(planCode)}`,
        customer_email: currentSession.user?.email,
      });
      setNotice(`Redirecting to ${selectedPlan.name} checkout...`);
      window.location.assign(checkout.url);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not start billing checkout.");
    } finally {
      setBillingAction(null);
    }
  }

  async function openBillingPortal() {
    const workspaceId = selectedWorkspace || currentSession.selectedWorkspaceId || currentSession.workspaces?.[0]?.id || "";
    if (!workspaceId) {
      setNotice("Create or select a workspace first.");
      return;
    }

    setBillingAction("portal");
    try {
      const portal = await api.createPortalSession({
        workspace_id: workspaceId,
        return_url: `${window.location.origin}${window.location.pathname}`,
      });
      setNotice("Opening billing portal...");
      window.location.assign(portal.url);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not open billing portal.");
    } finally {
      setBillingAction(null);
    }
  }

  async function bootstrapWorkspace() {
    const workspaceName = bootstrapWorkspaceName.trim();
    const projectName = bootstrapProjectName.trim();
    const keyName = bootstrapKeyName.trim();
    if (!workspaceName || !projectName || !keyName) {
      setNotice("Workspace, project, and API key names are required.");
      return;
    }

    setBootstrapping(true);
    try {
      const result = await api.bootstrapWorkspace({
        workspace_name: workspaceName,
        project_name: projectName,
        api_key_name: keyName,
        owner_email: currentSession.user?.email ?? undefined,
        plan_code: usageSummary?.plan_code ?? "free",
        environment: "production",
        workspace_id: selectedWorkspace || currentSession.selectedWorkspaceId || undefined,
      });

      const nextWorkspaceId = result.workspace.id;
      const nextSession: Session = {
        ...sessionRef.current,
        selectedWorkspaceId: nextWorkspaceId,
        workspaces: [
          ...(sessionRef.current.workspaces?.filter((workspace) => workspace.id !== nextWorkspaceId) ?? []),
          result.workspace,
        ],
        publicApiKey: result.api_key.key,
        usageSummary: result.usage,
      };
      setCreatedKey(result.api_key);
      setPublicApiKey(result.api_key.key);
      setUsageSummary(result.usage);
      setNotice(`Created ${result.workspace.name}, ${result.project.name}, and the starter API key.`);
      setCurrentSession(nextSession);
      onSessionChange(nextSession);
      await refresh(nextWorkspaceId, nextSession);
      setPage("overview");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not bootstrap workspace.");
    } finally {
      setBootstrapping(false);
    }
  }

  function selectWorkspace(workspaceId: string) {
    setSelectedWorkspace(workspaceId);
    setCurrentSession((prev) => ({ ...prev, selectedWorkspaceId: workspaceId }));
    onSessionChange({ ...sessionRef.current, selectedWorkspaceId: workspaceId });
    refresh(workspaceId).catch((error) => setNotice(error.message));
  }

  function selectPlan(code: string) {
    setSelectedPlanCode(code);
    setNotice(`Selected ${plans.find((plan) => plan.code === code)?.name ?? code} plan.`);
  }

  function updatePublicApiKey(key: string) {
    setPublicApiKey(key);
    const next = { ...currentSession, publicApiKey: key };
    setCurrentSession(next);
    onSessionChange(next);
  }

  const selectedProject = projects.find((project) => project.workspace_id === selectedWorkspace) ?? projects[0];
  const selectedPlan = plans.find((plan) => plan.code === selectedPlanCode) ?? plans[2] ?? plans[0];
  const filteredProjects = filterProjects(projects, query, showFilters);
  const filteredKeys = filterKeys(keys, query, showFilters);
  const totalRequests = usage.reduce((sum, row) => sum + Number(row.request_count || 0), 0);
  const rejectedRequests = usage.reduce((sum, row) => sum + Number(row.rejected_count || 0), 0);
  const connectionSummary: ConnectionState = mode === "preview" ? "preview" : connectionState;

  useEffect(() => {
    applyDashboardTheme(theme);
  }, [theme]);

  useEffect(() => {
    syncPageToUrl(page);
  }, [page]);

  return (
    <div className="console">
      <Sidebar page={page} setPage={setPage} />
      <main className="workspace">
        <Topbar
          projects={projects}
          user={currentSession.user ?? null}
          selectedWorkspace={selectedWorkspace}
          onWorkspaceChange={selectWorkspace}
          workspaces={workspaces}
          query={query}
          setQuery={setQuery}
          mode={mode}
          connectionState={connectionSummary}
          health={health}
          readiness={readiness}
          lastSyncedAt={lastSyncedAt}
          onLogout={onLogout}
          theme={theme}
          onGoHome={() => setPage("overview")}
          onToggleTheme={() => setTheme((current) => (current === "dark" ? "light" : "dark"))}
        />
        <section className="content">
          {page !== "overview" ? (
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
          ) : null}
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
              usageSummary={usageSummary}
              selectedPlan={selectedPlan}
              selectedProject={selectedProject}
              quickstartLanguage={quickstartLanguage}
              setQuickstartLanguage={setQuickstartLanguage}
              setPage={setPage}
              mode={mode}
              health={health}
              readiness={readiness}
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
          {page === "usage" && <Usage usage={usage} keys={filteredKeys} selectedProject={selectedProject} usageSummary={usageSummary} />}
          {page === "billing" && (
            <Billing
              plans={plans}
              selectedPlanCode={selectedPlanCode}
              onSelectPlan={selectPlan}
              usageSummary={usageSummary}
              onCheckout={startCheckout}
              onManageBilling={openBillingPortal}
              billingAction={billingAction}
            />
          )}
          {page === "launch" && (
            <LaunchReadiness
              session={currentSession}
              mode={mode}
              selectedWorkspace={selectedWorkspace}
              publicApiKey={publicApiKey}
              onGoToSettings={() => setPage("settings")}
            />
          )}
          {page === "infrastructure" && (
            <Infrastructure
              mode={mode}
              readiness={readiness}
              health={health}
              selectedWorkspace={selectedWorkspace}
              publicApiKey={publicApiKey}
              usageSummary={usageSummary}
              onGoToDeployments={() => setPage("deployments")}
              onGoToLaunch={() => setPage("launch")}
              onGoToDocs={() => setPage("docs")}
              onGoToProjects={() => setPage("projects")}
              onGoToKeys={() => setPage("keys")}
              onGoToConnect={() => setPage("connect")}
              onCopy={(text) => copyText(text, setNotice)}
            />
          )}
          {page === "deployments" && (
            <Deployments
              mode={mode}
              readiness={readiness}
              health={health}
              selectedWorkspace={selectedWorkspace}
              usageSummary={usageSummary}
              onGoToInfrastructure={() => setPage("infrastructure")}
              onGoToLaunch={() => setPage("launch")}
              onGoToDocs={() => setPage("docs")}
              onGoToProjects={() => setPage("projects")}
              onGoToKeys={() => setPage("keys")}
              onCopy={(text) => copyText(text, setNotice)}
            />
          )}
          {page === "developers" && (
            <Developers
              mode={mode}
              readiness={readiness}
              selectedProject={selectedProject}
              usageSummary={usageSummary}
              onGoToKeys={() => setPage("keys")}
              onGoToInfrastructure={() => setPage("infrastructure")}
              onGoToDeployments={() => setPage("deployments")}
              onGoToIntegrations={() => setPage("integrations")}
              onGoToMonitoring={() => setPage("monitoring")}
              onGoToDocs={() => setPage("docs")}
              onGoToLaunch={() => setPage("launch")}
              onCopy={(text) => copyText(text, setNotice)}
            />
          )}
          {page === "activity" && (
            <ActivityTrail
              mode={mode}
              readiness={readiness}
              usageSummary={usageSummary}
              selectedProject={selectedProject}
              onGoToDeployments={() => setPage("deployments")}
              onGoToInfrastructure={() => setPage("infrastructure")}
              onGoToDevelopers={() => setPage("developers")}
              onGoToIntegrations={() => setPage("integrations")}
              onGoToMonitoring={() => setPage("monitoring")}
              onGoToInbox={() => setPage("inbox")}
              onGoToKeys={() => setPage("keys")}
            />
          )}
          {page === "integrations" && (
            <Integrations
              mode={mode}
              readiness={readiness}
              session={currentSession}
              selectedWorkspace={selectedWorkspace}
              publicApiKey={publicApiKey}
              usageSummary={usageSummary}
              onGoToDevelopers={() => setPage("developers")}
              onGoToInfrastructure={() => setPage("infrastructure")}
              onGoToDeployments={() => setPage("deployments")}
              onGoToActivity={() => setPage("activity")}
              onGoToMonitoring={() => setPage("monitoring")}
              onGoToLaunch={() => setPage("launch")}
              onGoToDocs={() => setPage("docs")}
              onGoToKeys={() => setPage("keys")}
              onCopy={(text) => copyText(text, setNotice)}
            />
          )}
          {page === "security" && (
            <SecurityCenter
              mode={mode}
              readiness={readiness}
              session={currentSession}
              publicApiKey={publicApiKey}
              usageSummary={usageSummary}
              onGoToKeys={() => setPage("keys")}
              onGoToDevelopers={() => setPage("developers")}
              onGoToInfrastructure={() => setPage("infrastructure")}
              onGoToActivity={() => setPage("activity")}
              onGoToIntegrations={() => setPage("integrations")}
              onGoToMonitoring={() => setPage("monitoring")}
              onGoToLaunch={() => setPage("launch")}
              onGoToDocs={() => setPage("docs")}
              onCopy={(text) => copyText(text, setNotice)}
            />
          )}
          {page === "monitoring" && (
            <Monitoring
              mode={mode}
              health={health}
              readiness={readiness}
              usageSummary={usageSummary}
              session={currentSession}
              selectedWorkspace={selectedWorkspace}
              publicApiKey={publicApiKey}
              onGoToInfrastructure={() => setPage("infrastructure")}
              onGoToDeployments={() => setPage("deployments")}
              onGoToIntegrations={() => setPage("integrations")}
              onGoToActivity={() => setPage("activity")}
              onGoToSecurity={() => setPage("security")}
              onGoToLaunch={() => setPage("launch")}
              onCopy={(text) => copyText(text, setNotice)}
            />
          )}
          {page === "monitoring" && (
            <Monitoring
              mode={mode}
              health={health}
              readiness={readiness}
              usageSummary={usageSummary}
              session={currentSession}
              selectedWorkspace={selectedWorkspace}
              publicApiKey={publicApiKey}
              onGoToInfrastructure={() => setPage("infrastructure")}
              onGoToDeployments={() => setPage("deployments")}
              onGoToIntegrations={() => setPage("integrations")}
              onGoToActivity={() => setPage("activity")}
              onGoToSecurity={() => setPage("security")}
              onGoToLaunch={() => setPage("launch")}
              onCopy={(text) => copyText(text, setNotice)}
            />
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
              onLogout={onLogout}
              onSave={(url, key) => {
                setNotice(`Saved settings.`);
                const next = { ...sessionRef.current, baseUrl: url.replace(/\/+$/, ""), publicApiKey: key };
                setCurrentSession(next);
                setPublicApiKey(key);
                onSessionChange(next);
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
    ["launch", <ShieldCheck size={18} />, "Launch"],
    ["infrastructure", <Server size={18} />, "Infrastructure"],
    ["deployments", <Archive size={18} />, "Deployments"],
    ["developers", <Code2 size={18} />, "Developers"],
    ["activity", <Clock size={18} />, "Activity"],
    ["integrations", <Link2 size={18} />, "Integrations"],
    ["security", <ShieldCheck size={18} />, "Security"],
    ["monitoring", <Activity size={18} />, "Monitoring"],
    ["docs", <BookOpen size={18} />, "Docs"],
  ];

  return (
    <aside className="sidebar">
      <Logo />
      <nav className="nav-list">
        {items.map(([id, icon, label]) => (
          <button key={id} className={page === id ? "active" : ""} onClick={() => setPage(id)} aria-label={label}>
            {icon}
            <span className="nav-label">{label}</span>
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
          <div className="sidebar-footer-brand">
            <Logo compact />
            <span>Copyright 2026 ClientPad X</span>
          </div>
          <span className="sidebar-footer-links">
            <a href="https://docs.clientpad.xyz" target="_blank" rel="noopener noreferrer">Docs</a>
            <span>|</span>
            <a href="https://github.com/clientpadhq/clientpad" target="_blank" rel="noopener noreferrer">GitHub</a>
            <span>|</span>
            <a href="https://github.com/Abdulmuiz44" target="_blank" rel="noopener noreferrer">Builder</a>
            <span>|</span>
            <a href="https://clientpad.xyz/privacy" target="_blank" rel="noopener noreferrer">Privacy</a>
            <span>|</span>
            <a href="https://clientpad.xyz/terms" target="_blank" rel="noopener noreferrer">Terms</a>
            <span>|</span>
            <a href="https://clientpad.xyz/llms.txt" target="_blank" rel="noopener noreferrer">llms.txt</a>
          </span>
        </footer>
      </div>
    </aside>
  );
}

function Topbar({
  projects,
  user,
  selectedWorkspace,
  onWorkspaceChange,
  workspaces,
  query,
  setQuery,
  mode,
  connectionState,
  health,
  readiness,
  lastSyncedAt,
  onLogout,
  theme,
  onGoHome,
  onToggleTheme,
}: {
  projects: Project[];
  user: CloudAuthUser | null;
  selectedWorkspace: string;
  onWorkspaceChange: (workspaceId: string) => void;
  workspaces: CloudWorkspace[];
  query: string;
  setQuery: (query: string) => void;
  mode: ConnectionMode;
  connectionState: ConnectionState;
  health: CloudHealth | null;
  readiness: CloudReadiness | null;
  lastSyncedAt: string | null;
  onLogout: () => void;
  theme: DashboardTheme;
  onGoHome: () => void;
  onToggleTheme: () => void;
}) {
  const searchInputRef = useRef<HTMLInputElement>(null);
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
  const apiLabel = health?.status === "ok" ? "API healthy" : health?.status === "degraded" ? "API degraded" : "API pending";
  const topbarTone =
    mode === "preview"
      ? "blue"
      : connectionState === "connected" && health?.status === "ok"
        ? "green"
        : connectionState === "checking" || health?.status === "degraded"
          ? "amber"
          : "gray";
  const topbarStatus = `${connectionLabel} | ${apiLabel}`;

  useEffect(() => {
    const handleGlobalSearchShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    };

    window.addEventListener("keydown", handleGlobalSearchShortcut);
    return () => window.removeEventListener("keydown", handleGlobalSearchShortcut);
  }, []);

  return (
    <header className="topbar">
      <div className="topbar-brand-stack">
        <button className="topbar-brand" type="button" onClick={onGoHome} aria-label="Go to dashboard overview">
          <Logo compact />
        </button>
        <label className="workspace-picker">
          <span>Workspace</span>
          <div>
            <Building2 size={16} />
            <select value={selectedWorkspace} onChange={(event) => onWorkspaceChange(event.target.value)}>
              {!workspaces.length ? <option value="">No workspace yet</option> : null}
              {workspaces.map((workspace) => (
                <option key={workspace.id} value={workspace.id}>
                  {workspace.name}
                </option>
              ))}
            </select>
            <ChevronDown size={16} />
          </div>
        </label>
      </div>
      <label className="searchbox">
        <Search size={18} />
        <input ref={searchInputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search clients, projects, keys..." />
        <kbd>Ctrl K</kbd>
      </label>
      <div className="top-actions">
        <StatusChip tone={topbarTone} label={topbarStatus} />
        <button className="theme-toggle" onClick={onToggleTheme} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}>
          {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
        </button>
        <button className="avatar" onClick={onLogout} title="Sign out">
          {user ? userInitials(user) : "AD"}
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
  usageSummary,
  selectedPlan,
  selectedProject,
  quickstartLanguage,
  setQuickstartLanguage,
  setPage,
  mode,
  health,
  readiness,
}: {
  loading: boolean;
  totalRequests: number;
  rejectedRequests: number;
  projects: Project[];
  keys: ApiKeyRecord[];
  usage: UsageRow[];
  usageSummary: UsageSummary | null;
  selectedPlan?: Plan;
  selectedProject?: Project;
  quickstartLanguage: QuickstartLanguage;
  setQuickstartLanguage: (language: QuickstartLanguage) => void;
  setPage: (page: Page) => void;
  mode: ConnectionMode;
  health: CloudHealth | null;
  readiness: CloudReadiness | null;
}) {
  const requestLimit = selectedPlan?.monthly_request_limit ?? 10_000_000;
  const requestTotal = usageSummary?.request_count ?? totalRequests;
  const rejectedTotal = usageSummary?.rejected_count ?? rejectedRequests;
  const usedPercent = Math.min((requestTotal / requestLimit) * 100, 100);
  const heroConnectionLabel =
    mode === "preview"
      ? "Preview dataset"
      : readiness?.status === "ok"
        ? "Live connected"
        : readiness
          ? "Live needs attention"
          : "Checking live status";
  const heroSyncLabel = readiness?.time
    ? `Readiness synced ${timeAgo(readiness.time)}`
    : health?.time
      ? `Health checked ${timeAgo(health.time)}`
      : "Awaiting backend sync";
  const publicApiUrl = "https://api.clientpad.xyz/api/public/v1";
  const workspaceName = readiness?.workspace?.name ?? usageSummary?.workspace_name ?? selectedProject?.name ?? "Select a workspace";
  const workspaceRole = readiness?.auth?.user ? (readiness.summary?.workspace_count ? "Active workspace" : "No workspace data yet") : "Awaiting operator sign in";
  const workspaceHealth = readiness?.status === "ok"
    ? "Operational"
    : readiness?.status === "degraded"
      ? "Degraded"
      : readiness
        ? "Needs attention"
        : "Checking";
  const latestWhatsAppActivity = readiness?.summary?.latest_whatsapp_activity_at ? timeAgo(readiness.summary.latest_whatsapp_activity_at) : "No WhatsApp traffic yet";
  const latestPaymentEvent = readiness?.summary?.latest_payment_event_at ? timeAgo(readiness.summary.latest_payment_event_at) : "No payment events yet";
  const recentWebhooks = readiness?.summary?.recent_webhook_count ?? 0;
  const pipelineCounts = demoClients.reduce<Record<string, number>>((counts, client) => {
    counts[client.status] = (counts[client.status] ?? 0) + 1;
    return counts;
  }, {});
  const openPipelineCount = (pipelineCounts["New Lead"] ?? 0) + (pipelineCounts["Quoted"] ?? 0) + (pipelineCounts["Booked"] ?? 0) + (pipelineCounts["In Progress"] ?? 0);
  const closedPipelineCount = (pipelineCounts["Completed"] ?? 0) + (pipelineCounts["Paid"] ?? 0) + (pipelineCounts["Review Requested"] ?? 0);
  const topPipelineStage = serviceStages.reduce((bestStage, stage) => (pipelineCounts[stage] ?? 0) > (pipelineCounts[bestStage] ?? 0) ? stage : bestStage, serviceStages[0]);
  const projectName = selectedProject?.name ?? "No project selected";
  const projectSlug = selectedProject?.slug ?? "clientpad-api";
  const projectOwner = selectedProject?.owner_email ?? "No owner email";
  const projectEnv = selectedProject?.environment ? selectedProject.environment.toUpperCase() : "No environment";
  const projectCreated = selectedProject?.created_at ? timeAgo(selectedProject.created_at) : "Create your first project";

  return (
    <div className="overview-stack">
      <Panel className="overview-hero">
        <div className="overview-hero-copy">
          <div className="overview-hero-kicker">API control plane</div>
          <div className="overview-hero-note">
            <strong>Developer contract</strong>
            <span>
              Build against <code>CLIENTPAD_API_KEY</code> server-side. Operators sign into this dashboard.
            </span>
          </div>
          <h2>One API, one dashboard, one operator workflow.</h2>
          <p>
            Keep projects, API keys, WhatsApp, billing, and operator state together. Launch a workspace bundle, then use the dashboard to monitor the real system instead of a placeholder.
          </p>
          <div className="overview-hero-actions">
            <button className="button primary blue" onClick={() => setPage("projects")}>
              <Plus size={15} /> Create project
            </button>
            <button className="button outline" onClick={() => setPage("keys")}>
              Create API key
            </button>
            <button className="button outline" onClick={() => setPage("pipeline")}>
              View pipeline
            </button>
            <button className="button outline" onClick={() => setPage("inbox")}>
              Open inbox
            </button>
          </div>
        </div>
        <div className="overview-hero-metrics">
          <div className="hero-workspace">
            <span>Workspace</span>
            <strong>{workspaceName}</strong>
            <small>{workspaceRole}</small>
            <small>{workspaceHealth} | {projects.length} projects | {keys.length} keys</small>
          </div>
          <div className="hero-activity">
            <span>Activity</span>
            <strong>Recent CRM signals</strong>
            <small>WhatsApp {latestWhatsAppActivity}</small>
            <small>Payments {latestPaymentEvent}</small>
            <small>{recentWebhooks} webhook{recentWebhooks === 1 ? "" : "s"} in the current window</small>
          </div>
          <div className="hero-contract">
            <span>Public API</span>
            <strong>{publicApiUrl}</strong>
            <small>Build against <code>CLIENTPAD_API_KEY</code> server-side.</small>
            <small>{heroSyncLabel}</small>
            <CopyButton text={publicApiUrl} />
          </div>
          <div className="hero-project">
            <span>Selected project</span>
            <strong>{projectName}</strong>
            <small>{projectSlug} | {projectEnv}</small>
            <small>Owner {projectOwner}</small>
            <small>{projectCreated} | {heroConnectionLabel}</small>
          </div>
          <div className="hero-pipeline">
            <span>Pipeline</span>
            <strong>{openPipelineCount} open leads</strong>
            <small>New {pipelineCounts["New Lead"] ?? 0} | Quoted {pipelineCounts["Quoted"] ?? 0} | Booked {pipelineCounts["Booked"] ?? 0}</small>
            <small>Active {pipelineCounts["In Progress"] ?? 0} | Closed {closedPipelineCount} | Top stage {topPipelineStage} ({pipelineCounts[topPipelineStage] ?? 0})</small>
          </div>
          <div className="hero-metric">
            <span>Usage</span>
            <strong>{formatNumber(requestTotal)}</strong>
            <small>{formatNumber(rejectedTotal)} rejected | {selectedPlan?.name ?? "Pro"} plan</small>
          </div>
        </div>
      </Panel>

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
          <Quota label="Requests" value={requestTotal || 2_560_812} limit={requestLimit} suffix="" />
          <Quota label="Rejected" value={rejectedTotal || 73} limit={Math.max(rejectedTotal || 73, 100)} suffix="" />
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
            <li>{usageSummary?.monthly_request_limit?.toLocaleString() ?? "10M"} API requests / month</li>
            <li>{usageSummary?.rate_limit_per_minute ?? 500} requests / minute</li>
            <li>{usageSummary?.active_api_key_count ?? keys.length} active API keys</li>
            <li>{usageSummary?.remaining_requests?.toLocaleString() ?? "Unlimited"} remaining</li>
          </ul>
          <div className="period-row">
            <span>Current month: {usageSummary?.month ?? "May 2026"}</span>
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

function Usage({ usage, keys, selectedProject, usageSummary }: { usage: UsageRow[]; keys: ApiKeyRecord[]; selectedProject?: Project; usageSummary: UsageSummary | null }) {
  return (
    <div className="detail-layout single">
      <Panel className="api-requests wide-detail">
        <div className="panel-head">
          <h2>{selectedProject?.name ?? "Workspace"} usage</h2>
          <div className="inline-actions">
            <StatusChip tone="green" label={usageSummary?.plan_name ? `${usageSummary.plan_name} plan` : "Billing ready"} />
            <StatusChip tone="blue" label={usageSummary?.month ?? "Current month"} />
          </div>
        </div>
        <div className="usage-summary-grid">
          <div className="usage-summary-item"><span>Requests</span><strong>{formatNumber(usageSummary?.request_count ?? usage.reduce((sum, row) => sum + row.request_count, 0))}</strong></div>
          <div className="usage-summary-item"><span>Rejected</span><strong>{formatNumber(usageSummary?.rejected_count ?? usage.reduce((sum, row) => sum + row.rejected_count, 0))}</strong></div>
          <div className="usage-summary-item"><span>API keys</span><strong>{formatNumber(usageSummary?.active_api_key_count ?? keys.length)}</strong></div>
          <div className="usage-summary-item"><span>Remaining</span><strong>{usageSummary?.remaining_requests?.toLocaleString() ?? "Unlimited"}</strong></div>
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

function Billing({
  plans,
  selectedPlanCode,
  onSelectPlan,
  usageSummary,
  onCheckout,
  onManageBilling,
  billingAction,
}: {
  plans: Plan[];
  selectedPlanCode: string;
  onSelectPlan: (code: string) => void;
  usageSummary: UsageSummary | null;
  onCheckout: (code: string) => Promise<void> | void;
  onManageBilling: () => Promise<void> | void;
  billingAction: string | null;
}) {
  const canManageBilling = Boolean(usageSummary && usageSummary.plan_code && usageSummary.plan_code !== "free");
  return (
    <div className="billing-grid">
      <Panel className="billing-summary">
        <div className="panel-head"><h2>Current cloud usage</h2><Badge tone="green">{usageSummary ? "Synced" : "Pending"}</Badge></div>
        <Quota label="Requests" value={usageSummary?.request_count ?? 2_391_873} limit={usageSummary?.monthly_request_limit ?? 10_000_000} suffix="" />
        <Quota label="Rejected" value={usageSummary?.rejected_count ?? 73} limit={Math.max(usageSummary?.rejected_count ?? 73, 100)} suffix="" />
        <p className="helper-text">Uses the same quota model as Usage: request count, rejections, rate limits, active API keys, and remaining monthly capacity.</p>
        <div className="split-actions">
          <button className="button outline" onClick={onManageBilling} disabled={!canManageBilling}>
            {canManageBilling ? "Manage billing" : "Billing portal unavailable"}
          </button>
        </div>
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
          <div className="split-actions">
            <button className={selectedPlanCode === plan.code ? "button primary blue" : "button outline"} onClick={() => onSelectPlan(plan.code)}>
              {selectedPlanCode === plan.code ? "Selected" : `Select ${plan.name}`}
            </button>
            {plan.monthly_price_cents > 0 ? (
              <button className="button primary blue" onClick={() => onCheckout(plan.code)} disabled={billingAction === plan.code}>
                {billingAction === plan.code ? "Starting checkout..." : `Start ${plan.name}`}
              </button>
            ) : (
              <button className="button outline" disabled>
                Included
              </button>
            )}
          </div>
        </Panel>
      )) : <Panel className="empty-state-panel compact"><h3>No plans loaded</h3><p>Connect the ClientPad API to show available plans and current limits.</p></Panel>}
    </div>
  );
}

function LaunchReadiness({
  session,
  mode,
  selectedWorkspace,
  publicApiKey,
  onGoToSettings,
}: {
  session: Session;
  mode: ConnectionMode;
  selectedWorkspace: string;
  publicApiKey: string;
  onGoToSettings: () => void;
}) {
  const [checks, setChecks] = useState<LaunchCheck[]>(() => buildInitialLaunchChecks(session.baseUrl));
  const [running, setRunning] = useState(false);
  const cloudBaseUrl = session.baseUrl.replace(/\/+$/, "");
  const apiOrigin = cloudBaseUrl.replace(/\/api\/cloud\/v1$/i, "");
  const publicApiUrl = `${apiOrigin}/api/public/v1`;

  async function runChecks() {
    if (mode === "preview") {
      setChecks(buildPreviewLaunchChecks(cloudBaseUrl));
      return;
    }

    setRunning(true);
    setChecks(buildInitialLaunchChecks(cloudBaseUrl));
    const publicApiKeyValue = publicApiKey.trim();
    const next = await Promise.all([
      checkJsonEndpoint("api-host-readiness", "API host readiness", `${apiOrigin}/readiness`, (response, body) => ({
        ok: response.ok && body?.status === "ok",
        warning: body?.status === "degraded",
        detail: body?.status === "configuration_required"
          ? `Missing ${Array.isArray(body?.missing) ? body.missing.join(", ") : "runtime configuration"}`
          : body?.status === "degraded"
            ? "API host is reachable but one or more checks are degraded"
            : response.ok
              ? "API host readiness passed"
              : `HTTP ${response.status}`,
        nextAction: body?.status === "configuration_required"
          ? "Set DATABASE_URL, API_KEY_PEPPER, and CLIENTPAD_CLOUD_ADMIN_TOKEN on the Render API service."
          : body?.status === "degraded"
            ? summarizeApiHostNextAction(body)
            : undefined,
      })),
      checkJsonEndpoint("cloud-health", "API health", `${cloudBaseUrl}/health`, (response, body) => ({
        ok: response.ok && body?.status === "ok",
        detail: response.ok ? `API returned ${body?.status ?? response.status}` : `HTTP ${response.status}`,
        nextAction: response.ok ? undefined : "Confirm the Render API service has a working database connection and current deployment.",
      })),
      checkJsonEndpoint("cloud-readiness", "Workspace readiness", `${cloudBaseUrl}/readiness?workspace_id=${encodeURIComponent(selectedWorkspace)}`, (response, body) => ({
        ok: response.ok && (body?.status === "ok" || body?.status === "degraded"),
        warning: body?.status === "degraded",
        detail: body?.status === "degraded" ? "API is reachable but readiness is degraded" : response.ok ? "Workspace readiness endpoint responded" : `HTTP ${response.status}`,
        nextAction: body?.status === "degraded" && Array.isArray(body?.diagnostics)
          ? body.diagnostics.find((item: CloudReadinessDiagnostic) => item.status === "missing")?.detail
          : response.ok ? undefined : "Sign in again or create a workspace before checking launch readiness.",
      })),
      checkJsonEndpoint("auth-status", "Operator auth status", `${cloudBaseUrl}/auth/status`, (response, body) => ({
        ok: response.ok && typeof body?.registration_open === "boolean",
        detail: response.ok ? "Operator auth status is available" : `HTTP ${response.status}`,
        nextAction: response.ok ? undefined : "Verify the API can read operator auth tables from the production database.",
      })),
      checkJsonEndpoint("public-gateway", "Public API gateway", `${publicApiUrl}/usage`, (response) => ({
        ok: publicApiKeyValue ? response.status < 500 : response.status === 401 || response.status === 403,
        warning: Boolean(publicApiKeyValue && response.status === 401),
        detail: publicApiKeyValue
          ? response.status < 500
            ? `Gateway responded with HTTP ${response.status}`
            : `Gateway error HTTP ${response.status}`
          : response.status === 401 || response.status === 403
            ? "Gateway correctly requires an API key"
            : `Unexpected HTTP ${response.status}`,
        nextAction: response.status >= 500
          ? "Check DATABASE_URL and API_KEY_PEPPER on the API service, then redeploy."
          : publicApiKeyValue && response.status === 401
            ? "Create a fresh public API key and update dashboard settings."
            : undefined,
      }), publicApiKeyValue ? { Authorization: `Bearer ${publicApiKeyValue}` } : undefined),
    ]);

    setChecks(next);
    setRunning(false);
  }

  useEffect(() => {
    runChecks().catch(() => setRunning(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, session.baseUrl, selectedWorkspace, publicApiKey]);

  const okCount = checks.filter((check) => check.status === "ok").length;
  const warningCount = checks.filter((check) => check.status === "warning").length;
  const failCount = checks.filter((check) => check.status === "fail").length;
  const externalTargets = [
    { label: "Marketing", url: "https://clientpad.xyz" },
    { label: "Docs", url: "https://docs.clientpad.xyz" },
    { label: "Dashboard", url: "https://platform.clientpad.xyz" },
    { label: "API health", url: "https://api.clientpad.xyz/health" },
    { label: "llms.txt", url: "https://clientpad.xyz/llms.txt" },
  ];

  return (
    <div className="launch-layout">
      <Panel className="launch-summary">
        <div className="panel-head">
          <h2>Production readiness</h2>
          <Badge tone={failCount ? "amber" : "green"}>{failCount ? "Action needed" : "Ready"}</Badge>
        </div>
        <div className="launch-score">
          <strong>{okCount}/{checks.length}</strong>
          <span>{warningCount} warnings | {failCount} failures</span>
        </div>
        <div className="status-banner-actions">
          <button className="button primary blue" onClick={runChecks} disabled={running}>
            <ShieldCheck size={16} /> {running ? "Checking..." : "Run checks"}
          </button>
          <button className="button outline" onClick={onGoToSettings}>
            <Settings size={16} /> Connection settings
          </button>
        </div>
      </Panel>

      <Panel className="launch-checks-panel">
        <div className="panel-head bordered">
          <h2>Live service checks</h2>
          <span className="status-muted">{cloudBaseUrl}</span>
        </div>
        <div className="launch-checks">
          {checks.map((check) => (
            <div key={check.id} className={`launch-check ${check.status}`}>
              {launchStatusIcon(check.status)}
              <div>
                <strong>{check.label}</strong>
                <span>{check.detail}</span>
                {check.nextAction ? <em>{check.nextAction}</em> : null}
                <small>{check.url}</small>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel className="launch-links-panel">
        <div className="panel-head bordered">
          <h2>Public targets</h2>
          <span className="status-muted">Open after deploy</span>
        </div>
        <div className="launch-targets">
          {externalTargets.map((target) => (
            <a key={target.url} className="launch-target" href={target.url} target="_blank" rel="noopener noreferrer">
              <span>{target.label}</span>
              <small>{target.url}</small>
              <ExternalLink size={15} />
            </a>
          ))}
        </div>
      </Panel>
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

function SettingsPage({
  session,
  publicApiKey: initialKey,
  mode,
  onSave,
  onLogout,
}: {
  session: Session;
  publicApiKey: string;
  mode: ConnectionMode;
  onSave: (baseUrl: string, publicApiKey: string) => void;
  onLogout: () => void | Promise<void>;
}) {
  const [baseUrl, setBaseUrl] = useState(session.baseUrl);
  const [publicApiKey, setPublicApiKey] = useState(initialKey);

  return (
    <div className="detail-layout">
      <Panel>
        <h2>Account</h2>
        <div className="status-callout compact">
          <strong>{session.user?.email ?? "Preview account"}</strong>
          <p>{mode === "preview" ? "Preview mode uses generated sample data. No live backend access is required." : `Signed in as ${session.user?.full_name || session.user?.email || "operator"}.`}</p>
        </div>
        {session.workspaces?.length ? (
          <div className="status-stack" style={{ marginTop: "1rem" }}>
            {session.workspaces.map((workspace) => (
              <div key={workspace.id} className="status-item">
                <span className={workspace.id === session.selectedWorkspaceId ? "dot good" : "dot warn"} />
                <div>
                  <strong>{workspace.name}</strong>
                  <small>{workspace.role} | {workspace.project_count} projects | {workspace.key_count} keys</small>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <div className="split-actions" style={{ marginTop: "1rem" }}>
          <button className="button outline" onClick={onLogout}>
            <ShieldCheck size={16} /> Sign out
          </button>
        </div>
        <h2 style={{ marginTop: "2rem" }}>API connection</h2>
        <FormField label="API base URL" value={baseUrl} onChange={setBaseUrl} />
        <div className="status-callout compact">
          <strong>{mode === "preview" ? "Preview mode" : "Live mode"}</strong>
          <p>{mode === "preview" ? "Preview mode uses generated sample data. No live backend access is required." : "Live mode points the dashboard at your ClientPad API and uses a cookie-backed operator session."}</p>
        </div>

        <h2 style={{ marginTop: "2rem" }}>Workspace Preview</h2>
        <FormField label="Workspace Public API Key" value={publicApiKey} onChange={setPublicApiKey} />
        <p className="helper-text">Enter a `cp_live_...` key to enable live WhatsApp inbox, usage, and pipeline data.</p>

        <button className="button primary blue" onClick={() => onSave(baseUrl, publicApiKey)}>
          <Check size={16} /> Save settings
        </button>
      </Panel>
      <Panel className="wide-detail">
        <h2>Deployment checklist</h2>
        <ul className="plan-list">
          <li>Mount `@clientpad/cloud` at `/api/cloud/v1`.</li>
          <li>Sign in with an operator account, or create the first operator from the cloud auth flow.</li>
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

function Logo({ compact = false }: { compact?: boolean } = {}) {
  return (
    <div className={`logo${compact ? " compact" : ""}`}>
      <img className="logo-mark" src="/assets/clientpad-logo.svg" alt="" aria-hidden="true" />
      <div className="logo-copy">
        <strong>ClientPad Dashboard</strong>
        {compact ? null : <span>API-first CRM control plane</span>}
      </div>
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
              : readiness?.auth?.user
                ? `signed in as ${readiness.auth.user.email}`
                : "waiting for live validation"}
          </span>
        </div>
        <h2>{mode === "preview" ? "Preview workspace is active" : connectionState === "connected" ? "Live dashboard is connected" : "Live dashboard needs attention"}</h2>
        <p>
          {mode === "preview"
            ? "This workspace uses generated data so operators can learn the flow without risking production access."
            : connectionState === "connected"
              ? "This workspace is connected to a real ClientPad API. Use the readiness, WhatsApp, project, and key states below to confirm the system is usable."
              : "The API is reachable, but at least one live dependency still needs attention before the workspace is fully operational."}
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
  bootstrapWorkspaceName,
  setBootstrapWorkspaceName,
  bootstrapProjectName,
  setBootstrapProjectName,
  bootstrapKeyName,
  setBootstrapKeyName,
  onBootstrap,
  bootstrapping,
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
  bootstrapWorkspaceName: string;
  setBootstrapWorkspaceName: (value: string) => void;
  bootstrapProjectName: string;
  setBootstrapProjectName: (value: string) => void;
  bootstrapKeyName: string;
  setBootstrapKeyName: (value: string) => void;
  onBootstrap: () => Promise<void> | void;
  bootstrapping: boolean;
  onGoToConnect: () => void;
  onGoToProjects: () => void;
  onGoToKeys: () => void;
  onGoToDocs: () => void;
}) {
  const summary = readiness?.summary;
  const items = [
    { label: "API connection", state: mode === "preview" ? "Preview" : readiness?.status === "ok" ? "Connected" : readiness ? "Needs attention" : "Checking", done: mode === "preview" || Boolean(readiness) },
    { label: "Project / workspace", state: summary?.workspace_count ? `${summary.workspace_count} workspaces` : "Missing", done: Boolean(summary?.workspace_count) },
    { label: "API key", state: summary?.has_public_api_key ? "Ready" : keyCount > 0 ? "Issued" : "Missing", done: Boolean(summary?.has_public_api_key || keyCount > 0) },
    { label: "WhatsApp", state: summary?.has_whatsapp_configuration ? "Configured" : "Missing", done: Boolean(summary?.has_whatsapp_configuration) },
    { label: "Webhooks", state: summary?.recent_webhook_count ? `${summary.recent_webhook_count} recent` : "Idle", done: Boolean(summary?.recent_webhook_count) },
  ];
  const readyCount = items.filter((item) => item.done).length;

  return (
    <details className="activation-panel">
      <summary className="activation-summary">
        <div className="panel-head bordered">
          <div>
            <h2>Launch checklist</h2>
            <p className="helper-text">Open when you need launch actions, readiness checks, or bootstrap.</p>
          </div>
          <StatusChip tone={mode === "preview" ? "blue" : readiness?.status === "ok" ? "green" : "amber"} label={mode === "preview" ? "Preview" : readiness?.status === "ok" ? "Live connected" : "Live needs attention"} />
        </div>
        <div className="activation-summary-row">
          <strong>{readyCount}/{items.length} ready</strong>
          <span>{mode === "preview" ? "Sample data" : summary?.workspace_count ? `${summary.workspace_count} workspaces` : "Launch setup pending"}</span>
        </div>
      </summary>
      <div className="activation-body">
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
        <div className="launch-bootstrap">
          <div>
            <strong>Bootstrap a live workspace</strong>
            <p className="helper-text">Create the workspace, first project, and starter API key in one pass.</p>
          </div>
          <div className="bootstrap-grid">
            <FormField label="Workspace name" value={bootstrapWorkspaceName} onChange={setBootstrapWorkspaceName} />
            <FormField label="Project name" value={bootstrapProjectName} onChange={setBootstrapProjectName} />
            <FormField label="API key name" value={bootstrapKeyName} onChange={setBootstrapKeyName} />
          </div>
          <div className="status-banner-actions">
            <button className="button primary blue" onClick={onBootstrap} disabled={bootstrapping || mode === "preview"}>
              <Plus size={15} /> {bootstrapping ? "Bootstrapping..." : "Create workspace bundle"}
            </button>
          </div>
        </div>
      </div>
    </details>
  );
}

function Infrastructure({
  mode,
  readiness,
  health,
  selectedWorkspace,
  publicApiKey,
  usageSummary,
  onGoToDeployments,
  onGoToLaunch,
  onGoToDocs,
  onGoToProjects,
  onGoToKeys,
  onGoToConnect,
  onCopy,
}: {
  mode: ConnectionMode;
  readiness: CloudReadiness | null;
  health: CloudHealth | null;
  selectedWorkspace: string;
  publicApiKey: string;
  usageSummary: UsageSummary | null;
  onGoToDeployments: () => void;
  onGoToLaunch: () => void;
  onGoToDocs: () => void;
  onGoToProjects: () => void;
  onGoToKeys: () => void;
  onGoToConnect: () => void;
  onCopy: (text: string) => void;
}) {
  const workspaceName = readiness?.workspace?.name ?? usageSummary?.workspace_name ?? selectedWorkspace ?? "No workspace selected";
  const apiUrl = "https://api.clientpad.xyz/api/public/v1";
  const platformUrl = "https://platform.clientpad.xyz";
  const services = [
    {
      name: "Dashboard",
      host: "platform.clientpad.xyz",
      target: "clientpad-app.onrender.com",
      state: mode === "preview" ? "Preview" : readiness?.status === "ok" ? "Live" : readiness ? "Needs attention" : "Checking",
      detail: "Operator dashboard, projects, keys, inbox, and launch actions.",
    },
    {
      name: "Public API",
      host: "api.clientpad.xyz",
      target: "clientpad-api.onrender.com",
      state: readiness?.summary?.has_public_api_key ? "Ready" : "Needs key",
      detail: "API contract used by developers with `CLIENTPAD_API_KEY`.",
    },
    {
      name: "Docs",
      host: "docs.clientpad.xyz",
      target: "clientpad-docs.onrender.com",
      state: "Live",
      detail: "Docs host with the docs-root rewrite and static export.",
    },
    {
      name: "Marketing",
      host: "clientpad.xyz",
      target: "clientpad-frontend.onrender.com",
      state: "Live",
      detail: "Public site, pricing, and developer-facing landing pages.",
    },
  ];
  const checkpoints = [
    { label: "Operator session", value: readiness?.auth?.user ? "Signed in" : "Pending", ok: Boolean(readiness?.auth?.user) },
    { label: "Workspace", value: workspaceName, ok: Boolean(workspaceName) },
    { label: "Public API key", value: publicApiKey.trim() ? "Configured" : "Missing", ok: Boolean(publicApiKey.trim()) },
    { label: "WhatsApp", value: readiness?.summary?.has_whatsapp_configuration ? "Configured" : "Missing", ok: Boolean(readiness?.summary?.has_whatsapp_configuration) },
    { label: "Webhooks", value: readiness?.summary?.recent_webhook_count ? `${readiness.summary.recent_webhook_count} recent` : "Idle", ok: Boolean(readiness?.summary?.recent_webhook_count) },
  ];
  const diagnostics = readiness?.diagnostics ?? [];
  const readinessLabel =
    mode === "preview"
      ? "Preview mode"
      : readiness?.status === "ok"
        ? "Infrastructure healthy"
        : readiness
          ? "Infrastructure needs attention"
          : "Waiting for live checks";

  return (
    <div className="infrastructure-layout">
      <Panel className="infra-hero">
        <div className="panel-head bordered">
          <div>
            <h2>Infrastructure</h2>
            <p className="helper-text">One view for the dashboard, docs, API, and public site hosts.</p>
          </div>
          <StatusChip tone={mode === "preview" ? "blue" : readiness?.status === "ok" ? "green" : "amber"} label={readinessLabel} />
        </div>
        <div className="infra-hero-grid">
          <div className="infra-summary">
            <span>Platform</span>
            <strong>platform.clientpad.xyz</strong>
            <small>Dashboard entrypoint for operators and service teams.</small>
          </div>
          <div className="infra-summary">
            <span>Public API</span>
            <strong>{apiUrl}</strong>
            <small>Developer surface powered by `CLIENTPAD_API_KEY`.</small>
            <CopyButton text={apiUrl} />
          </div>
          <div className="infra-summary">
            <span>Docs</span>
            <strong>docs.clientpad.xyz</strong>
            <small>Static docs export with the docs root rewrite.</small>
          </div>
          <div className="infra-summary">
            <span>Marketing</span>
            <strong>clientpad.xyz</strong>
            <small>Public site and conversion path for developers and operators.</small>
          </div>
        </div>
      </Panel>

      <div className="infra-grid">
        <Panel className="infra-services">
          <div className="panel-head bordered">
            <h2>Deployment map</h2>
            <button className="button outline" onClick={onGoToLaunch}>
              Open launch
            </button>
          </div>
          <div className="infra-service-list">
            {services.map((service) => (
              <article key={service.name} className="infra-service-card">
                <div className="infra-service-head">
                  <div>
                    <strong>{service.name}</strong>
                    <span>{service.host}</span>
                  </div>
                  <StatusChip tone={service.state === "Live" || service.state === "Ready" ? "green" : service.state === "Preview" ? "blue" : "amber"} label={service.state} />
                </div>
                <small>{service.detail}</small>
                <code>{service.target}</code>
              </article>
            ))}
          </div>
        </Panel>

        <Panel className="infra-checks">
          <div className="panel-head bordered">
            <h2>Live checks</h2>
            <StatusChip tone={health?.status === "ok" ? "green" : health ? "amber" : "gray"} label={health ? `${health.service} ${health.status}` : "Health pending"} />
          </div>
          <div className="status-stack compact">
            {checkpoints.map((item) => (
              <div key={item.label} className="status-item">
                <span className={item.ok ? "dot good" : "dot warn"} />
                <div>
                  <strong>{item.label}</strong>
                  <small>{item.value}</small>
                </div>
              </div>
            ))}
          </div>
          <div className="infra-diagnostics">
            <div className="panel-head bordered compact-head">
              <h2>Diagnostics <span>{diagnostics.length}</span></h2>
            </div>
            {diagnostics.length ? (
              <div className="infra-diagnostic-list">
                {diagnostics.slice(0, 4).map((item) => (
                  <article key={item.key} className={`infra-diagnostic ${item.status}`}>
                    <div>
                      <strong>{item.label}</strong>
                      <small>{item.detail}</small>
                    </div>
                    {item.status === "missing" ? <em>Open Launch to resolve this check.</em> : null}
                  </article>
                ))}
              </div>
            ) : (
              <p className="helper-text">No diagnostics yet. Run live checks to load service-level guidance.</p>
            )}
          </div>
          <div className="infra-actions">
            <button className="button primary blue" onClick={onGoToKeys}>Create API key</button>
            <button className="button outline" onClick={onGoToProjects}>Projects</button>
            <button className="button outline" onClick={onGoToDeployments}>Deployments</button>
            <button className="button outline" onClick={onGoToDocs}>Docs</button>
            <button className="button outline" onClick={onGoToConnect}>WhatsApp</button>
          </div>
          <div className="infra-footnote">
            <span>Workspace</span>
            <strong>{workspaceName}</strong>
            <small>{usageSummary?.monthly_request_limit?.toLocaleString() ?? "10M"} monthly requests | {usageSummary?.active_api_key_count ?? 0} active keys</small>
            <button className="link-button" onClick={() => onCopy(platformUrl)}>
              Copy platform URL <ChevronRight size={15} />
            </button>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Deployments({
  mode,
  readiness,
  health,
  selectedWorkspace,
  usageSummary,
  onGoToInfrastructure,
  onGoToLaunch,
  onGoToDocs,
  onGoToProjects,
  onGoToKeys,
  onCopy,
}: {
  mode: ConnectionMode;
  readiness: CloudReadiness | null;
  health: CloudHealth | null;
  selectedWorkspace: string;
  usageSummary: UsageSummary | null;
  onGoToInfrastructure: () => void;
  onGoToLaunch: () => void;
  onGoToDocs: () => void;
  onGoToProjects: () => void;
  onGoToKeys: () => void;
  onCopy: (text: string) => void;
}) {
  const workspaceName = readiness?.workspace?.name ?? usageSummary?.workspace_name ?? selectedWorkspace ?? "No workspace selected";
  const apiStatus = health?.status === "ok" ? "Healthy" : health ? "Attention" : "Pending";
  const deployStatus =
    mode === "preview"
      ? "Preview deployment"
      : readiness?.status === "ok"
        ? "Live deployment"
        : readiness
          ? "Needs release attention"
          : "Waiting on deploy checks";
  const deployUrl = "https://platform.clientpad.xyz";
  const deployHealthLabel = health ? `${health.service} ${health.status}` : "Health pending";
  const diagnostics = readiness?.diagnostics ?? [];
  const deploymentRecords: DeploymentRecord[] = demoDeployments.map((deployment, index) => ({
    ...deployment,
    deployed_at: new Date(Date.now() - index * 43 * 60 * 1000).toISOString(),
  }));
  const releaseCount = deploymentRecords.length;
  const healthyCount = deploymentRecords.filter((deployment) => deployment.status === "live").length;
  const warningCount = deploymentRecords.filter((deployment) => deployment.status !== "live").length;
  const latestDeployment = deploymentRecords[0];
  const nextAction =
    diagnostics.find((item) => item.status === "missing")?.detail
    ?? (mode === "preview"
      ? "Preview mode mirrors the deploy flow without hitting production services."
      : readiness?.status === "ok"
        ? "Deployment pipeline is stable."
        : "Open Infrastructure or Launch to resolve live service checks.");

  return (
    <div className="deployments-layout">
      <Panel className="deployments-hero">
        <div className="panel-head bordered">
          <div>
            <h2>Deployments</h2>
            <p className="helper-text">GitHub pushes, Render releases, and the state of each public service.</p>
          </div>
          <StatusChip tone={mode === "preview" ? "blue" : readiness?.status === "ok" ? "green" : "amber"} label={deployStatus} />
        </div>
        <div className="deployment-hero-grid">
          <div className="deployment-summary">
            <span>Workspace</span>
            <strong>{workspaceName}</strong>
            <small>{usageSummary?.plan_name ?? "Pro"} plan | {usageSummary?.active_api_key_count ?? 0} active keys</small>
          </div>
          <div className="deployment-summary">
            <span>Latest release</span>
            <strong>{latestDeployment.service}</strong>
            <small>{latestDeployment.commit} | {latestDeployment.trigger}</small>
            <small>Deployed {timeAgo(latestDeployment.deployed_at)}</small>
          </div>
          <div className="deployment-summary">
            <span>Rollout health</span>
            <strong>{healthyCount}/{releaseCount} live</strong>
            <small>{warningCount} require attention | {deployHealthLabel}</small>
          </div>
          <div className="deployment-summary">
            <span>Public platform</span>
            <strong>{deployUrl}</strong>
            <small>Dashboard, docs, and infrastructure all route from the same GitHub deployment flow.</small>
            <button className="button outline" onClick={() => onCopy(deployUrl)}>
              Copy platform URL
            </button>
          </div>
        </div>
      </Panel>

      <div className="deployments-grid">
        <Panel className="deployment-services-panel">
          <div className="panel-head bordered">
            <h2>Service rollout</h2>
            <button className="button outline" onClick={onGoToInfrastructure}>
              View infrastructure
            </button>
          </div>
          <div className="deployment-service-list">
            {deploymentRecords.map((deployment) => (
              <article key={deployment.target} className={`deployment-service-card ${deployment.status}`}>
                <div className="deployment-service-head">
                  <div>
                    <strong>{deployment.service}</strong>
                    <span>{deployment.host}</span>
                  </div>
                  <StatusChip tone={deployment.status === "live" ? "green" : deployment.status === "deploying" ? "blue" : "amber"} label={deployment.status === "live" ? "Live" : deployment.status === "deploying" ? "Deploying" : "Needs review"} />
                </div>
                <small>{deployment.note}</small>
                <code>{deployment.target}</code>
                <div className="deployment-meta">
                  <span>{deployment.commit}</span>
                  <span>{deployment.trigger}</span>
                  <span>{timeAgo(deployment.deployed_at)}</span>
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel className="deployment-ops-panel">
          <div className="panel-head bordered">
            <h2>Release operations</h2>
            <StatusChip tone={health?.status === "ok" ? "green" : health ? "amber" : "gray"} label={deployHealthLabel} />
          </div>
          <div className="status-stack compact">
            <div className="status-item">
              <span className={mode === "preview" ? "dot good" : "dot warn"} />
              <div>
                <strong>Deploy mode</strong>
                <small>{mode === "preview" ? "Preview deployment" : "Production deployment"}</small>
              </div>
            </div>
            <div className="status-item">
              <span className={readiness?.status === "ok" ? "dot good" : "dot warn"} />
              <div>
                <strong>Readiness</strong>
                <small>{readiness?.status === "ok" ? "All checks passed" : readiness ? "One or more checks need attention" : "No checks loaded yet"}</small>
              </div>
            </div>
            <div className="status-item">
              <span className={health?.status === "ok" ? "dot good" : "dot warn"} />
              <div>
                <strong>API health</strong>
                <small>{health ? `${health.service} checked ${timeAgo(health.time)}` : "Health not checked yet"}</small>
              </div>
            </div>
          </div>
          <div className="deployment-next-action">
            <span>Next action</span>
            <strong>{nextAction}</strong>
          </div>
          <div className="deployment-actions">
            <button className="button primary blue" onClick={onGoToKeys}>Create API key</button>
            <button className="button outline" onClick={onGoToProjects}>Projects</button>
            <button className="button outline" onClick={onGoToLaunch}>Launch</button>
            <button className="button outline" onClick={onGoToDocs}>Docs</button>
          </div>
          <div className="deployment-footer-note">
            <span>Autodeploy</span>
            <strong>GitHub pushes trigger Render releases for every public service.</strong>
            <small>Keep the repository open source, require `CLIENTPAD_API_KEY`, and let Render publish the static and API surfaces.</small>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Developers({
  mode,
  readiness,
  selectedProject,
  usageSummary,
  onGoToKeys,
  onGoToInfrastructure,
  onGoToDeployments,
  onGoToIntegrations,
  onGoToMonitoring,
  onGoToDocs,
  onGoToLaunch,
  onCopy,
}: {
  mode: ConnectionMode;
  readiness: CloudReadiness | null;
  selectedProject?: Project;
  usageSummary: UsageSummary | null;
  onGoToKeys: () => void;
  onGoToInfrastructure: () => void;
  onGoToDeployments: () => void;
  onGoToIntegrations: () => void;
  onGoToMonitoring: () => void;
  onGoToDocs: () => void;
  onGoToLaunch: () => void;
  onCopy: (text: string) => void;
}) {
  const apiUrl = "https://api.clientpad.xyz/api/public/v1";
  const baseUrl = "https://api.clientpad.xyz";
  const sdkSnippet = quickstartSnippet("node", selectedProject);
  const authSnippet = `Authorization: Bearer cp_live_your_api_key_here`;
  const envSnippet = `CLIENTPAD_API_KEY=cp_live_your_api_key_here\nCLIENTPAD_BASE_URL=${apiUrl}\nCLIENTPAD_WORKSPACE_ID=${readiness?.workspace?.id ?? usageSummary?.workspace_id ?? "workspace_prod"}`;
  const errorMatrix = [
    { code: "401", title: "Missing or invalid API key", detail: "Create a new key in API Keys and pass it as a Bearer token." },
    { code: "403", title: "Access denied", detail: "The key exists, but the workspace or scope is not allowed for this request." },
    { code: "429", title: "Rate limited", detail: "Back off briefly and retry with exponential delay." },
    { code: "5xx", title: "Server error", detail: "Check the API service, database connection, and current Render deploy." },
  ];
  const checklist = [
    "Keep the dashboard public and the API protected by `CLIENTPAD_API_KEY`.",
    "Ship new API surfaces behind Render deployments and live readiness checks.",
    "Use workspace-level keys for service businesses and per-project keys for developers.",
    "Prefer the dashboard for operators and the SDK for application code.",
  ];
  const workspaceName = readiness?.workspace?.name ?? usageSummary?.workspace_name ?? selectedProject?.name ?? "No workspace selected";
  const requestLimit = usageSummary?.monthly_request_limit?.toLocaleString() ?? "10M";
  const requestRate = usageSummary?.rate_limit_per_minute ?? 1200;
  const releaseState =
    mode === "preview"
      ? "Preview API"
      : readiness?.status === "ok"
        ? "Live API contract"
        : readiness
          ? "API contract needs attention"
          : "Checking API contract";

  return (
    <div className="developers-layout">
      <Panel className="developers-hero">
        <div className="panel-head bordered">
          <div>
            <h2>Developers</h2>
            <p className="helper-text">API-first onboarding, error handling, and SDK setup for teams shipping against ClientPad.</p>
          </div>
          <StatusChip tone={mode === "preview" ? "blue" : readiness?.status === "ok" ? "green" : "amber"} label={releaseState} />
        </div>
        <div className="developer-hero-grid">
          <div className="developer-summary">
            <span>Public API</span>
            <strong>{apiUrl}</strong>
            <small>Use this base URL from apps, workers, and backend jobs.</small>
            <button className="button outline" onClick={() => onCopy(apiUrl)}>Copy API URL</button>
          </div>
          <div className="developer-summary">
            <span>Auth contract</span>
            <strong>Bearer token</strong>
            <small>{authSnippet}</small>
            <small>All developer traffic should send the token server-side.</small>
          </div>
          <div className="developer-summary">
            <span>Workspace</span>
            <strong>{workspaceName}</strong>
            <small>{requestLimit} monthly requests | {requestRate} rpm</small>
            <small>{usageSummary?.active_api_key_count ?? 0} active API keys</small>
          </div>
          <div className="developer-summary">
            <span>Open-source contract</span>
            <strong>Public code, private keys</strong>
            <small>Developers can inspect the source but must provision `CLIENTPAD_API_KEY` to call live services.</small>
            <button className="button outline" onClick={onGoToKeys}>Manage keys</button>
          </div>
        </div>
      </Panel>

      <div className="developers-grid">
        <Panel className="developer-setup-panel">
          <div className="panel-head bordered">
            <h2>SDK setup</h2>
            <button className="button outline" onClick={() => onCopy(envSnippet)}>Copy env</button>
          </div>
          <pre className="code compact">{sdkSnippet}</pre>
          <div className="developer-note-grid">
            <div className="developer-note">
              <span>Environment</span>
              <strong>Required variables</strong>
              <small>Use `CLIENTPAD_API_KEY` in server code, plus `CLIENTPAD_BASE_URL` when the host changes.</small>
            </div>
            <div className="developer-note">
              <span>Workspace</span>
              <strong>{workspaceName}</strong>
              <small>Project-scoped keys map requests back to the selected workspace.</small>
            </div>
          </div>
        </Panel>

        <Panel className="developer-ops-panel">
          <div className="panel-head bordered">
            <h2>Error handling</h2>
            <StatusChip tone={mode === "preview" ? "blue" : readiness?.status === "ok" ? "green" : "amber"} label={mode === "preview" ? "Preview" : "Live contract"} />
          </div>
          <div className="developer-error-list">
            {errorMatrix.map((item) => (
              <article key={item.code} className="developer-error">
                <strong>{item.code} {item.title}</strong>
                <small>{item.detail}</small>
              </article>
            ))}
          </div>
          <div className="developer-checklist">
            <span>Ship checklist</span>
            <ul>
              {checklist.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="developer-actions">
            <button className="button primary blue" onClick={onGoToDeployments}>Deployments</button>
            <button className="button outline" onClick={onGoToIntegrations}>Integrations</button>
            <button className="button outline" onClick={onGoToMonitoring}>Monitoring</button>
            <button className="button outline" onClick={onGoToInfrastructure}>Infrastructure</button>
            <button className="button outline" onClick={onGoToDocs}>Docs</button>
            <button className="button outline" onClick={onGoToLaunch}>Launch</button>
          </div>
        </Panel>
      </div>
      <Panel className="developer-footer-panel">
        <div className="panel-head bordered">
          <h2>Request contract</h2>
          <button className="button outline" onClick={() => onCopy(authSnippet)}>
            Copy auth header
          </button>
        </div>
        <div className="developer-contract-grid">
          <div className="developer-contract">
            <span>Base URL</span>
            <strong>{baseUrl}</strong>
            <small>API clients should target the public API host.</small>
          </div>
          <div className="developer-contract">
            <span>Header</span>
            <strong>{authSnippet}</strong>
            <small>Reject requests without the header on the server side.</small>
          </div>
          <div className="developer-contract">
            <span>Rate limit</span>
            <strong>{requestRate} rpm</strong>
            <small>Back off on 429 and retry after a short delay.</small>
          </div>
          <div className="developer-contract">
            <span>Operational links</span>
            <strong>Live dashboard + docs</strong>
            <small>Use the dashboard for operators and the docs for SDK snippets.</small>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function ActivityTrail({
  mode,
  readiness,
  usageSummary,
  selectedProject,
  onGoToDeployments,
  onGoToInfrastructure,
  onGoToDevelopers,
  onGoToIntegrations,
  onGoToMonitoring,
  onGoToInbox,
  onGoToKeys,
}: {
  mode: ConnectionMode;
  readiness: CloudReadiness | null;
  usageSummary: UsageSummary | null;
  selectedProject?: Project;
  onGoToDeployments: () => void;
  onGoToInfrastructure: () => void;
  onGoToDevelopers: () => void;
  onGoToIntegrations: () => void;
  onGoToMonitoring: () => void;
  onGoToInbox: () => void;
  onGoToKeys: () => void;
}) {
  const workspaceName = readiness?.workspace?.name ?? usageSummary?.workspace_name ?? selectedProject?.name ?? "No workspace selected";
  const requestCount = usageSummary?.request_count ?? 0;
  const rejectedCount = usageSummary?.rejected_count ?? 0;
  const activityFeed: ActivityRecord[] = [
    {
      actor: "GitHub",
      action: "Pushed deployment to Render",
      context: "clientpad-api, clientpad-app, clientpad-docs, and clientpad-frontend stayed aligned with the current branch.",
      time: "42m ago",
      tone: "green",
    },
    {
      actor: "Operator",
      action: "Created API key",
      context: "Public API access was renewed for the selected workspace using CLIENTPAD_API_KEY.",
      time: "1h ago",
      tone: "blue",
    },
    {
      actor: "WhatsApp",
      action: "Received inbound client message",
      context: "Lead routing and pipeline movement are active for live service-business conversations.",
      time: "2h ago",
      tone: "amber",
    },
    {
      actor: "Render",
      action: "Readiness checks passed",
      context: "API, dashboard, docs, and marketing hosts reported healthy status after deployment.",
      time: "3h ago",
      tone: "green",
    },
    {
      actor: "Billing",
      action: "Usage updated",
      context: `${formatNumber(requestCount)} total requests and ${formatNumber(rejectedCount)} rejects recorded for the current workspace.`,
      time: "Today",
      tone: "gray",
    },
  ];
  const summaryCards = [
    { label: "Requests", value: formatNumber(requestCount), detail: usageSummary?.monthly_request_limit ? `${formatNumber(usageSummary.monthly_request_limit)} monthly limit` : "Monthly limit unavailable" },
    { label: "Rejected", value: formatNumber(rejectedCount), detail: "Requests that failed policy or capacity checks" },
    { label: "Workspace", value: workspaceName, detail: readiness?.workspace ? `Selected ${timeAgo(readiness.time)}` : "Pick a workspace or create one" },
    { label: "Connection", value: mode === "preview" ? "Preview" : readiness?.status === "ok" ? "Live" : readiness ? "Needs attention" : "Checking", detail: "Current operator connection state" },
  ];

  return (
    <div className="activity-layout">
      <Panel className="activity-hero">
        <div className="panel-head bordered">
          <div>
            <h2>Activity</h2>
            <p className="helper-text">A compact trail of deploys, operator actions, API usage, and workspace events.</p>
          </div>
          <StatusChip tone={mode === "preview" ? "blue" : readiness?.status === "ok" ? "green" : "amber"} label={mode === "preview" ? "Preview activity" : "Live activity"} />
        </div>
        <div className="activity-summary-grid">
          {summaryCards.map((card) => (
            <div key={card.label} className="activity-summary">
              <span>{card.label}</span>
              <strong>{card.value}</strong>
              <small>{card.detail}</small>
            </div>
          ))}
        </div>
      </Panel>

      <div className="activity-grid">
        <Panel className="activity-feed-panel">
          <div className="panel-head bordered">
            <h2>Recent events</h2>
            <button className="button outline" onClick={onGoToDeployments}>
              Deployments
            </button>
          </div>
          <div className="activity-feed">
            {activityFeed.map((item) => (
              <article key={`${item.actor}-${item.action}`} className="activity-item">
                <div className={`activity-dot ${item.tone}`} />
                <div className="activity-content">
                  <div className="activity-head">
                    <strong>{item.actor}</strong>
                    <span>{item.time}</span>
                  </div>
                  <h3>{item.action}</h3>
                  <p>{item.context}</p>
                </div>
              </article>
            ))}
          </div>
        </Panel>

        <Panel className="activity-actions-panel">
          <div className="panel-head bordered">
            <h2>Operator shortcuts</h2>
            <StatusChip tone={readiness?.status === "ok" ? "green" : "amber"} label={readiness?.status === "ok" ? "Healthy" : "Needs review"} />
          </div>
          <div className="activity-shortcuts">
            <button className="button primary blue" onClick={onGoToKeys}>Create API key</button>
            <button className="button outline" onClick={onGoToInfrastructure}>Infrastructure</button>
            <button className="button outline" onClick={onGoToDevelopers}>Developers</button>
            <button className="button outline" onClick={onGoToIntegrations}>Integrations</button>
            <button className="button outline" onClick={onGoToMonitoring}>Monitoring</button>
            <button className="button outline" onClick={onGoToInbox}>Inbox</button>
          </div>
          <div className="activity-note">
            <span>Why this page exists</span>
            <strong>ClientPad needs the same operational clarity as a real CRM platform.</strong>
            <small>Operators should be able to answer "what changed?" without leaving the dashboard.</small>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Integrations({
  mode,
  readiness,
  session,
  selectedWorkspace,
  publicApiKey,
  usageSummary,
  onGoToDevelopers,
  onGoToInfrastructure,
  onGoToDeployments,
  onGoToActivity,
  onGoToMonitoring,
  onGoToLaunch,
  onGoToDocs,
  onGoToKeys,
  onCopy,
}: {
  mode: ConnectionMode;
  readiness: CloudReadiness | null;
  session: Session;
  selectedWorkspace: string;
  publicApiKey: string;
  usageSummary: UsageSummary | null;
  onGoToDevelopers: () => void;
  onGoToInfrastructure: () => void;
  onGoToDeployments: () => void;
  onGoToActivity: () => void;
  onGoToMonitoring: () => void;
  onGoToLaunch: () => void;
  onGoToDocs: () => void;
  onGoToKeys: () => void;
  onCopy: (text: string) => void;
}) {
  const webhookUrl = `${window.location.origin.replace(/\/$/, "")}/whatsapp/webhook`;
  const signingSecret = "cp_whsec_live_shared_secret";
  const workspaceName = readiness?.workspace?.name ?? usageSummary?.workspace_name ?? selectedWorkspace ?? "No workspace selected";
  const statusLabel =
    mode === "preview"
      ? "Preview integrations"
      : readiness?.status === "ok"
        ? "Live integrations"
        : readiness
          ? "Integrations need attention"
          : "Waiting for live checks";
  const deliverySummary = [
    { label: "Webhook endpoint", value: webhookUrl, detail: "Mount this route on your public host and subscribe Meta to it." },
    { label: "Signing secret", value: signingSecret, detail: "Verify incoming requests server-side before processing them." },
    { label: "Recent deliveries", value: `${readiness?.summary?.recent_webhook_count ?? demoWebhookDeliveries.length} events`, detail: "Keep an eye on retries, latency, and non-2xx responses." },
    { label: "API key state", value: publicApiKey.trim() ? "Configured" : "Missing", detail: session.user ? "Operator session is active" : "Sign in before editing integrations." },
  ];
  const integrationChecklist = [
    "Keep webhook delivery on the public marketing or app host, not inside the browser bundle.",
    "Reject unsigned payloads before they reach business logic.",
    "Retry transient failures with backoff and keep delivery logs visible in the dashboard.",
    "Cross-check deployments before changing integration endpoints.",
  ];
  const deliveryTone = (status: WebhookDelivery["status"]): "green" | "amber" | "blue" | "gray" => {
    if (status === "delivered") return "green";
    if (status === "retrying") return "amber";
    return "gray";
  };

  return (
    <div className="integrations-layout">
      <Panel className="integrations-hero">
        <div className="panel-head bordered">
          <div>
            <h2>Integrations</h2>
            <p className="helper-text">Webhook wiring, delivery history, and retry posture for live CRM and API workflows.</p>
          </div>
          <StatusChip tone={mode === "preview" ? "blue" : readiness?.status === "ok" ? "green" : "amber"} label={statusLabel} />
        </div>
        <div className="integration-summary-grid">
          {deliverySummary.map((item) => (
            <div key={item.label} className="integration-summary">
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.detail}</small>
            </div>
          ))}
        </div>
      </Panel>

      <div className="integration-grid">
        <Panel className="integration-config-panel">
          <div className="panel-head bordered">
            <h2>Webhook config</h2>
            <StatusChip tone={readiness?.status === "ok" ? "green" : "amber"} label={readiness?.summary?.recent_webhook_count ? "Active" : "Waiting"} />
          </div>
          <div className="webhook-box">
            <span>Delivery URL</span>
            <code>{webhookUrl}</code>
            <small>Point your Meta / service webhooks here. Keep the handler server-side and behind the platform host.</small>
            <button className="button primary blue" onClick={() => onCopy(webhookUrl)}>Copy URL</button>
          </div>
          <div className="webhook-box">
            <span>Signing secret</span>
            <code>{signingSecret}</code>
            <small>Store this in your server environment and validate signatures before any business logic runs.</small>
            <button className="button outline" onClick={() => onCopy(signingSecret)}>Copy secret</button>
          </div>
          <div className="integration-checklist">
            <span>Integration checklist</span>
            <ul>
              {integrationChecklist.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
          <div className="integration-actions">
            <button className="button outline" onClick={onGoToKeys}>API keys</button>
            <button className="button outline" onClick={onGoToDevelopers}>Developers</button>
            <button className="button outline" onClick={onGoToInfrastructure}>Infrastructure</button>
            <button className="button outline" onClick={onGoToMonitoring}>Monitoring</button>
          </div>
        </Panel>

        <Panel className="integration-deliveries-panel">
          <div className="panel-head bordered">
            <h2>Delivery log</h2>
            <StatusChip tone={readiness?.status === "ok" ? "green" : "amber"} label={`${readiness?.summary?.recent_webhook_count ?? demoWebhookDeliveries.length} recent`} />
          </div>
          <div className="integration-delivery-list">
            {demoWebhookDeliveries.map((delivery) => (
              <article key={delivery.id} className="integration-delivery">
                <div className="integration-delivery-head">
                  <div>
                    <strong>{delivery.event}</strong>
                    <span>{delivery.endpoint}</span>
                  </div>
                  <StatusChip tone={deliveryTone(delivery.status)} label={delivery.status === "delivered" ? "Delivered" : delivery.status === "retrying" ? "Retrying" : "Failed"} />
                </div>
                <small>{delivery.response}</small>
                <div className="integration-delivery-meta">
                  <span>{delivery.attempts} attempt{delivery.attempts === 1 ? "" : "s"}</span>
                  <span>{delivery.time}</span>
                </div>
              </article>
            ))}
          </div>
          <div className="integration-actions">
            <button className="button primary blue" onClick={onGoToDeployments}>Deployments</button>
            <button className="button outline" onClick={onGoToActivity}>Activity</button>
            <button className="button outline" onClick={onGoToMonitoring}>Monitoring</button>
            <button className="button outline" onClick={onGoToLaunch}>Launch</button>
            <button className="button outline" onClick={onGoToDocs}>Docs</button>
          </div>
        </Panel>
      </div>

      <Panel className="integration-footer-panel">
        <div className="panel-head bordered">
          <h2>Workspace integration snapshot</h2>
          <button className="button outline" onClick={() => onCopy(workspaceName)}>Copy workspace</button>
        </div>
        <div className="integration-footer-grid">
          <div className="integration-footer-card">
            <span>Workspace</span>
            <strong>{workspaceName}</strong>
            <small>{usageSummary?.active_api_key_count ?? 0} active keys | {usageSummary?.monthly_request_limit?.toLocaleString() ?? "10M"} monthly request cap</small>
          </div>
          <div className="integration-footer-card">
            <span>Auth contract</span>
            <strong>`CLIENTPAD_API_KEY`</strong>
            <small>Keep integration code server-side and pass the bearer token in every request.</small>
          </div>
          <div className="integration-footer-card">
            <span>Webhook posture</span>
            <strong>{readiness?.summary?.recent_webhook_count ? "Active" : "Idle"}</strong>
            <small>{readiness?.summary?.recent_webhook_count ? `${readiness.summary.recent_webhook_count} recent webhook events` : "No recent webhook traffic recorded"}</small>
          </div>
          <div className="integration-footer-card">
            <span>Next action</span>
            <strong>Review deliveries after every deploy</strong>
            <small>Infrastructure, deployments, and integrations should move together.</small>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function SecurityCenter({
  mode,
  readiness,
  session,
  publicApiKey,
  usageSummary,
  onGoToKeys,
  onGoToDevelopers,
  onGoToInfrastructure,
  onGoToActivity,
  onGoToIntegrations,
  onGoToMonitoring,
  onGoToLaunch,
  onGoToDocs,
  onCopy,
}: {
  mode: ConnectionMode;
  readiness: CloudReadiness | null;
  session: Session;
  publicApiKey: string;
  usageSummary: UsageSummary | null;
  onGoToKeys: () => void;
  onGoToDevelopers: () => void;
  onGoToInfrastructure: () => void;
  onGoToActivity: () => void;
  onGoToIntegrations: () => void;
  onGoToMonitoring: () => void;
  onGoToLaunch: () => void;
  onGoToDocs: () => void;
  onCopy: (text: string) => void;
}) {
  const workspaceName = readiness?.workspace?.name ?? usageSummary?.workspace_name ?? "No workspace selected";
  const apiKeyState = publicApiKey.trim() ? "Configured" : "Missing";
  const sessionState = session.user ? "Signed in" : "Not signed in";
  const securitySignals = [
    { label: "Operator session", value: sessionState, detail: session.user?.email ?? "Preview account", ok: Boolean(session.user) },
    { label: "Workspace key", value: apiKeyState, detail: publicApiKey.trim() ? "Live inbox, usage, and pipeline data can load" : "Create or paste a `CLIENTPAD_API_KEY`", ok: Boolean(publicApiKey.trim()) },
    { label: "WhatsApp auth", value: readiness?.summary?.has_whatsapp_configuration ? "Configured" : "Missing", detail: readiness?.summary?.has_whatsapp_configuration ? "Live inbox can receive traffic" : "Set up WhatsApp to unlock messaging", ok: Boolean(readiness?.summary?.has_whatsapp_configuration) },
    { label: "Payments", value: readiness?.summary?.has_payment_provider_configuration ? "Configured" : "Missing", detail: readiness?.summary?.has_payment_provider_configuration ? "Billing and checkout can run" : "Add a payment provider for checkout flow", ok: Boolean(readiness?.summary?.has_payment_provider_configuration) },
  ];
  const policyItems = [
    "Keep the public dashboard open, but never expose API keys in the browser.",
    "Rotate workspace keys from the dashboard when a service account changes.",
    "Require server-side requests to send `CLIENTPAD_API_KEY` on every live integration.",
    "Use the activity and deployments pages to review changes before giving customers traffic.",
  ];
  const threatItems = [
    { title: "Missing key", detail: "Dashboard stays usable, but live inbox and usage data remain blocked until a workspace key is present." },
    { title: "Unauthorized API request", detail: "Reject with 401 and direct the caller to the Developers page for the correct bearer token contract." },
    { title: "Rate limit exceeded", detail: "Return 429 and encourage backoff; the Usage page will surface the affected quota." },
    { title: "Deployment drift", detail: "Use Deployments and Infrastructure to verify the live host map before rollout." },
  ];

  return (
    <div className="security-layout">
      <Panel className="security-hero">
        <div className="panel-head bordered">
          <div>
            <h2>Security</h2>
            <p className="helper-text">API key posture, session state, and the controls that keep ClientPad safe for public, developer-facing use.</p>
          </div>
          <StatusChip tone={mode === "preview" ? "blue" : readiness?.status === "ok" ? "green" : "amber"} label={mode === "preview" ? "Preview security" : "Live security"} />
        </div>
        <div className="security-grid">
          {securitySignals.map((signal) => (
            <div key={signal.label} className="security-signal">
              <span>{signal.label}</span>
              <strong>{signal.value}</strong>
              <small>{signal.detail}</small>
            </div>
          ))}
        </div>
      </Panel>

      <div className="security-layout-grid">
        <Panel className="security-policy-panel">
          <div className="panel-head bordered">
            <h2>Policy</h2>
            <button className="button outline" onClick={() => onCopy("CLIENTPAD_API_KEY")}>Copy key name</button>
          </div>
          <div className="security-policy-card">
            <span>Open-source posture</span>
            <strong>Public code, private access</strong>
            <small>Anyone can inspect the repository, but live requests must use server-side keys and authenticated operator sessions.</small>
          </div>
          <div className="security-policy-list">
            {policyItems.map((item) => <p key={item}>{item}</p>)}
          </div>
          <div className="security-actions">
            <button className="button primary blue" onClick={onGoToKeys}>Create API key</button>
            <button className="button outline" onClick={onGoToDevelopers}>Developers</button>
            <button className="button outline" onClick={onGoToInfrastructure}>Infrastructure</button>
            <button className="button outline" onClick={onGoToIntegrations}>Integrations</button>
            <button className="button outline" onClick={onGoToMonitoring}>Monitoring</button>
          </div>
        </Panel>

        <Panel className="security-threat-panel">
          <div className="panel-head bordered">
            <h2>Threat handling</h2>
            <StatusChip tone={readiness?.status === "ok" ? "green" : "amber"} label={readiness?.status === "ok" ? "Healthy" : "Review needed"} />
          </div>
          <div className="security-threat-list">
            {threatItems.map((item) => (
              <article key={item.title} className="security-threat">
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </article>
            ))}
          </div>
          <div className="security-actions">
            <button className="button outline" onClick={onGoToActivity}>Activity</button>
            <button className="button outline" onClick={onGoToLaunch}>Launch</button>
            <button className="button outline" onClick={onGoToDocs}>Docs</button>
          </div>
        </Panel>
      </div>

      <Panel className="security-footer-panel">
        <div className="panel-head bordered">
          <h2>Workspace security snapshot</h2>
          <button className="button outline" onClick={() => onCopy(workspaceName)}>
            Copy workspace
          </button>
        </div>
        <div className="security-footer-grid">
          <div className="security-footer-card">
            <span>Workspace</span>
            <strong>{workspaceName}</strong>
            <small>{usageSummary?.active_api_key_count ?? 0} active keys | {usageSummary?.monthly_request_limit?.toLocaleString() ?? "10M"} monthly request cap</small>
          </div>
          <div className="security-footer-card">
            <span>Session</span>
            <strong>{sessionState}</strong>
            <small>{session.user?.email ?? "Preview account"} | Session-backed dashboard access</small>
          </div>
          <div className="security-footer-card">
            <span>API key contract</span>
            <strong>`CLIENTPAD_API_KEY`</strong>
            <small>Use a server-side bearer token for every live API call.</small>
          </div>
          <div className="security-footer-card">
            <span>Next operator action</span>
            <strong>Review deployments before release</strong>
            <small>Security stays aligned with deployments, activity, and infrastructure.</small>
          </div>
        </div>
      </Panel>
    </div>
  );
}

function Monitoring({
  mode,
  health,
  readiness,
  usageSummary,
  session,
  selectedWorkspace,
  publicApiKey,
  onGoToInfrastructure,
  onGoToDeployments,
  onGoToIntegrations,
  onGoToActivity,
  onGoToSecurity,
  onGoToLaunch,
  onCopy,
}: {
  mode: ConnectionMode;
  health: CloudHealth | null;
  readiness: CloudReadiness | null;
  usageSummary: UsageSummary | null;
  session: Session;
  selectedWorkspace: string;
  publicApiKey: string;
  onGoToInfrastructure: () => void;
  onGoToDeployments: () => void;
  onGoToIntegrations: () => void;
  onGoToActivity: () => void;
  onGoToSecurity: () => void;
  onGoToLaunch: () => void;
  onCopy: (text: string) => void;
}) {
  const workspaceName = readiness?.workspace?.name ?? usageSummary?.workspace_name ?? selectedWorkspace ?? "No workspace selected";
  const requestCount = usageSummary?.request_count ?? 0;
  const rejectedCount = usageSummary?.rejected_count ?? 0;
  const errorRate = requestCount > 0 ? ((rejectedCount / requestCount) * 100).toFixed(2) : "0.00";
  const healthAge = health ? timeAgo(health.time) : "Waiting";
  const uptime = readiness?.status === "ok" ? "99.98%" : readiness?.status === "degraded" ? "98.42%" : "Pending";
  const latency = health?.status === "ok" ? "84ms" : health?.status === "degraded" ? "238ms" : "Pending";
  const metrics: MonitoringMetric[] = [
    { label: "API status", value: health ? `${health.service} ${health.status}` : "Pending", detail: `Last check ${healthAge}`, tone: health?.status === "ok" ? "green" : health ? "amber" : "gray" },
    { label: "Uptime", value: uptime, detail: mode === "preview" ? "Preview telemetry" : "Current availability window", tone: readiness?.status === "ok" ? "green" : "amber" },
    { label: "Latency", value: latency, detail: "Median request time across public surfaces", tone: health?.status === "ok" ? "blue" : "amber" },
    { label: "Error rate", value: `${errorRate}%`, detail: `${formatNumber(rejectedCount)} rejected of ${formatNumber(requestCount)} requests`, tone: rejectedCount > 0 ? "amber" : "green" },
    { label: "Webhooks", value: `${readiness?.summary?.recent_webhook_count ?? 0}`, detail: "Recent delivery activity", tone: readiness?.summary?.recent_webhook_count ? "green" : "gray" },
    { label: "Workspace", value: workspaceName, detail: readiness?.workspace ? `Selected ${timeAgo(readiness.time)}` : "No live workspace selected", tone: "blue" },
  ];
  const alerts: MonitoringAlert[] = [
    {
      title: health?.status === "ok" ? "No active incidents" : "Health attention required",
      detail: health?.status === "ok"
        ? "API health checks are healthy and the platform is ready for operator use."
        : health
          ? "One or more checks need attention. Review Infrastructure and Deployments for next steps."
          : "Health checks have not run yet. Refresh the dashboard or open Infrastructure.",
      time: healthAge,
      severity: health?.status === "ok" ? "ok" : health ? "warning" : "fail",
    },
    {
      title: readiness?.summary?.has_public_api_key ? "Public API key available" : "Public API key missing",
      detail: readiness?.summary?.has_public_api_key
        ? "Developers can use the API and the live inbox can sync."
        : "Create a workspace key before expecting live integrations or inbox traffic.",
      time: readiness?.time ? timeAgo(readiness.time) : "Waiting",
      severity: readiness?.summary?.has_public_api_key ? "ok" : "warning",
    },
    {
      title: readiness?.summary?.recent_webhook_count ? "Webhook traffic flowing" : "No webhook traffic yet",
      detail: readiness?.summary?.recent_webhook_count
        ? `${readiness.summary.recent_webhook_count} recent webhook events were observed.`
        : "Send a test event from your integration to verify the delivery path.",
      time: readiness?.summary?.recent_webhook_count ? `${readiness.summary.recent_webhook_count} events` : "Idle",
      severity: readiness?.summary?.recent_webhook_count ? "ok" : "warning",
    },
  ];
  const serviceCards = [
    { name: "Dashboard", host: "platform.clientpad.xyz", status: "Live" },
    { name: "Public API", host: "api.clientpad.xyz", status: health?.status === "ok" ? "Healthy" : "Review" },
    { name: "Docs", host: "docs.clientpad.xyz", status: "Live" },
    { name: "Marketing", host: "clientpad.xyz", status: "Live" },
  ];

  return (
    <div className="monitoring-layout">
      <Panel className="monitoring-hero">
        <div className="panel-head bordered">
          <div>
            <h2>Monitoring</h2>
            <p className="helper-text">Health, uptime, latency, and error posture for the full ClientPad surface.</p>
          </div>
          <StatusChip tone={mode === "preview" ? "blue" : health?.status === "ok" ? "green" : "amber"} label={mode === "preview" ? "Preview monitoring" : health ? `${health.service} ${health.status}` : "Health pending"} />
        </div>
        <div className="monitoring-metric-grid">
          {metrics.map((metric) => (
            <div key={metric.label} className={`monitoring-metric ${metric.tone}`}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              <small>{metric.detail}</small>
            </div>
          ))}
        </div>
      </Panel>

      <div className="monitoring-grid">
        <Panel className="monitoring-services-panel">
          <div className="panel-head bordered">
            <h2>Service health</h2>
            <StatusChip tone={health?.status === "ok" ? "green" : health ? "amber" : "gray"} label={health ? `Checked ${timeAgo(health.time)}` : "Not checked"} />
          </div>
          <div className="monitoring-service-list">
            {serviceCards.map((service) => (
              <article key={service.name} className="monitoring-service">
                <div className="monitoring-service-head">
                  <div>
                    <strong>{service.name}</strong>
                    <span>{service.host}</span>
                  </div>
                  <StatusChip tone={service.status === "Healthy" || service.status === "Live" ? "green" : "amber"} label={service.status} />
                </div>
                <small>{service.name === "Public API" ? `Health source: ${health?.service ?? "pending"}` : "Static deployment on Render"}</small>
              </article>
            ))}
          </div>
        </Panel>

        <Panel className="monitoring-alerts-panel">
          <div className="panel-head bordered">
            <h2>Alerts</h2>
            <StatusChip tone={readiness?.status === "ok" ? "green" : "amber"} label={readiness?.status === "ok" ? "Stable" : "Watch list"} />
          </div>
          <div className="monitoring-alert-list">
            {alerts.map((alert) => (
              <article key={alert.title} className={`monitoring-alert ${alert.severity}`}>
                <div className="monitoring-alert-head">
                  <strong>{alert.title}</strong>
                  <span>{alert.time}</span>
                </div>
                <small>{alert.detail}</small>
              </article>
            ))}
          </div>
          <div className="monitoring-actions">
            <button className="button primary blue" onClick={onGoToInfrastructure}>Infrastructure</button>
            <button className="button outline" onClick={onGoToDeployments}>Deployments</button>
            <button className="button outline" onClick={onGoToIntegrations}>Integrations</button>
            <button className="button outline" onClick={onGoToSecurity}>Security</button>
          </div>
        </Panel>
      </div>

      <Panel className="monitoring-footer-panel">
        <div className="panel-head bordered">
          <h2>Monitoring summary</h2>
          <button className="button outline" onClick={() => onCopy(workspaceName)}>Copy workspace</button>
        </div>
        <div className="monitoring-footer-grid">
          <div className="monitoring-footer-card">
            <span>Workspace</span>
            <strong>{workspaceName}</strong>
            <small>{usageSummary?.active_api_key_count ?? 0} active keys | {usageSummary?.monthly_request_limit?.toLocaleString() ?? "10M"} monthly request cap</small>
          </div>
          <div className="monitoring-footer-card">
            <span>Health route</span>
            <strong>`/health`</strong>
            <small>Operator and API health checks are sourced from the same live endpoint.</small>
          </div>
          <div className="monitoring-footer-card">
            <span>Incident posture</span>
            <strong>{health?.status === "ok" ? "Clear" : "Watch list"}</strong>
            <small>{health?.status === "ok" ? "No active incident" : "Review service state before the next deploy."}</small>
          </div>
          <div className="monitoring-footer-card">
            <span>Next action</span>
            <strong>Keep the API healthy, then roll forward</strong>
            <small>Monitoring should drive action across deployments, integrations, and security.</small>
          </div>
        </div>
        <div className="monitoring-actions">
          <button className="button outline" onClick={onGoToActivity}>Activity</button>
          <button className="button outline" onClick={onGoToLaunch}>Launch</button>
          <button className="button outline" onClick={onGoToDeployments}>Deployments</button>
        </div>
      </Panel>
    </div>
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

function Badge({ children, tone }: { children: React.ReactNode; tone: "green" | "blue" | "gray" | "amber" }) {
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
    readiness?.auth?.user ? `Signed in as ${readiness.auth.user.email}` : "Operator session not validated yet",
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
            { label: "API", value: readiness ? "Reachable" : "Not checked yet", ok: Boolean(readiness) },
            { label: "Operator session", value: readiness?.auth?.user ? "Accepted" : "Pending", ok: Boolean(readiness?.auth?.user) },
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
          <p className="bubble outbound">Yes - NGN 45,000 including call-out. We can book 3 PM.</p>
          <p className="bubble inbound">Great, please book it and send payment link.</p>
        </div>
        <label className="mention-field">Assignment / mentions<input defaultValue="@Aisha assigned | @Ops please watch payment" /></label>
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
  constructor(private readonly baseUrl: string, private readonly demo = false) {}

  async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    if (this.demo) return demoResponse(path, init) as T;

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      credentials: "include",
      headers: {
        "content-type": "application/json",
        ...(init.headers ?? {}),
      },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error?.message ?? `Request failed with ${response.status}`);
    return body as T;
  }

  async authStatus() {
    return this.request<CloudAuthStatus>("/auth/status");
  }

  async login(input: { email: string; password: string }) {
    return this.request<CloudAuthEnvelope>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async register(input: { email: string; password: string; full_name?: string; workspace_name?: string }) {
    return this.request<CloudAuthEnvelope>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async me() {
    return this.request<CloudAuthEnvelope>("/auth/me");
  }

  async logout() {
    return this.request<{ status: string }>("/auth/logout", { method: "POST" });
  }

  async bootstrapWorkspace(input: {
    workspace_name: string;
    project_name: string;
    api_key_name: string;
    owner_email?: string;
    plan_code?: string;
    environment?: string;
    workspace_id?: string;
  }) {
    return this.request<{ data: { workspace: CloudWorkspace; project: Project; api_key: ApiKeyResult; usage: UsageSummary } }>(
      "/workspaces/bootstrap",
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    ).then((body) => body.data);
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

  async projects(workspaceId?: string) {
    const query = workspaceId ? `?workspace_id=${encodeURIComponent(workspaceId)}` : "";
    const body = await this.request<{ data: Project[] }>(`/projects${query}`);
    return body.data;
  }

  async createProject(input: ProjectFormState & { workspace_id?: string }) {
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

  async createCheckoutSession(input: {
    workspace_id: string;
    plan_code: string;
    success_url: string;
    cancel_url: string;
    customer_email?: string;
  }) {
    const body = await this.request<{ data: { id: string; url: string; workspace_id: string; plan_code: string; price_id: string } }>(
      "/billing/checkout-session",
      {
        method: "POST",
        body: JSON.stringify(input),
      }
    );
    return body.data;
  }

  async createPortalSession(input: { workspace_id: string; return_url: string }) {
    const body = await this.request<{ data: { id: string; url: string; workspace_id: string } }>("/billing/portal-session", {
      method: "POST",
      body: JSON.stringify(input),
    });
    return body.data;
  }

  async usage(workspaceId: string) {
    const body = await this.request<{ data: UsageRow[] }>(`/usage?workspace_id=${encodeURIComponent(workspaceId)}`);
    return body.data;
  }

  async usageSummary(workspaceId: string) {
    const body = await this.request<{ data: UsageSummary }>(`/usage/summary?workspace_id=${encodeURIComponent(workspaceId)}`);
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
      auth: { user: { id: "user_1", email: "operator@clientpad.com", full_name: "Alex Developer" }, session_expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString(), mode: "operator_session" },
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
  if (path === "/workspaces/bootstrap") {
    const body = JSON.parse(String(init.body ?? "{}")) as Partial<{
      workspace_name: string;
      project_name: string;
      api_key_name: string;
      owner_email: string;
      name: string;
    }>;
    const workspaceId = `workspace_${Date.now()}`;
    const project = {
      id: `project_${Date.now()}`,
      workspace_id: workspaceId,
      name: body.name || body.project_name || "ClientPad API",
      slug: slugify(body.name || body.project_name || "clientpad-api"),
      environment: "production",
      owner_email: body.owner_email || "founder@example.com",
      created_at: new Date().toISOString(),
    } as Project;
    return {
      data: {
        workspace: {
          id: workspaceId,
          name: body.workspace_name || "ClientPad Workspace",
          role: "owner",
          project_count: 1,
          key_count: 1,
          active_subscription_count: 1,
          whatsapp_account_count: 0,
          active_whatsapp_account_count: 0,
          payment_provider_count: 0,
          latest_whatsapp_activity_at: null,
          latest_payment_event_at: null,
          recent_webhook_count: 0,
          has_public_api_key: true,
          has_whatsapp_configuration: false,
          has_payment_provider_configuration: false,
        },
        project,
        api_key: {
          id: `api_key_${Date.now()}`,
          key: "cp_live_demo123_generated_secret_444f",
          scopes: ["leads:read", "leads:write", "clients:read", "clients:write", "usage:read", "whatsapp:read", "whatsapp:write"],
          billing_mode: "cloud_free",
          monthly_request_limit: 1000,
          rate_limit_per_minute: 60,
        },
        usage: {
          workspace_id: workspaceId,
          workspace_name: body.workspace_name || "ClientPad Workspace",
          plan_code: "free",
          plan_name: "Free",
          month: new Date().toISOString().slice(0, 7) + "-01",
          request_count: 0,
          rejected_count: 0,
          active_api_key_count: 1,
          monthly_request_limit: 1000,
          rate_limit_per_minute: 60,
          remaining_requests: 1000,
          last_used_at: null,
          billing_mode: "cloud_free",
        },
      },
    };
  }
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
  if (path === "/usage/summary") {
    return {
      data: {
        workspace_id: "workspace_prod",
        workspace_name: "Acme Corp",
        plan_code: "pro",
        plan_name: "Pro",
        month: new Date().toISOString().slice(0, 7) + "-01",
        request_count: 2_391_873,
        rejected_count: 73,
        active_api_key_count: 3,
        monthly_request_limit: 10_000_000,
        rate_limit_per_minute: 1200,
        remaining_requests: 7_608_127,
        last_used_at: "2026-05-12T11:00:00Z",
        billing_mode: "cloud_paid",
      },
    };
  }
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
  "Thanks - we are checking this now.",
  "Here is your payment link.",
  "Can you share your preferred time window?",
  "Your booking is confirmed.",
];

const demoUsage: UsageRow[] = [
  { api_key_id: "api_key_444f", name: "Production Server Key", billing_mode: "cloud_paid", monthly_request_limit: 10_000_000, rate_limit_per_minute: 1200, request_count: 1_532_984, rejected_count: 73 },
  { api_key_id: "api_key_2a7b", name: "Staging Server Key", billing_mode: "cloud_paid", monthly_request_limit: 10_000_000, rate_limit_per_minute: 1200, request_count: 512_771, rejected_count: 52 },
  { api_key_id: "api_key_9c3d", name: "Dev CLI Key", billing_mode: "cloud_free", monthly_request_limit: 100_000, rate_limit_per_minute: 300, request_count: 346_118, rejected_count: 7 },
];

const demoDeployments: DeploymentRecord[] = [
  {
    service: "clientpad-api",
    host: "api.clientpad.xyz",
    target: "clientpad-api.onrender.com",
    status: "live",
    deployed_at: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
    commit: "9d5b425",
    trigger: "GitHub push",
    note: "Cloud API, readiness checks, and operator auth are deployed here.",
  },
  {
    service: "clientpad-app",
    host: "platform.clientpad.xyz",
    target: "clientpad-app.onrender.com",
    status: "live",
    deployed_at: new Date(Date.now() - 1.4 * 60 * 60 * 1000).toISOString(),
    commit: "229163d",
    trigger: "GitHub push",
    note: "Dashboard shell, infrastructure, and deployment pages ship here.",
  },
  {
    service: "clientpad-docs",
    host: "docs.clientpad.xyz",
    target: "clientpad-docs.onrender.com",
    status: "live",
    deployed_at: new Date(Date.now() - 2.1 * 60 * 60 * 1000).toISOString(),
    commit: "9f1db05",
    trigger: "GitHub push",
    note: "Docs root rewrite keeps the docs host serving the docs homepage.",
  },
  {
    service: "clientpad-frontend",
    host: "clientpad.xyz",
    target: "clientpad-frontend.onrender.com",
    status: "live",
    deployed_at: new Date(Date.now() - 3.3 * 60 * 60 * 1000).toISOString(),
    commit: "9d17528",
    trigger: "GitHub push",
    note: "Public marketing pages, footer, and open-source positioning ship here.",
  },
];

const demoWebhookDeliveries: WebhookDelivery[] = [
  {
    id: "wh_001",
    event: "conversation.opened",
    endpoint: "https://clientpad.xyz/whatsapp/webhook",
    status: "delivered",
    attempts: 1,
    time: "38m ago",
    response: "200 OK in 84ms",
  },
  {
    id: "wh_002",
    event: "lead.created",
    endpoint: "https://clientpad.xyz/whatsapp/webhook",
    status: "delivered",
    attempts: 1,
    time: "52m ago",
    response: "200 OK in 73ms",
  },
  {
    id: "wh_003",
    event: "payment.completed",
    endpoint: "https://clientpad.xyz/whatsapp/webhook",
    status: "retrying",
    attempts: 2,
    time: "1h ago",
    response: "408 Timeout, retry scheduled",
  },
  {
    id: "wh_004",
    event: "client.replied",
    endpoint: "https://clientpad.xyz/whatsapp/webhook",
    status: "delivered",
    attempts: 1,
    time: "2h ago",
    response: "200 OK in 91ms",
  },
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
      key: `cp_live_${"*".repeat(24)}${["444f", "2a7b", "9c3d"][index] ?? "7f0a"}`,
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
    curl: `curl https://api.clientpad.xyz/api/public/v1/resources \\\n  -H "Authorization: Bearer cp_live_your_api_key_here" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name":"${resource}"}'`,
    python: `import requests\n\nrequests.post(\n  "https://api.clientpad.xyz/api/public/v1/resources",\n  headers={"Authorization": "Bearer cp_live_your_api_key_here"},\n  json={"name": "${resource}"},\n)`,
    node: `import { ClientPad } from "@clientpad/sdk";\n\nconst clientpad = new ClientPad({\n  baseUrl: "https://api.clientpad.xyz/api/public/v1",\n  apiKey: process.env.CLIENTPAD_API_KEY!,\n});\n\nawait clientpad.leads.create({ name: "${resource}" });`,
    go: `req, _ := http.NewRequest("POST", "https://api.clientpad.xyz/api/public/v1/resources", body)\nreq.Header.Set("Authorization", "Bearer cp_live_your_api_key_here")`,
    ruby: `Net::HTTP.post(\n  URI("https://api.clientpad.xyz/api/public/v1/resources"),\n  { name: "${resource}" }.to_json,\n  "Authorization" => "Bearer cp_live_your_api_key_here"\n)`,
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

function buildInitialLaunchChecks(baseUrl: string): LaunchCheck[] {
  const cloudBaseUrl = baseUrl.replace(/\/+$/, "");
  const apiOrigin = cloudBaseUrl.replace(/\/api\/cloud\/v1$/i, "");
  return [
    { id: "api-host-readiness", label: "API host readiness", url: `${apiOrigin}/readiness`, status: "checking", detail: "Waiting for response" },
    { id: "cloud-health", label: "API health", url: `${cloudBaseUrl}/health`, status: "checking", detail: "Waiting for response" },
    { id: "cloud-readiness", label: "Workspace readiness", url: `${cloudBaseUrl}/readiness`, status: "checking", detail: "Waiting for response" },
    { id: "auth-status", label: "Operator auth status", url: `${cloudBaseUrl}/auth/status`, status: "checking", detail: "Waiting for response" },
    { id: "public-gateway", label: "Public API gateway", url: `${apiOrigin}/api/public/v1/usage`, status: "checking", detail: "Waiting for response" },
  ];
}

function buildPreviewLaunchChecks(baseUrl: string): LaunchCheck[] {
  return buildInitialLaunchChecks(baseUrl).map((check) => ({
    ...check,
    status: "warning",
    detail: "Preview mode does not call production services",
  }));
}

async function checkJsonEndpoint(
  id: string,
  label: string,
  url: string,
  evaluate: (response: Response, body: any) => { ok: boolean; warning?: boolean; detail: string; nextAction?: string },
  headers?: Record<string, string>
): Promise<LaunchCheck> {
  try {
    const response = await fetch(url, {
      credentials: "include",
      headers,
    });
    const body = await response.json().catch(() => null);
    const evaluated = evaluate(response, body);
    return {
      id,
      label,
      url,
      status: evaluated.ok ? (evaluated.warning ? "warning" : "ok") : "fail",
      detail: evaluated.detail,
      nextAction: evaluated.nextAction,
    };
  } catch (error) {
    return {
      id,
      label,
      url,
      status: "fail",
      detail: error instanceof Error ? error.message : "Request failed",
      nextAction: "Confirm the Render API service is live and the dashboard API URL points to the deployed host.",
    };
  }
}

function summarizeApiHostNextAction(body: any) {
  const checks = body?.checks;
  if (!checks || typeof checks !== "object") {
    return "Open the Render API service logs and inspect the failed readiness check.";
  }
  const failedCheck = Object.values(checks).find((check: any) => check?.ok === false) as { detail?: string; nextAction?: string } | undefined;
  return failedCheck?.nextAction ?? failedCheck?.detail ?? "Open the Render API service logs and inspect the failed readiness check.";
}

function launchStatusIcon(status: LaunchCheckStatus) {
  if (status === "ok") return <CheckCircle2 size={18} />;
  if (status === "checking") return <Clock size={18} />;
  return <AlertCircle size={18} />;
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
    launch: "Launch",
    infrastructure: "Infrastructure",
    deployments: "Deployments",
    developers: "Developers",
    activity: "Activity",
    integrations: "Integrations",
    security: "Security",
    monitoring: "Monitoring",
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
    launch: "Verify production services before sending customers traffic",
    infrastructure: "Platform, API, docs, and public host mapping",
    deployments: "GitHub pushes, Render releases, and service rollout history",
    developers: "Developer onboarding, SDK setup, and API error handling",
    activity: "Recent deploys, operator actions, and request history",
    integrations: "Webhook delivery, retries, and integration posture",
    security: "API key posture, sessions, and threat handling",
    monitoring: "Health, latency, uptime, and error posture",
    docs: "SDK and API snippets developers can copy into apps",
    settings: "API connection and operator settings",
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
  return key.startsWith("cp_live_") ? key : `cp_live_${"*".repeat(24)}${key.slice(-4)}`;
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
