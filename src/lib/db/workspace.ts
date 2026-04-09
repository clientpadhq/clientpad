import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logActivity } from "@/lib/db/activity";
import type { Role, Workspace } from "@/types/database";

export async function getWorkspaceForUser(userId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("workspace_members")
    .select("role, workspace:workspaces(*)")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  if (!data || !data.workspace) return null;

  return {
    role: data.role as Role,
    workspace: data.workspace as Workspace,
  };
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
  const { data, error } = await supabase
    .from("workspaces")
    .select("*")
    .eq("id", workspaceId)
    .single();

  if (error) throw error;
  return data as Workspace;
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
