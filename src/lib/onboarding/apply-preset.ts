import type { SupabaseClient } from "@supabase/supabase-js";
import { logActivity } from "@/lib/db/activity";
import type { WorkspacePreset } from "@/lib/onboarding/presets";

export async function applyPresetToWorkspace(params: {
  supabase: SupabaseClient;
  workspaceId: string;
  actorUserId: string;
  preset: WorkspacePreset;
  source: "onboarding" | "settings";
}) {
  const { supabase, workspaceId, actorUserId, preset, source } = params;

  const { count: dealsCount, error: dealsError } = await supabase
    .from("deals")
    .select("id", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);
  if (dealsError) throw dealsError;

  const hasDeals = (dealsCount ?? 0) > 0;

  if (!hasDeals) {
    const { error: deleteStagesError } = await supabase.from("pipeline_stages").delete().eq("workspace_id", workspaceId);
    if (deleteStagesError) throw deleteStagesError;

    const { error: insertStagesError } = await supabase.from("pipeline_stages").insert(
      preset.pipelineStages.map((stage, index) => ({
        workspace_id: workspaceId,
        name: stage.name,
        position: index + 1,
        is_closed: Boolean(stage.isClosed),
      })),
    );
    if (insertStagesError) throw insertStagesError;
  } else {
    const { data: existingStages, error: existingStagesError } = await supabase
      .from("pipeline_stages")
      .select("name, position")
      .eq("workspace_id", workspaceId)
      .order("position", { ascending: true });
    if (existingStagesError) throw existingStagesError;

    const existingByName = new Set((existingStages ?? []).map((stage) => stage.name.trim().toLowerCase()));
    const maxPosition = (existingStages ?? []).reduce((max, stage) => Math.max(max, stage.position ?? 0), 0);
    const newRows = preset.pipelineStages
      .filter((stage) => !existingByName.has(stage.name.trim().toLowerCase()))
      .map((stage, index) => ({
        workspace_id: workspaceId,
        name: stage.name,
        position: maxPosition + index + 1,
        is_closed: Boolean(stage.isClosed),
      }));

    if (newRows.length > 0) {
      const { error: insertStagesError } = await supabase.from("pipeline_stages").insert(newRows);
      if (insertStagesError) throw insertStagesError;
    }
  }

  const { error: paymentSettingsError } = await supabase.from("workspace_payment_settings").upsert({
    workspace_id: workspaceId,
    quote_default_terms: preset.quoteDefaultTerms,
    invoice_default_terms: preset.invoiceDefaultTerms,
    task_placeholders: preset.taskPlaceholders,
    reminder_placeholders: preset.reminderPlaceholders,
    preset_key: preset.id,
    preset_applied_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (paymentSettingsError) throw paymentSettingsError;

  await logActivity({
    workspaceId,
    actorUserId,
    entityType: "workspace",
    entityId: workspaceId,
    type: "preset.applied",
    description: `Workspace preset applied: ${preset.label}`,
    metadata: {
      preset_id: preset.id,
      source,
      has_existing_deals: hasDeals,
    },
  });
}
