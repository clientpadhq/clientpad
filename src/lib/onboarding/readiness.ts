import { createClient } from "@/lib/supabase/server";

type ReadinessItemKey =
  | "branding_incomplete"
  | "payment_settings_missing"
  | "no_team_members"
  | "default_terms_missing"
  | "no_leads_or_clients"
  | "no_pipeline_customization"
  | "ai_config_gap";

export type SetupReadinessItem = {
  key: ReadinessItemKey;
  label: string;
  href: string;
  isMissing: boolean;
  optional?: boolean;
};

export type SetupReadiness = {
  completionPercent: number;
  thresholdPercent: number;
  isThresholdReached: boolean;
  missingRequiredCount: number;
  missingItems: SetupReadinessItem[];
  items: SetupReadinessItem[];
};

const DEFAULT_PIPELINE = [
  { name: "New", position: 1, is_closed: false },
  { name: "Contacted", position: 2, is_closed: false },
  { name: "Qualified", position: 3, is_closed: false },
  { name: "Quote Sent", position: 4, is_closed: false },
  { name: "Negotiation", position: 5, is_closed: false },
  { name: "Won", position: 6, is_closed: true },
  { name: "Lost", position: 7, is_closed: true },
] as const;

const READINESS_THRESHOLD_PERCENT = 85;

function hasPipelineCustomization(stages: Array<{ name: string; position: number; is_closed: boolean }>) {
  if (stages.length !== DEFAULT_PIPELINE.length) return true;

  const normalized = [...stages].sort((a, b) => a.position - b.position);

  return normalized.some((stage, idx) => {
    const baseline = DEFAULT_PIPELINE[idx];
    return stage.name !== baseline.name || stage.position !== baseline.position || stage.is_closed !== baseline.is_closed;
  });
}

export async function getSetupReadiness(workspaceId: string): Promise<SetupReadiness> {
  const supabase = await createClient();

  const [workspaceData, paymentData, membersData, leadsData, clientsData, pipelineData, quoteTermsData, aiSettingsData] = await Promise.all([
    supabase.from("workspaces").select("name, phone, business_type").eq("id", workspaceId).single(),
    supabase
      .from("workspace_payment_settings")
      .select("flutterwave_public_key, bank_instruction")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
    supabase.from("workspace_members").select("user_id", { count: "exact" }).eq("workspace_id", workspaceId),
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase.from("clients").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase.from("pipeline_stages").select("name, position, is_closed").eq("workspace_id", workspaceId),
    supabase.from("quotes").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId).not("terms", "is", null),
    supabase
      .from("workspace_ai_settings")
      .select("ai_enabled, default_provider, default_model")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
  ]);

  if (workspaceData.error) throw workspaceData.error;
  if (paymentData.error) throw paymentData.error;
  if (membersData.error) throw membersData.error;
  if (leadsData.error) throw leadsData.error;
  if (clientsData.error) throw clientsData.error;
  if (pipelineData.error) throw pipelineData.error;
  if (quoteTermsData.error) throw quoteTermsData.error;
  if (aiSettingsData.error) throw aiSettingsData.error;

  const workspace = workspaceData.data;
  const payment = paymentData.data;
  const aiSettings = aiSettingsData.data;

  const brandingIncomplete = !workspace.name?.trim() || !workspace.phone?.trim() || !workspace.business_type?.trim();
  const paymentMissing = !payment?.flutterwave_public_key?.trim() && !payment?.bank_instruction?.trim();
  const noTeamMembersBeyondOwner = (membersData.count ?? 0) <= 1;
  const defaultTermsMissing = !payment?.bank_instruction?.trim() && (quoteTermsData.count ?? 0) === 0;
  const noLeadsOrClients = (leadsData.count ?? 0) + (clientsData.count ?? 0) === 0;
  const noPipelineCustomization = !hasPipelineCustomization(pipelineData.data ?? []);
  const aiConfigGap = (aiSettings?.ai_enabled ?? true) && (!aiSettings?.default_provider?.trim() || !aiSettings?.default_model?.trim());

  const items: SetupReadinessItem[] = [
    { key: "branding_incomplete", label: "Complete workspace branding", href: "/settings#workspace-profile", isMissing: brandingIncomplete },
    { key: "payment_settings_missing", label: "Add payment settings", href: "/settings#payment-configuration", isMissing: paymentMissing },
    { key: "no_team_members", label: "Invite at least one teammate", href: "/settings#team-management", isMissing: noTeamMembersBeyondOwner },
    { key: "default_terms_missing", label: "Set default payment/terms text", href: "/settings#payment-configuration", isMissing: defaultTermsMissing },
    { key: "no_leads_or_clients", label: "Create your first lead or client", href: "/leads", isMissing: noLeadsOrClients },
    { key: "no_pipeline_customization", label: "Customize your pipeline stages", href: "/deals", isMissing: noPipelineCustomization },
    { key: "ai_config_gap", label: "Configure AI defaults (optional)", href: "/settings#ai-controls", isMissing: aiConfigGap, optional: true },
  ];

  const requiredItems = items.filter((item) => !item.optional);
  const missingRequiredCount = requiredItems.filter((item) => item.isMissing).length;
  const completedRequiredCount = requiredItems.length - missingRequiredCount;
  const completionPercent = Math.round((completedRequiredCount / requiredItems.length) * 100);

  return {
    completionPercent,
    thresholdPercent: READINESS_THRESHOLD_PERCENT,
    isThresholdReached: completionPercent >= READINESS_THRESHOLD_PERCENT,
    missingRequiredCount,
    missingItems: items.filter((item) => item.isMissing),
    items,
  };
}
