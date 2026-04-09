"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { canAssignRole, requireWorkspace } from "@/lib/rbac/permissions";
import { logActivity } from "@/lib/db/activity";
import type { Role } from "@/types/database";

function parseRole(value: FormDataEntryValue | null): Role {
  const role = String(value ?? "staff").trim() as Role;
  if (role !== "owner" && role !== "admin" && role !== "staff") {
    return "staff";
  }
  return role;
}

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

export async function inviteMemberAction(formData: FormData) {
  const { workspace, user, role } = await requireWorkspace("admin");
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const inviteRole = parseRole(formData.get("role"));

  if (!email) redirect("/settings?error=Email is required");
  if (!canAssignRole(role, inviteRole)) {
    redirect("/settings?error=Only owners can invite users as owner");
  }

  const { error } = await supabase.from("workspace_invites").insert({
    workspace_id: workspace.id,
    email,
    role: inviteRole,
    status: "pending",
    invited_by: user.id,
    token: randomUUID(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/settings?success=Invite created");
}

export async function revokeInviteAction(formData: FormData) {
  const { workspace, role } = await requireWorkspace("admin");
  const supabase = await createClient();

  const inviteId = String(formData.get("invite_id") ?? "").trim();
  if (!inviteId) redirect("/settings?error=Invite is required");

  const { data: invite, error: inviteError } = await supabase
    .from("workspace_invites")
    .select("id, role, status")
    .eq("workspace_id", workspace.id)
    .eq("id", inviteId)
    .maybeSingle();

  if (inviteError) redirect(`/settings?error=${encodeURIComponent(inviteError.message)}`);
  if (!invite) redirect("/settings?error=Invite not found");
  if (invite.role === "owner" && role !== "owner") {
    redirect("/settings?error=Only owners can revoke owner invites");
  }

  const { error } = await supabase
    .from("workspace_invites")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("workspace_id", workspace.id)
    .eq("id", inviteId)
    .eq("status", "pending");

  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);

  redirect("/settings?success=Invite revoked");
}

export async function updateMemberRoleAction(formData: FormData) {
  const { workspace, user, role } = await requireWorkspace("admin");
  const supabase = await createClient();

  const memberUserId = String(formData.get("member_user_id") ?? "").trim();
  const nextRole = parseRole(formData.get("role"));

  if (!memberUserId) redirect("/settings?error=Member is required");
  if (!canAssignRole(role, nextRole)) {
    redirect("/settings?error=Only owners can promote members to owner");
  }

  const { data: member, error: memberError } = await supabase
    .from("workspace_members")
    .select("user_id, role")
    .eq("workspace_id", workspace.id)
    .eq("user_id", memberUserId)
    .maybeSingle();

  if (memberError) redirect(`/settings?error=${encodeURIComponent(memberError.message)}`);
  if (!member) redirect("/settings?error=Member not found");

  if (role === "admin" && member.role === "owner") {
    redirect("/settings?error=Admins cannot update owner roles");
  }

  if (member.role === "owner" && nextRole !== "owner") {
    if (role !== "owner") redirect("/settings?error=Only owners can demote an owner");
    if (member.user_id === user.id) {
      redirect("/settings?error=Use transfer ownership to hand over owner access");
    }

    const { count, error: ownerCountError } = await supabase
      .from("workspace_members")
      .select("user_id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("role", "owner");

    if (ownerCountError) redirect(`/settings?error=${encodeURIComponent(ownerCountError.message)}`);
    if ((count ?? 0) <= 1) {
      redirect("/settings?error=Workspace must keep at least one owner");
    }
  }

  const { error } = await supabase
    .from("workspace_members")
    .update({ role: nextRole })
    .eq("workspace_id", workspace.id)
    .eq("user_id", memberUserId);

  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);

  redirect("/settings?success=Member role updated");
}

export async function transferOwnershipAction(formData: FormData) {
  const { workspace, user } = await requireWorkspace("owner");
  const supabase = await createClient();

  const newOwnerUserId = String(formData.get("new_owner_user_id") ?? "").trim();
  if (!newOwnerUserId) redirect("/settings?error=Select a member to transfer ownership");
  if (newOwnerUserId === user.id) redirect("/settings?error=You are already the owner");

  const { data: member, error: memberError } = await supabase
    .from("workspace_members")
    .select("user_id, role")
    .eq("workspace_id", workspace.id)
    .eq("user_id", newOwnerUserId)
    .maybeSingle();

  if (memberError) redirect(`/settings?error=${encodeURIComponent(memberError.message)}`);
  if (!member) redirect("/settings?error=Selected member is not in this workspace");

  const { error: promoteError } = await supabase
    .from("workspace_members")
    .update({ role: "owner" })
    .eq("workspace_id", workspace.id)
    .eq("user_id", newOwnerUserId);
  if (promoteError) redirect(`/settings?error=${encodeURIComponent(promoteError.message)}`);

  const { error: demoteError } = await supabase
    .from("workspace_members")
    .update({ role: "admin" })
    .eq("workspace_id", workspace.id)
    .eq("user_id", user.id);

  if (demoteError) redirect(`/settings?error=${encodeURIComponent(demoteError.message)}`);

  redirect("/settings?success=Ownership transferred");
}
