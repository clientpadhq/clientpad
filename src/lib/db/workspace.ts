import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/db/activity";
import type { Role, Workspace, WorkspaceBrandingSettings } from "@/types/database";
import type { Role, Workspace, WorkspaceOnboardingState } from "@/types/database";

type WorkspaceMembership = {
  role: Role;
  created_at: string;
  workspace: Workspace;
};

function chooseFallbackMembership(memberships: WorkspaceMembership[]) {
  const ownerMembership = memberships.find((membership) => membership.role === "owner");
  return ownerMembership ?? memberships[0] ?? null;
}

export async function getWorkspacesForUser(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, created_at, workspace:workspaces(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data ?? [])
    .filter((row) => row.workspace)
    .map((row) => ({
      role: row.role as Role,
      created_at: row.created_at,
      workspace: row.workspace as unknown as Workspace,
    }));
}

export async function getWorkspaceForUser(userId: string) {
  const supabase = await createClient();

  const [memberships, profileResult] = await Promise.all([
    getWorkspacesForUser(userId),
    supabase.from("profiles").select("active_workspace_id").eq("id", userId).maybeSingle(),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (!memberships.length) return null;

  const activeWorkspaceId = profileResult.data?.active_workspace_id;
  const activeMembership = activeWorkspaceId
    ? memberships.find((membership) => membership.workspace.id === activeWorkspaceId)
    : undefined;

  const selectedMembership = activeMembership ?? chooseFallbackMembership(memberships);

  if (!selectedMembership) return null;

  if (activeWorkspaceId !== selectedMembership.workspace.id) {
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ active_workspace_id: selectedMembership.workspace.id })
      .eq("id", userId);

    if (profileError) throw profileError;
  }

  return {
    role: selectedMembership.role,
    workspace: selectedMembership.workspace,
  };
}

export async function setActiveWorkspaceForUser(userId: string, workspaceId: string) {
  const supabase = await createClient();

  const { data: membership, error: membershipError } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", userId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) throw new Error("You are not a member of the selected workspace.");

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ active_workspace_id: workspaceId })
    .eq("id", userId);

  if (profileError) throw profileError;
}

export async function getWorkspaceMembers(workspaceId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, user_id, profiles(full_name, phone)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

export async function getWorkspaceInvites(workspaceId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workspace_invites")
    .select("id, email, role, status, expires_at, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getWorkspaceById(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("workspaces").select("*").eq("id", workspaceId).single();

  if (error) throw error;
  return data as unknown as Workspace;
}

export async function getWorkspaceOnboardingState(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_onboarding_state")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw error;
  return (data as WorkspaceOnboardingState | null) ?? null;
}

export async function ensureWorkspaceOnboardingState(workspaceId: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("workspace_onboarding_state").upsert(
    {
      workspace_id: workspaceId,
      current_step: "business_profile",
      started_at: now,
      updated_at: now,
    },
    { onConflict: "workspace_id" },
  );
  if (error) throw error;
}

export function isWorkspaceOnboardingRequired(role: Role, state: WorkspaceOnboardingState | null) {
  if (role !== "owner" && role !== "admin") return false;
  if (!state) return true;
  return !(state.business_profile_completed && state.branding_payment_completed && state.preset_selected);
}

export async function getWorkspaceBrandingSettings(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_branding_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw error;
  return data as WorkspaceBrandingSettings | null;
}

export async function acceptPendingInvites(userId: string, userEmail?: string | null) {
  const normalizedEmail = String(userEmail ?? "").trim().toLowerCase();
  if (!normalizedEmail) return;

  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: expiredInvites, error: expireLookupError } = await supabase
    .from("workspace_invites")
    .select("id, workspace_id")
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .lte("expires_at", nowIso);
  if (expireLookupError) throw expireLookupError;

  if ((expiredInvites ?? []).length > 0) {
    const expiredIds = expiredInvites!.map((invite) => invite.id);

    const { error: expireUpdateError } = await supabase
      .from("workspace_invites")
      .update({ status: "expired", updated_at: nowIso })
      .in("id", expiredIds)
      .eq("status", "pending");
    if (expireUpdateError) throw expireUpdateError;

    await Promise.all(
      expiredInvites!.map((invite) =>
        logActivity({
          workspaceId: invite.workspace_id,
          actorUserId: userId,
          entityType: "workspace",
          entityId: invite.id,
          type: "invite.expired",
          description: "Workspace invite expired before acceptance",
        }),
      ),
    );
  }

  const { data: pendingInvites, error: pendingError } = await supabase
    .from("workspace_invites")
    .select("id, workspace_id, role")
    .eq("email", normalizedEmail)
    .eq("status", "pending")
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`);
  if (pendingError) throw pendingError;

  for (const invite of pendingInvites ?? []) {
    const { error: membershipError } = await supabase.from("workspace_members").upsert(
      {
        workspace_id: invite.workspace_id,
        user_id: userId,
        role: invite.role,
      },
      { onConflict: "workspace_id,user_id" },
    );
    if (membershipError) throw membershipError;

    const { error: inviteUpdateError } = await supabase
      .from("workspace_invites")
      .update({ status: "accepted", accepted_by: userId, updated_at: nowIso })
      .eq("id", invite.id)
      .eq("status", "pending")
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`);
    if (inviteUpdateError) throw inviteUpdateError;

    await logActivity({
      workspaceId: invite.workspace_id,
      actorUserId: userId,
      entityType: "workspace",
      entityId: invite.id,
      type: "invite.accepted",
      description: "Workspace invite accepted",
    });
  }
}
