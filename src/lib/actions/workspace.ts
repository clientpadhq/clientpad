"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { logActivity } from "@/lib/db/activity";
import { generateInviteToken } from "@/lib/db/workspace";

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

  const { data: existing } = await supabase.from("workspace_members").select("workspace_id").eq("user_id", user.id).limit(1).maybeSingle();
  if (existing) redirect("/dashboard");

  const { data: workspace, error } = await supabase.from("workspaces").insert(payload).select("id").single();
  if (error || !workspace) redirect(`/onboarding?error=${encodeURIComponent(error?.message ?? "Could not create workspace")}`);

  const { error: memberError } = await supabase.from("workspace_members").insert({ workspace_id: workspace.id, user_id: user.id, role: "owner" });
  if (memberError) redirect(`/onboarding?error=${encodeURIComponent(memberError.message)}`);

  await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: "workspace", entityId: workspace.id, type: "workspace.created", description: "Workspace created" });
  redirect("/dashboard");
}

export async function updateWorkspaceAction(formData: FormData) {
  const { workspace, user } = await requireWorkspace("admin");
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

  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);

  await supabase.from("activities").insert({
    workspace_id: workspace.id,
    actor_user_id: user.id,
    entity_type: "workspace",
    entity_id: workspace.id,
    activity_type: "workspace.settings.updated",
    description: "Workspace settings updated",
  });

  redirect("/settings?success=Workspace updated");
}

export async function inviteMemberAction(formData: FormData) {
  const { workspace, user } = await requireWorkspace("admin");
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "staff");

  if (!email) redirect("/settings?error=Invite email is required");

  const { error } = await supabase.from("workspace_invites").upsert({
    workspace_id: workspace.id,
    email,
    role,
    invited_by: user.id,
    token: generateInviteToken(),
    status: "pending",
    expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);

  await supabase.from("activities").insert({
    workspace_id: workspace.id,
    actor_user_id: user.id,
    entity_type: "workspace",
    entity_id: workspace.id,
    activity_type: "member.invite.sent",
    description: `Invite sent to ${email}`,
    metadata: { role },
  });

  redirect("/settings?success=Invite recorded. User is added automatically after signup/sign-in with invited email.");
}

export async function updateMemberRoleAction(formData: FormData) {
  const { workspace, user } = await requireWorkspace("admin");
  const supabase = await createClient();

  const memberUserId = String(formData.get("member_user_id") ?? "");
  const role = String(formData.get("role") ?? "staff");

  if (!memberUserId) redirect("/settings?error=Member user id missing");

  const { data: target } = await supabase
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspace.id)
    .eq("user_id", memberUserId)
    .single();

  if (target?.role === "owner" && role !== "owner") {
    redirect("/settings?error=Owner role cannot be downgraded from this screen");
  }

  const { error } = await supabase
    .from("workspace_members")
    .update({ role })
    .eq("workspace_id", workspace.id)
    .eq("user_id", memberUserId);

  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);

  await supabase.from("activities").insert({
    workspace_id: workspace.id,
    actor_user_id: user.id,
    entity_type: "workspace",
    entity_id: workspace.id,
    activity_type: "member.role.changed",
    description: "Member role updated",
    metadata: { member_user_id: memberUserId, role },
  });

  redirect("/settings?success=Member role updated");
}

export async function revokeInviteAction(formData: FormData) {
  const { workspace, user } = await requireWorkspace("admin");
  const supabase = await createClient();
  const inviteId = String(formData.get("invite_id") ?? "");

  const { error } = await supabase
    .from("workspace_invites")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("workspace_id", workspace.id)
    .eq("id", inviteId);

  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);

  await supabase.from("activities").insert({
    workspace_id: workspace.id,
    actor_user_id: user.id,
    entity_type: "workspace",
    entity_id: workspace.id,
    activity_type: "member.invite.revoked",
    description: "Member invite revoked",
    metadata: { invite_id: inviteId },
  });

  redirect("/settings?success=Invite revoked");
}
