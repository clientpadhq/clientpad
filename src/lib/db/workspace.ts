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
    .select("id, email, role, status, created_at")
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
