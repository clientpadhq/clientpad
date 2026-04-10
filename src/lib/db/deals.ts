import { createClient } from "@/lib/supabase/server";
import type { Deal, PipelineStage } from "@/types/database";

export async function listDeals(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*, stage:pipeline_stages(id,name,position), lead:leads(id,name), client:clients(id,business_name)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function getDeal(workspaceId: string, dealId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select("*, stage:pipeline_stages(id,name,position), lead:leads(id,name), client:clients(id,business_name)")
    .eq("workspace_id", workspaceId)
    .eq("id", dealId)
    .single();

  if (error) throw error;
  return data;
}

export async function listPipelineStages(workspaceId: string, options?: { includeInactive?: boolean }) {
  const supabase = await createClient();
  let query = supabase.from("pipeline_stages").select("*").eq("workspace_id", workspaceId);

  if (!options?.includeInactive) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query.order("position", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PipelineStage[];
}

export function activeDealsAndValue(deals: Deal[]) {
  const active = deals.filter((d) => d.amount >= 0);
  return {
    activeDealsCount: active.length,
    pipelineValue: active.reduce((sum, d) => sum + Number(d.amount || 0), 0),
  };
}
