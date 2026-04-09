import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
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

  return { role: data.role as Role, workspace: data.workspace as Workspace };
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
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getWorkspaceById(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("workspaces").select("*").eq("id", workspaceId).single();
  if (error) throw error;
  return data as Workspace;
}

export async function acceptPendingInvites(userId: string, email?: string | null) {
  if (!email) return;
  const supabase = await createClient();

  const { data: invites } = await supabase
    .from("workspace_invites")
    .select("id, workspace_id, role")
    .eq("email", email.toLowerCase())
    .eq("status", "pending");

  for (const invite of invites ?? []) {
    await supabase.from("workspace_members").upsert({ workspace_id: invite.workspace_id, user_id: userId, role: invite.role });
    await supabase.from("workspace_invites").update({ status: "accepted", accepted_by: userId }).eq("id", invite.id);
    await supabase.from("activities").insert({
      workspace_id: invite.workspace_id,
      actor_user_id: userId,
      entity_type: "workspace",
      entity_id: invite.workspace_id,
      activity_type: "member.invite.accepted",
      description: "Workspace invite accepted",
      metadata: { invite_id: invite.id },
    });
  }
}

export function generateInviteToken() {
  return randomUUID();
}
