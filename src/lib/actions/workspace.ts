"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { logActivity } from "@/lib/db/activity";

export async function createWorkspaceAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim() || null,
    business_type: String(formData.get("business_type") ?? "").trim() || null,
    default_currency: "NGN",
    created_by: user.id,
  };

  const { data: existing } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existing) redirect("/dashboard");

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert(payload)
    .select("id")
    .single();

  if (error || !workspace) {
    redirect(`/onboarding?error=${encodeURIComponent(error?.message ?? "Could not create workspace")}`);
  }

  const { error: memberError } = await supabase.from("workspace_members").insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    redirect(`/onboarding?error=${encodeURIComponent(memberError.message)}`);
  }

  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "workspace",
    entityId: workspace.id,
    type: "workspace.created",
    description: "Workspace created",
  });

  redirect("/dashboard");
}

export async function updateWorkspaceAction(formData: FormData) {
  const { workspace } = await requireWorkspace("admin");
  const supabase = await createClient();

  const { error } = await supabase
    .from("workspaces")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim() || null,
      business_type: String(formData.get("business_type") ?? "").trim() || null,
      default_currency: "NGN",
      updated_at: new Date().toISOString(),
    })
    .eq("id", workspace.id);

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/settings?success=Workspace updated");
}
