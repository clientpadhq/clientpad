import { createClient } from "@/lib/supabase/server";

export async function getDashboardStats(workspaceId: string) {
  const supabase = await createClient();

  const [leadsCount, dealsData, activitiesData] = await Promise.all([
    supabase.from("leads").select("id", { count: "exact", head: true }).eq("workspace_id", workspaceId),
    supabase
      .from("deals")
      .select("id, amount, stage:pipeline_stages(name,is_closed)")
      .eq("workspace_id", workspaceId),
    supabase
      .from("activities")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (leadsCount.error) throw leadsCount.error;
  if (dealsData.error) throw dealsData.error;
  if (activitiesData.error) throw activitiesData.error;

  const deals = (dealsData.data ?? []) as Array<{ amount: number | null; stage: Array<{ is_closed: boolean }> | null }>;
  const activeDeals = deals.filter((deal) => !(deal.stage?.[0]?.is_closed ?? false));

  return {
    totalLeads: leadsCount.count ?? 0,
    activeDeals: activeDeals.length,
    pipelineValue: activeDeals.reduce((sum, item) => sum + Number(item.amount || 0), 0),
    recentActivity: activitiesData.data ?? [],
  };
}
