import type { Plan, Project } from "../types";
import type { Page, QuickstartLanguage } from "../types";

export function formatNumber(value: number) {
  return value.toLocaleString("en-US");
}

export function formatQuota(value: number, suffix: string) {
  if (suffix) return `${value.toLocaleString("en-US", { maximumFractionDigits: 1 })} ${suffix}`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 2)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value % 1_000 === 0 ? 0 : 1)}K`;
  return value.toLocaleString("en-US");
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(value));
}

export function priceForPlan(plan: Plan) {
  return plan.monthly_price_cents === 0 ? "Free" : `$${(plan.monthly_price_cents / 100).toFixed(0)} / month`;
}

export function maskKey(key: string) {
  return key.startsWith("cp_live_") ? key : `cp_live_${"*".repeat(24)}${key.slice(-4)}`;
}

export function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

export function toTitle(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function normalizeLookup(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function titleForPage(page: Page) {
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

export function subtitleForPage(page: Page, project?: Project) {
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

export function quickstartSnippet(language: QuickstartLanguage, selectedProject?: Project) {
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

export async function copyText(text: string, setNotice: (notice: string) => void) {
  await navigator.clipboard.writeText(text);
  setNotice("Copied to clipboard.");
}
