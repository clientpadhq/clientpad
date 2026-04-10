"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/db/activity";
import { requireWorkspace } from "@/lib/rbac/permissions";

function sanitizeColor(value: FormDataEntryValue | null) {
  const color = String(value ?? "").trim();
  if (!color) return null;
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : null;
}

export async function createPipelineStageAction(formData: FormData) {
  const { workspace, user } = await requireWorkspace("admin");
  const supabase = await createClient();

  const name = String(formData.get("name") ?? "").trim();
  const color = sanitizeColor(formData.get("color"));

  if (!name) redirect("/settings?error=Stage name is required");

  const { data: maxStage } = await supabase
    .from("pipeline_stages")
    .select("position")
    .eq("workspace_id", workspace.id)
    .eq("is_active", true)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const position = (maxStage?.position ?? 0) + 1;

  const { data: stage, error } = await supabase
    .from("pipeline_stages")
    .insert({
      workspace_id: workspace.id,
      name,
      position,
      color,
      is_active: true,
      is_closed: false,
    })
    .select("id, name")
    .single();

  if (error || !stage) {
    redirect(`/settings?error=${encodeURIComponent(error?.message ?? "Unable to create stage")}`);
  }

  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "pipeline_stage",
    entityId: stage.id,
    type: "pipeline_stage.created",
    description: `Pipeline stage created: ${stage.name}`,
  });

  redirect("/settings?success=Pipeline stage created");
}

export async function updatePipelineStageAction(formData: FormData) {
  const { workspace, user } = await requireWorkspace("admin");
  const supabase = await createClient();

  const stageId = String(formData.get("stage_id") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const color = sanitizeColor(formData.get("color"));

  if (!stageId) redirect("/settings?error=Stage is required");
  if (!name) redirect("/settings?error=Stage name is required");

  const { data: stage, error: stageError } = await supabase
    .from("pipeline_stages")
    .select("id, name")
    .eq("workspace_id", workspace.id)
    .eq("id", stageId)
    .maybeSingle();

  if (stageError) redirect(`/settings?error=${encodeURIComponent(stageError.message)}`);
  if (!stage) redirect("/settings?error=Stage not found");

  const { error } = await supabase
    .from("pipeline_stages")
    .update({ name, color })
    .eq("workspace_id", workspace.id)
    .eq("id", stageId);

  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);

  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "pipeline_stage",
    entityId: stageId,
    type: "pipeline_stage.updated",
    description: `Pipeline stage updated: ${name}`,
    metadata: { previous_name: stage.name, name, color },
  });

  redirect("/settings?success=Pipeline stage updated");
}

export async function movePipelineStageAction(formData: FormData) {
  const { workspace, user } = await requireWorkspace("admin");
  const supabase = await createClient();

  const stageId = String(formData.get("stage_id") ?? "").trim();
  const direction = String(formData.get("direction") ?? "").trim();

  if (!stageId) redirect("/settings?error=Stage is required");
  if (direction !== "up" && direction !== "down") redirect("/settings?error=Invalid move direction");

  const { data: stages, error: stagesError } = await supabase
    .from("pipeline_stages")
    .select("id, name, position")
    .eq("workspace_id", workspace.id)
    .eq("is_active", true)
    .order("position", { ascending: true });

  if (stagesError) redirect(`/settings?error=${encodeURIComponent(stagesError.message)}`);

  const idx = (stages ?? []).findIndex((stage) => stage.id === stageId);
  if (idx === -1) redirect("/settings?error=Stage not found");

  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= (stages ?? []).length) {
    redirect("/settings?success=Stage order unchanged");
  }

  const current = stages![idx];
  const target = stages![targetIdx];

  const { error: tempError } = await supabase
    .from("pipeline_stages")
    .update({ position: -1 })
    .eq("workspace_id", workspace.id)
    .eq("id", current.id);
  if (tempError) redirect(`/settings?error=${encodeURIComponent(tempError.message)}`);

  const { error: targetError } = await supabase
    .from("pipeline_stages")
    .update({ position: current.position })
    .eq("workspace_id", workspace.id)
    .eq("id", target.id);
  if (targetError) redirect(`/settings?error=${encodeURIComponent(targetError.message)}`);

  const { error: finalError } = await supabase
    .from("pipeline_stages")
    .update({ position: target.position })
    .eq("workspace_id", workspace.id)
    .eq("id", current.id);
  if (finalError) redirect(`/settings?error=${encodeURIComponent(finalError.message)}`);

  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "pipeline_stage",
    entityId: current.id,
    type: "pipeline_stage.updated",
    description: `Pipeline stage reordered: ${current.name}`,
    metadata: {
      direction,
      from_position: current.position,
      to_position: target.position,
      swapped_with_stage_id: target.id,
    },
  });

  redirect("/settings?success=Pipeline stage reordered");
}

export async function togglePipelineStageActiveAction(formData: FormData) {
  const { workspace, user } = await requireWorkspace("admin");
  const supabase = await createClient();

  const stageId = String(formData.get("stage_id") ?? "").trim();
  const archived = String(formData.get("archived") ?? "false").trim() === "true";

  if (!stageId) redirect("/settings?error=Stage is required");

  const { data: stage, error: stageError } = await supabase
    .from("pipeline_stages")
    .select("id, name, is_active")
    .eq("workspace_id", workspace.id)
    .eq("id", stageId)
    .maybeSingle();

  if (stageError) redirect(`/settings?error=${encodeURIComponent(stageError.message)}`);
  if (!stage) redirect("/settings?error=Stage not found");

  const nextIsActive = !archived;
  if (stage.is_active === nextIsActive) redirect("/settings?success=Pipeline stage unchanged");

  const { error } = await supabase
    .from("pipeline_stages")
    .update({ is_active: nextIsActive })
    .eq("workspace_id", workspace.id)
    .eq("id", stageId);

  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);

  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "pipeline_stage",
    entityId: stageId,
    type: archived ? "pipeline_stage.archived" : "pipeline_stage.updated",
    description: archived ? `Pipeline stage archived: ${stage.name}` : `Pipeline stage restored: ${stage.name}`,
    metadata: { is_active: nextIsActive },
  });

  redirect(archived ? "/settings?success=Pipeline stage archived" : "/settings?success=Pipeline stage restored");
}
