import type { ApiKeyRecord, ClientRecord, Plan, Project, RevenueClient, UsageRow } from "../types";

export const demoPlans: Plan[] = [
  { id: "plan_free", code: "free", name: "Free Plan", monthly_price_cents: 0, currency: "USD", monthly_request_limit: 1_000, rate_limit_per_minute: 60, included_projects: 1, features: {} },
  { id: "plan_developer", code: "developer", name: "Developer Plan", monthly_price_cents: 1900, currency: "USD", monthly_request_limit: 100_000, rate_limit_per_minute: 300, included_projects: 3, features: {} },
  { id: "plan_pro", code: "pro", name: "Pro Plan", monthly_price_cents: 19900, currency: "USD", monthly_request_limit: 10_000_000, rate_limit_per_minute: 1200, included_projects: 10, features: {} },
  { id: "plan_business", code: "business", name: "Business Plan", monthly_price_cents: 49900, currency: "USD", monthly_request_limit: 50_000_000, rate_limit_per_minute: 5000, included_projects: 50, features: {} },
];

export const demoProjects: Project[] = [
  { id: "project_8f3e2bd7", workspace_id: "workspace_prod", name: "Acme Corp", slug: "production-api", environment: "production", owner_email: "alex@example.com", created_at: "2025-04-02T00:00:00Z" },
  { id: "project_1a7d9c3e", workspace_id: "workspace_stage", name: "Staging API", slug: "staging-api", environment: "staging", owner_email: "ops@example.com", created_at: "2025-04-02T00:00:00Z" },
  { id: "project_c7b9a1f2", workspace_id: "workspace_tools", name: "Internal Tools", slug: "internal-tools", environment: "production", owner_email: "tools@example.com", created_at: "2025-04-15T00:00:00Z" },
  { id: "project_0d3f4b6a", workspace_id: "workspace_sandbox", name: "Sandbox", slug: "sandbox", environment: "development", owner_email: "dev@example.com", created_at: "2025-04-28T00:00:00Z" },
];

export const demoClients: ClientRecord[] = [
  { id: "client_ada", name: "Ada Okafor", phone: "+234 803 555 0198", status: "New Lead", service: "Solar audit", value: 320, lastMessage: "Please confirm roof photos." },
  { id: "client_musa", name: "Musa Bello", phone: "+234 701 222 4444", status: "Quoted", service: "Generator repair", value: 460, lastMessage: "Quote sent on WhatsApp." },
  { id: "client_zuri", name: "Zuri Homes", phone: "+254 711 300 902", status: "Booked", service: "Cleaning package", value: 780, lastMessage: "Technician booked for Friday." },
  { id: "client_kofi", name: "Kofi Mensah", phone: "+233 24 900 1122", status: "In Progress", service: "AC servicing", value: 520, lastMessage: "Team is on-site." },
  { id: "client_lina", name: "Lina Patel", phone: "+1 (404) 555-0188", status: "Completed", service: "Website handover", value: 1250, lastMessage: "Awaiting payment confirmation." },
  { id: "client_noah", name: "Noah Carter", phone: "+44 7700 900123", status: "Paid", service: "Consulting sprint", value: 2100, lastMessage: "Receipt sent." },
  { id: "client_amara", name: "Amara Nwosu", phone: "0803-777-4422", status: "Review Requested", service: "Salon booking flow", value: 640, lastMessage: "Review request delivered." },
];

export const demoRevenue: RevenueClient[] = [
  { name: "Noah Carter", phone: "+44 7700 900123", amount: 2100, paidAt: "May 8, 2026", provider: "Paystack" },
  { name: "Amara Nwosu", phone: "0803-777-4422", amount: 640, paidAt: "May 7, 2026", provider: "Flutterwave" },
  { name: "Kofi Mensah", phone: "+233 24 900 1122", amount: 520, paidAt: "May 6, 2026", provider: "Paystack" },
];

export const demoConversations: Array<{ name: string; preview: string; time: string }> = [
  { name: "Ada Okafor", preview: "Please confirm roof photos.", time: "09:42" },
  { name: "Musa Bello", preview: "Can you discount the generator repair?", time: "08:18" },
  { name: "Zuri Homes", preview: "Friday still works for us.", time: "Yesterday" },
];

export const demoReplies = [
  "Thanks - we are checking this now.",
  "Here is your payment link.",
  "Can you share your preferred time window?",
  "Your booking is confirmed.",
];

export const demoUsage: UsageRow[] = [
  { api_key_id: "api_key_444f", name: "Production Server Key", billing_mode: "cloud_paid", monthly_request_limit: 10_000_000, rate_limit_per_minute: 1200, request_count: 1_532_984, rejected_count: 73 },
  { api_key_id: "api_key_2a7b", name: "Staging Server Key", billing_mode: "cloud_paid", monthly_request_limit: 10_000_000, rate_limit_per_minute: 1200, request_count: 512_771, rejected_count: 52 },
  { api_key_id: "api_key_9c3d", name: "Dev CLI Key", billing_mode: "cloud_free", monthly_request_limit: 100_000, rate_limit_per_minute: 300, request_count: 346_118, rejected_count: 7 },
];

export function toKeyRecords(usage: UsageRow[], projects: Project[]): ApiKeyRecord[] {
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
