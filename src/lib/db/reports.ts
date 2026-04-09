import { createClient } from "@/lib/supabase/server";

export async function getReportingSnapshot(workspaceId: string, range: "7d" | "30d" | "month") {
  const supabase = await createClient();
  const now = new Date();
  const start = new Date();
  if (range === "7d") start.setDate(now.getDate() - 7);
  else if (range === "30d") start.setDate(now.getDate() - 30);
  else { start.setDate(1); start.setHours(0,0,0,0); }

  const since = start.toISOString();

  const [leads, deals, quotes, invoices, jobs, tasks, reminders] = await Promise.all([
    supabase.from("leads").select("id").eq("workspace_id", workspaceId).gte("created_at", since),
    supabase.from("deals").select("id,stage:pipeline_stages(name)").eq("workspace_id", workspaceId).gte("created_at", since),
    supabase.from("quotes").select("id,status").eq("workspace_id", workspaceId).gte("created_at", since),
    supabase.from("invoices").select("id,status,total_amount,paid_amount,balance_amount,due_date").eq("workspace_id", workspaceId).gte("created_at", since),
    supabase.from("jobs").select("id,status,due_date,updated_at").eq("workspace_id", workspaceId).gte("created_at", since),
    supabase.from("tasks").select("id,status").eq("workspace_id", workspaceId).gte("created_at", since),
    supabase.from("reminders").select("id,status").eq("workspace_id", workspaceId).gte("created_at", since),
  ]);

  const dealsData = deals.data ?? [];
  const quotesData = quotes.data ?? [];
  const invoicesData = invoices.data ?? [];
  const jobsData = jobs.data ?? [];
  const tasksData = tasks.data ?? [];
  const remindersData = reminders.data ?? [];

  return {
    leadsCreated: leads.data?.length ?? 0,
    dealsCreated: dealsData.length,
    leadToDealConversion: (leads.data?.length ?? 0) ? Math.round((dealsData.length / (leads.data?.length ?? 1)) * 100) : 0,
    quotesSent: quotesData.filter((q:any) => ["sent","accepted"].includes(q.status)).length,
    quotesAccepted: quotesData.filter((q:any) => q.status === "accepted").length,
    totalInvoiced: invoicesData.reduce((sum:any, i:any) => sum + Number(i.total_amount || 0), 0),
    totalPaid: invoicesData.reduce((sum:any, i:any) => sum + Number(i.paid_amount || 0), 0),
    overdueInvoices: invoicesData.filter((i:any) => i.due_date && i.due_date < now.toISOString().slice(0,10) && Number(i.balance_amount || 0) > 0).length,
    jobsCompletedOnTime: jobsData.filter((j:any) => j.status === "completed" && (!j.due_date || j.updated_at?.slice(0,10) <= j.due_date)).length,
    taskCompletionRate: tasksData.length ? Math.round((tasksData.filter((t:any)=>t.status==="done").length / tasksData.length) * 100) : 0,
    reminderCompletionRate: remindersData.length ? Math.round((remindersData.filter((r:any)=>r.status==="done").length / remindersData.length) * 100) : 0,
  };
}
