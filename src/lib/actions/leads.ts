"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { logActivity } from "@/lib/db/activity";

export async function createLeadAction(formData: FormData) {
  const { workspace, user } = await requireWorkspace("staff");
  const supabase = await createClient();

  const payload = {
    workspace_id: workspace.id,
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    source: String(formData.get("source") ?? "").trim() || null,
    service_interest: String(formData.get("service_interest") ?? "").trim() || null,
    status: String(formData.get("status") ?? "new"),
    owner_user_id: (String(formData.get("owner_user_id") ?? "").trim() || user.id),
    next_follow_up_at: String(formData.get("next_follow_up_at") ?? "").trim() || null,
    urgency: String(formData.get("urgency") ?? "").trim() || null,
    budget_clue: String(formData.get("budget_clue") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  const { data, error } = await supabase.from("leads").insert(payload).select("id").single();

  if (error || !data) {
    redirect(`/leads/new?error=${encodeURIComponent(error?.message ?? "Unable to create lead")}`);
  }

  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "lead",
    entityId: data.id,
    type: "lead.created",
    description: `Lead created: ${payload.name}`,
  });

  redirect(`/leads/${data.id}`);
}

export async function updateLeadAction(leadId: string, formData: FormData) {
  const { workspace, user } = await requireWorkspace("staff");
  const supabase = await createClient();

  const updatePayload = {
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    source: String(formData.get("source") ?? "").trim() || null,
    service_interest: String(formData.get("service_interest") ?? "").trim() || null,
    status: String(formData.get("status") ?? "new"),
    owner_user_id: String(formData.get("owner_user_id") ?? "").trim() || null,
    next_follow_up_at: String(formData.get("next_follow_up_at") ?? "").trim() || null,
    urgency: String(formData.get("urgency") ?? "").trim() || null,
    budget_clue: String(formData.get("budget_clue") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("leads")
    .update(updatePayload)
    .eq("workspace_id", workspace.id)
    .eq("id", leadId);

  if (error) {
    redirect(`/leads/${leadId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "lead",
    entityId: leadId,
    type: "lead.updated",
    description: `Lead updated: ${updatePayload.name}`,
  });

  redirect(`/leads/${leadId}`);
}
