"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { logActivity } from "@/lib/db/activity";

export async function createDealAction(formData: FormData) {
  const { workspace, user } = await requireWorkspace("staff");
  const supabase = await createClient();

  const payload = {
    workspace_id: workspace.id,
    title: String(formData.get("title") ?? "").trim(),
    lead_id: String(formData.get("lead_id") ?? "").trim() || null,
    client_id: String(formData.get("client_id") ?? "").trim() || null,
    stage_id: String(formData.get("stage_id") ?? "").trim(),
    amount: Number(formData.get("amount") ?? 0),
    expected_close_date: String(formData.get("expected_close_date") ?? "").trim() || null,
    owner_user_id: String(formData.get("owner_user_id") ?? "").trim() || user.id,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  const { data: stage, error: stageError } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("id", payload.stage_id)
    .eq("is_active", true)
    .maybeSingle();

  if (stageError || !stage) {
    redirect(`/deals/new?error=${encodeURIComponent(stageError?.message ?? "Select an active pipeline stage")}`);
  }

  const { data, error } = await supabase.from("deals").insert(payload).select("id").single();

  if (error || !data) {
    redirect(`/deals/new?error=${encodeURIComponent(error?.message ?? "Unable to create deal")}`);
  }

  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "deal",
    entityId: data.id,
    type: "deal.created",
    description: `Deal created: ${payload.title}`,
  });

  redirect(`/deals/${data.id}`);
}

export async function updateDealAction(dealId: string, formData: FormData) {
  const { workspace, user } = await requireWorkspace("staff");
  const supabase = await createClient();

  const stageId = String(formData.get("stage_id") ?? "").trim();

  const { data: currentDeal } = await supabase
    .from("deals")
    .select("stage_id")
    .eq("workspace_id", workspace.id)
    .eq("id", dealId)
    .single();

  const { data: stage, error: stageError } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("workspace_id", workspace.id)
    .eq("id", stageId)
    .eq("is_active", true)
    .maybeSingle();

  if (stageError || !stage) {
    redirect(`/deals/${dealId}/edit?error=${encodeURIComponent(stageError?.message ?? "Select an active pipeline stage")}`);
  }

  const updatePayload = {
    title: String(formData.get("title") ?? "").trim(),
    lead_id: String(formData.get("lead_id") ?? "").trim() || null,
    client_id: String(formData.get("client_id") ?? "").trim() || null,
    stage_id: stageId,
    amount: Number(formData.get("amount") ?? 0),
    expected_close_date: String(formData.get("expected_close_date") ?? "").trim() || null,
    owner_user_id: String(formData.get("owner_user_id") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("deals")
    .update(updatePayload)
    .eq("workspace_id", workspace.id)
    .eq("id", dealId);

  if (error) {
    redirect(`/deals/${dealId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "deal",
    entityId: dealId,
    type: "deal.updated",
    description: `Deal updated: ${updatePayload.title}`,
  });

  if (currentDeal?.stage_id !== stageId) {
    await logActivity({
      workspaceId: workspace.id,
      actorUserId: user.id,
      entityType: "deal",
      entityId: dealId,
      type: "deal.stage_changed",
      description: "Deal stage changed",
      metadata: {
        from: currentDeal?.stage_id,
        to: stageId,
      },
    });
  }

  redirect(`/deals/${dealId}`);
}
