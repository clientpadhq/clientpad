import { createClient } from "@/lib/supabase/server";

export type ReportDataStatus = "ok" | "partial" | "failed";

export type ReportingSnapshot = {
  leadsCreated: number;
  dealsCreated: number;
  leadToDealConversion: number;
  convertedLeads: number;
  quotesSent: number;
  quotesAccepted: number;
  totalInvoiced: number;
  totalPaid: number;
  overdueInvoices: number;
  jobsCompletedOnTime: number;
  taskCompletionRate: number;
  reminderCompletionRate: number;
  dataStatus: ReportDataStatus;
  failedSources: string[];
  generatedAt: string;
};

type Range = "7d" | "30d" | "month";

type QueryResult<T> = {
  data: T[];
  failed: boolean;
};

function normalizeStatus(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function getQueryData<T>(
  label: string,
  query: { data: T[] | null; error: { message: string } | null },
  failedSources: string[],
): QueryResult<T> {
  if (query.error) {
    failedSources.push(`${label}: ${query.error.message}`);
    return { data: [], failed: true };
  }

  return { data: query.data ?? [], failed: false };
}

function resolveStartDate(now: Date, range: Range) {
  const start = new Date(now);
  if (range === "7d") start.setDate(now.getDate() - 7);
  else if (range === "30d") start.setDate(now.getDate() - 30);
  else {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  }
  return start;
}

export async function getReportingSnapshot(workspaceId: string, range: Range): Promise<ReportingSnapshot> {
  const supabase = await createClient();
  const now = new Date();
  const start = resolveStartDate(now, range);
  const since = start.toISOString();
  const failedSources: string[] = [];

  const [leadsQuery, dealsQuery, quotesQuery, invoicesQuery, jobsQuery, tasksQuery, remindersQuery] = await Promise.all([
    supabase.from("leads").select("id").eq("workspace_id", workspaceId).gte("created_at", since),
    supabase.from("deals").select("id,lead_id,created_at").eq("workspace_id", workspaceId).gte("created_at", since),
    supabase.from("quotes").select("id,status").eq("workspace_id", workspaceId).gte("created_at", since),
    supabase
      .from("invoices")
      .select("id,status,total_amount,paid_amount,balance_amount,due_date")
      .eq("workspace_id", workspaceId)
      .gte("created_at", since),
    supabase.from("jobs").select("id,status,due_date,updated_at").eq("workspace_id", workspaceId).gte("created_at", since),
    supabase.from("tasks").select("id,status").eq("workspace_id", workspaceId).gte("created_at", since),
    supabase.from("reminders").select("id,status").eq("workspace_id", workspaceId).gte("created_at", since),
  ]);

  const leads = getQueryData<{ id: string }>("leads", leadsQuery, failedSources);
  const deals = getQueryData<{ id: string; lead_id: string | null; created_at: string }>("deals", dealsQuery, failedSources);
  const quotes = getQueryData<{ id: string; status: string | null }>("quotes", quotesQuery, failedSources);
  const invoices = getQueryData<{
    id: string;
    status: string | null;
    total_amount: number | string | null;
    paid_amount: number | string | null;
    balance_amount: number | string | null;
    due_date: string | null;
  }>("invoices", invoicesQuery, failedSources);
  const jobs = getQueryData<{ id: string; status: string | null; due_date: string | null; updated_at: string | null }>(
    "jobs",
    jobsQuery,
    failedSources,
  );
  const tasks = getQueryData<{ id: string; status: string | null }>("tasks", tasksQuery, failedSources);
  const reminders = getQueryData<{ id: string; status: string | null }>("reminders", remindersQuery, failedSources);

  let convertedLeads = 0;
  if (!leads.failed) {
    const cohortLeadIds = leads.data.map((lead) => lead.id);
    if (cohortLeadIds.length > 0) {
      const conversionsQuery = await supabase
        .from("deals")
        .select("lead_id")
        .eq("workspace_id", workspaceId)
        .in("lead_id", cohortLeadIds)
        .lte("created_at", now.toISOString());

      const conversions = getQueryData<{ lead_id: string | null }>("lead_deal_conversions", conversionsQuery, failedSources);
      convertedLeads = new Set(conversions.data.map((row) => row.lead_id).filter(Boolean)).size;
    }
  }

  const leadsCreated = leads.data.length;
  const dealsCreated = deals.data.length;
  const leadToDealConversion = leadsCreated > 0 ? Math.round((convertedLeads / leadsCreated) * 100) : 0;

  const completedTasks = tasks.data.filter((task) => normalizeStatus(task.status) === "done").length;
  const completedReminders = reminders.data.filter((reminder) => normalizeStatus(reminder.status) === "done").length;

  const totalSources = 8;
  const dataStatus: ReportDataStatus =
    failedSources.length === 0 ? "ok" : failedSources.length >= totalSources ? "failed" : "partial";

  return {
    leadsCreated,
    dealsCreated,
    leadToDealConversion,
    convertedLeads,
    quotesSent: quotes.data.filter((quote) => {
      const status = normalizeStatus(quote.status);
      return status === "sent" || status === "accepted";
    }).length,
    quotesAccepted: quotes.data.filter((quote) => normalizeStatus(quote.status) === "accepted").length,
    totalInvoiced: invoices.data.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0),
    totalPaid: invoices.data.reduce((sum, invoice) => sum + Number(invoice.paid_amount || 0), 0),
    overdueInvoices: invoices.data.filter((invoice) => {
      const dueDate = invoice.due_date;
      return Boolean(dueDate && dueDate < now.toISOString().slice(0, 10) && Number(invoice.balance_amount || 0) > 0);
    }).length,
    jobsCompletedOnTime: jobs.data.filter((job) => {
      const status = normalizeStatus(job.status);
      return status === "completed" && (!job.due_date || (job.updated_at?.slice(0, 10) ?? "") <= job.due_date);
    }).length,
    taskCompletionRate: tasks.data.length > 0 ? Math.round((completedTasks / tasks.data.length) * 100) : 0,
    reminderCompletionRate: reminders.data.length > 0 ? Math.round((completedReminders / reminders.data.length) * 100) : 0,
    dataStatus,
    failedSources,
    generatedAt: now.toISOString(),
  };
}
