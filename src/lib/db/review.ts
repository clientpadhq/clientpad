import { createClient } from "@/lib/supabase/server";

const DAY_MS = 24 * 60 * 60 * 1000;

export const STALLED_DEAL_DAYS = 14;
export const DUE_SOON_JOB_DAYS = 3;

function startOfWindow(days: number) {
  return new Date(Date.now() - days * DAY_MS).toISOString();
}

function asNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function isOverdue(dateValue: string | null | undefined, nowDate: string) {
  return Boolean(dateValue && dateValue < nowDate);
}

export type InvoiceAgingBand = {
  key: "current" | "overdue_1_7" | "overdue_8_30" | "overdue_30_plus";
  label: string;
  count: number;
  balance: number;
};

export async function getWeeklyReviewSnapshot(workspaceId: string) {
  const supabase = await createClient();
  const since = startOfWindow(7);
  const now = new Date();
  const nowDate = now.toISOString().slice(0, 10);

  const [
    leadsQuery,
    dealsQuery,
    quotesQuery,
    invoicesQuery,
    jobsQuery,
    tasksQuery,
    remindersQuery,
    stalledDealsQuery,
    staleJobsQuery,
    overdueTasksQuery,
  ] = await Promise.all([
    supabase.from("leads").select("id").eq("workspace_id", workspaceId).gte("created_at", since),
    supabase.from("deals").select("id,lead_id").eq("workspace_id", workspaceId).gte("created_at", since),
    supabase.from("quotes").select("id,status").eq("workspace_id", workspaceId).gte("created_at", since),
    supabase
      .from("invoices")
      .select("id,invoice_number,status,due_date,balance_amount,paid_amount,total_amount,client_id")
      .eq("workspace_id", workspaceId),
    supabase.from("jobs").select("id,title,status,due_date,assignee_user_id,updated_at").eq("workspace_id", workspaceId),
    supabase.from("tasks").select("id,status,due_at,assignee_user_id").eq("workspace_id", workspaceId).gte("created_at", since),
    supabase.from("reminders").select("id,status").eq("workspace_id", workspaceId).gte("created_at", since),
    supabase
      .from("deals")
      .select("id,title,updated_at,owner_user_id,stage:pipeline_stages(name,is_closed)")
      .eq("workspace_id", workspaceId)
      .lt("updated_at", startOfWindow(STALLED_DEAL_DAYS))
      .order("updated_at", { ascending: true })
      .limit(12),
    supabase
      .from("jobs")
      .select("id,title,status,due_date,assignee_user_id")
      .eq("workspace_id", workspaceId)
      .or(`due_date.lt.${nowDate},and(due_date.gte.${nowDate},due_date.lte.${new Date(Date.now() + DUE_SOON_JOB_DAYS * DAY_MS).toISOString().slice(0, 10)})`),
    supabase
      .from("tasks")
      .select("id,title,due_at,status,related_entity_type,related_entity_id")
      .eq("workspace_id", workspaceId)
      .neq("status", "done")
      .not("due_at", "is", null)
      .lt("due_at", now.toISOString())
      .order("due_at", { ascending: true })
      .limit(12),
  ]);

  if (leadsQuery.error) throw leadsQuery.error;
  if (dealsQuery.error) throw dealsQuery.error;
  if (quotesQuery.error) throw quotesQuery.error;
  if (invoicesQuery.error) throw invoicesQuery.error;
  if (jobsQuery.error) throw jobsQuery.error;
  if (tasksQuery.error) throw tasksQuery.error;
  if (remindersQuery.error) throw remindersQuery.error;
  if (stalledDealsQuery.error) throw stalledDealsQuery.error;
  if (staleJobsQuery.error) throw staleJobsQuery.error;
  if (overdueTasksQuery.error) throw overdueTasksQuery.error;

  const leads = leadsQuery.data ?? [];
  const deals = dealsQuery.data ?? [];
  const quotes = quotesQuery.data ?? [];
  const invoices = invoicesQuery.data ?? [];
  const jobs = jobsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const reminders = remindersQuery.data ?? [];

  const quotesSent = quotes.filter((quote) => {
    const status = String(quote.status ?? "").toLowerCase();
    return status === "sent" || status === "accepted";
  }).length;
  const quotesAccepted = quotes.filter((quote) => String(quote.status ?? "").toLowerCase() === "accepted").length;

  const issuedInvoices = invoices.filter((invoice) => {
    const status = String(invoice.status ?? "").toLowerCase();
    return status === "issued" || status === "partially_paid" || status === "paid" || status === "overdue";
  });

  const overdueInvoices = issuedInvoices.filter((invoice) => isOverdue(invoice.due_date, nowDate) && asNumber(invoice.balance_amount) > 0);
  const outstandingBalance = issuedInvoices.reduce((sum, invoice) => sum + asNumber(invoice.balance_amount), 0);

  const invoicesPaid = issuedInvoices.filter((invoice) => asNumber(invoice.paid_amount) > 0 || String(invoice.status ?? "").toLowerCase() === "paid").length;

  const openTaskRows = tasks.filter((task) => String(task.status ?? "").toLowerCase() !== "done");
  const doneTaskRows = tasks.filter((task) => String(task.status ?? "").toLowerCase() === "done");

  const openReminderRows = reminders.filter((row) => String(row.status ?? "").toLowerCase() !== "done");
  const doneReminderRows = reminders.filter((row) => String(row.status ?? "").toLowerCase() === "done");

  const jobsCompleted = jobs.filter((job) => String(job.status ?? "").toLowerCase() === "completed").length;
  const jobsOverdue = jobs.filter((job) => {
    const status = String(job.status ?? "").toLowerCase();
    return status !== "completed" && status !== "cancelled" && isOverdue(job.due_date, nowDate);
  }).length;

  const jobsAtRisk = (staleJobsQuery.data ?? []).filter((job) => {
    const status = String(job.status ?? "").toLowerCase();
    if (status === "completed" || status === "cancelled") return false;
    if (status === "blocked") return true;
    if (!job.due_date) return false;
    const dueSoon = job.due_date >= nowDate && job.due_date <= new Date(Date.now() + DUE_SOON_JOB_DAYS * DAY_MS).toISOString().slice(0, 10);
    const overdue = job.due_date < nowDate;
    const notStarted = status === "pending" || status === "scheduled";
    return overdue || (dueSoon && notStarted);
  });

  const stalledDeals = (stalledDealsQuery.data ?? []).filter((deal) => {
    const stage = Array.isArray(deal.stage) ? deal.stage[0] : deal.stage;
    return !stage?.is_closed;
  });

  const agingBands: InvoiceAgingBand[] = [
    { key: "current", label: "Current", count: 0, balance: 0 },
    { key: "overdue_1_7", label: "Overdue 1–7 days", count: 0, balance: 0 },
    { key: "overdue_8_30", label: "Overdue 8–30 days", count: 0, balance: 0 },
    { key: "overdue_30_plus", label: "Overdue 30+ days", count: 0, balance: 0 },
  ];

  overdueInvoices.forEach((invoice) => {
    if (!invoice.due_date) return;
    const days = Math.floor((Date.now() - new Date(invoice.due_date).getTime()) / DAY_MS);
    const balance = asNumber(invoice.balance_amount);
    if (days <= 7) {
      agingBands[1].count += 1;
      agingBands[1].balance += balance;
    } else if (days <= 30) {
      agingBands[2].count += 1;
      agingBands[2].balance += balance;
    } else {
      agingBands[3].count += 1;
      agingBands[3].balance += balance;
    }
  });

  const currentBalance = issuedInvoices
    .filter((invoice) => !isOverdue(invoice.due_date, nowDate) && asNumber(invoice.balance_amount) > 0)
    .reduce((sum, invoice) => sum + asNumber(invoice.balance_amount), 0);
  agingBands[0].count = issuedInvoices.filter((invoice) => !isOverdue(invoice.due_date, nowDate) && asNumber(invoice.balance_amount) > 0).length;
  agingBands[0].balance = currentBalance;

  return {
    generatedAt: now.toISOString(),
    windowLabel: `Last 7 days (${since.slice(0, 10)} to ${nowDate})`,
    metrics: {
      newLeads: leads.length,
      leadsConvertedToDeals: new Set(deals.map((deal) => deal.lead_id).filter(Boolean)).size,
      quotesSent,
      quotesAccepted,
      invoicesIssued: issuedInvoices.length,
      invoicesPaid,
      outstandingBalance,
      overdueInvoices: overdueInvoices.length,
      jobsCompleted,
      overdueJobs: jobsOverdue,
      taskCompletionRate: tasks.length > 0 ? Math.round((doneTaskRows.length / tasks.length) * 100) : 0,
      reminderCompletionRate: reminders.length > 0 ? Math.round((doneReminderRows.length / reminders.length) * 100) : 0,
    },
    topAttention: {
      stalledDeals: stalledDeals.length,
      overdueInvoices: overdueInvoices.length,
      jobsAtRisk: jobsAtRisk.length,
      overdueTasks: (overdueTasksQuery.data ?? []).length,
      openTasks: openTaskRows.length,
      openReminders: openReminderRows.length,
      unassignedJobs: jobs.filter((job) => !job.assignee_user_id && String(job.status ?? "").toLowerCase() !== "completed").length,
      unassignedTasks: openTaskRows.filter((task) => !task.assignee_user_id).length,
    },
    stalledDeals,
    overdueInvoices: overdueInvoices.slice(0, 12),
    jobsAtRisk: jobsAtRisk.slice(0, 12),
    overdueTasks: (overdueTasksQuery.data ?? []).slice(0, 12),
    agingBands,
  };
}
