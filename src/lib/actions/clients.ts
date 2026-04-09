"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { logActivity } from "@/lib/db/activity";

export async function createClientAction(formData: FormData) {
  const { workspace, user } = await requireWorkspace("staff");
  const supabase = await createClient();

  const payload = {
    workspace_id: workspace.id,
    business_name: String(formData.get("business_name") ?? "").trim(),
    primary_contact: String(formData.get("primary_contact") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };

  const { data, error } = await supabase.from("clients").insert(payload).select("id").single();

  if (error || !data) {
    redirect(`/clients/new?error=${encodeURIComponent(error?.message ?? "Unable to create client")}`);
  }

  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "client",
    entityId: data.id,
    type: "client.created",
    description: `Client created: ${payload.business_name}`,
  });

  redirect(`/clients/${data.id}`);
}

export async function updateClientAction(clientId: string, formData: FormData) {
  const { workspace, user } = await requireWorkspace("staff");
  const supabase = await createClient();

  const updatePayload = {
    business_name: String(formData.get("business_name") ?? "").trim(),
    primary_contact: String(formData.get("primary_contact") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    email: String(formData.get("email") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("clients")
    .update(updatePayload)
    .eq("workspace_id", workspace.id)
    .eq("id", clientId);

  if (error) {
    redirect(`/clients/${clientId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "client",
    entityId: clientId,
    type: "client.updated",
    description: `Client updated: ${updatePayload.business_name}`,
  });

  redirect(`/clients/${clientId}`);
}
