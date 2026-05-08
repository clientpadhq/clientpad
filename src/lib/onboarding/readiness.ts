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
  isComplete?: boolean;
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

  const [branding, members, leads, clients, stages, aiSettings] = await Promise.all([
    supabase.from("workspace_branding_settings").select("email, address, default_quote_terms, default_invoice_terms").eq("workspace_id", workspaceId).maybeSingle(),
    supabase.from("workspace_members").select("user_id").eq("workspace_id", workspaceId),
    supabase.from("leads").select("id").eq("workspace_id", workspaceId).limit(1),
    supabase.from("clients").select("id").eq("workspace_id", workspaceId).limit(1),
    supabase.from("pipeline_stages").select("name, position, is_closed").eq("workspace_id", workspaceId),
    supabase.from("workspace_ai_settings").select("enabled, provider").eq("workspace_id", workspaceId).maybeSingle(),
  ]);

  const brandingData = branding.data;
  const stageRows = stages.data ?? [];
  const items: SetupReadinessItem[] = [
    {
      key: "branding_incomplete",
      label: "Add workspace branding/contact details",
      href: "/settings",
      isMissing: !brandingData?.email && !brandingData?.address,
    },
    {
      key: "payment_settings_missing",
      label: "Configure payment environment for invoice collection",
      href: "/settings",
      isMissing: !process.env.FLUTTERWAVE_SECRET_KEY,
    },
    {
      key: "no_team_members",
      label: "Invite at least one team member",
      href: "/settings",
      isMissing: (members.data?.length ?? 0) < 2,
      optional: true,
    },
    {
      key: "default_terms_missing",
      label: "Set default quote/invoice terms",
      href: "/settings",
      isMissing: !brandingData?.default_quote_terms || !brandingData?.default_invoice_terms,
    },
    {
      key: "no_leads_or_clients",
      label: "Import or create at least one lead/client",
      href: "/leads/new",
      isMissing: (leads.data?.length ?? 0) === 0 && (clients.data?.length ?? 0) === 0,
    },
    {
      key: "no_pipeline_customization",
      label: "Review pipeline stages for your workflow",
      href: "/settings",
      isMissing: !hasPipelineCustomization(stageRows),
      optional: true,
    },
    {
      key: "ai_config_gap",
      label: "Enable AI provider settings for drafts/summaries",
      href: "/settings",
      isMissing: !aiSettings.data?.enabled || !aiSettings.data?.provider,
      optional: true,
    },
  ];

  for (const item of items) {
    item.isComplete = !item.isMissing;
  }

  const requiredItems = items.filter((item) => !item.optional);
  const missingItems = items.filter((item) => item.isMissing);
  const missingRequiredCount = requiredItems.filter((item) => item.isMissing).length;
  const completedRequiredCount = requiredItems.length - missingRequiredCount;
  const completionPercent = requiredItems.length === 0 ? 100 : Math.round((completedRequiredCount / requiredItems.length) * 100);

  return {
    completionPercent,
    thresholdPercent: READINESS_THRESHOLD_PERCENT,
    isThresholdReached: completionPercent >= READINESS_THRESHOLD_PERCENT,
    missingRequiredCount,
    missingItems,
    items,
  };
}

export async function isWorkspaceBootstrapped(workspaceId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("workspace_id", workspaceId)
    .limit(1);

  if (error) return false;
  return (data?.length ?? 0) > 0;
}
