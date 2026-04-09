import { createClient } from "@/lib/supabase/server";

export async function getWorkspaceAISettings(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_ai_settings")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listAIGenerations(workspaceId: string, entityType?: string, entityId?: string) {
  const supabase = await createClient();
  let query = supabase.from("ai_generations").select("*").eq("workspace_id", workspaceId).order("created_at", { ascending: false }).limit(50);
  if (entityType) query = query.eq("entity_type", entityType);
  if (entityId) query = query.eq("entity_id", entityId);
  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}
