import { createClient } from "@/lib/supabase/server";

export async function listJobs(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("*, client:clients(id,business_name), deal:deals(id,title), invoice:invoices(id,invoice_number)")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getJob(workspaceId: string, jobId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("jobs")
    .select("*, client:clients(id,business_name), deal:deals(id,title), invoice:invoices(id,invoice_number)")
    .eq("workspace_id", workspaceId)
    .eq("id", jobId)
    .single();
  if (error) throw error;

  const [{ data: tasks }, { data: reminders }, { data: notes }] = await Promise.all([
    supabase
      .from("tasks")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("related_entity_type", "job")
      .eq("related_entity_id", jobId)
      .order("due_at", { ascending: true }),
    supabase
      .from("reminders")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("related_entity_type", "job")
      .eq("related_entity_id", jobId)
      .order("due_at", { ascending: true }),
    supabase
      .from("notes")
      .select("*")
      .eq("workspace_id", workspaceId)
      .eq("related_entity_type", "job")
      .eq("related_entity_id", jobId)
      .order("created_at", { ascending: false }),
  ]);

  return { job: data, tasks: tasks ?? [], reminders: reminders ?? [], notes: notes ?? [] };
}

export async function listTasks(workspaceId: string, filters?: Record<string, string | undefined>) {
  const supabase = await createClient();
  let query = supabase.from("tasks").select("*").eq("workspace_id", workspaceId).order("due_at", { ascending: true });

  if (filters?.assignee) query = query.eq("assignee_user_id", filters.assignee);
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.priority) query = query.eq("priority", filters.priority);
  if (filters?.entity_type) query = query.eq("related_entity_type", filters.entity_type);

  const { data, error } = await query;
  if (error) throw error;

  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return (data ?? []).filter((task) => {
    if (filters?.due === "today") {
      return task.due_at && new Date(task.due_at) >= start && new Date(task.due_at) <= end;
    }
    if (filters?.due === "overdue") {
      return task.due_at && new Date(task.due_at) < now && task.status !== "done" && task.status !== "cancelled";
    }
    return true;
  });
}

export async function getTask(workspaceId: string, taskId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("tasks").select("*").eq("workspace_id", workspaceId).eq("id", taskId).single();
  if (error) throw error;
  return data;
}

export async function listOpenReminders(workspaceId: string, userId?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("reminders")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("status", "open")
    .order("due_at", { ascending: true })
    .limit(20);

  if (userId) query = query.eq("assignee_user_id", userId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function ensureSystemReminders(workspaceId: string) {
  const supabase = await createClient();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const [{ data: leads }, { data: invoices }, { data: jobs }] = await Promise.all([
    supabase
      .from("leads")
      .select("id,name,owner_user_id,next_follow_up_at")
      .eq("workspace_id", workspaceId)
      .not("next_follow_up_at", "is", null),
    supabase
      .from("invoices")
      .select("id,invoice_number,owner_user_id,due_date,balance_amount,status")
      .eq("workspace_id", workspaceId),
    supabase
      .from("jobs")
      .select("id,title,assignee_user_id,due_date,status")
      .eq("workspace_id", workspaceId),
  ]);

  type ReminderUpsertRow = {
    workspace_id: string;
    type: string;
    title: string;
    related_entity_type: string;
    related_entity_id: string;
    assignee_user_id?: string | null;
    due_at: string;
    system_generated: boolean;
  };
  const reminderRows: ReminderUpsertRow[] = [];

  (leads ?? []).forEach((lead) => {
    if (lead.next_follow_up_at && new Date(lead.next_follow_up_at) <= now) {
      reminderRows.push({
        workspace_id: workspaceId,
        type: "follow_up_due",
        title: `Lead follow-up due: ${lead.name}`,
        related_entity_type: "lead",
        related_entity_id: lead.id,
        assignee_user_id: lead.owner_user_id,
        due_at: lead.next_follow_up_at,
        system_generated: true,
      });
    }
  });

  (invoices ?? []).forEach((invoice) => {
    if (invoice.due_date && invoice.due_date < now.toISOString().slice(0, 10) && Number(invoice.balance_amount || 0) > 0 && invoice.status !== "paid" && invoice.status !== "cancelled") {
      reminderRows.push({
        workspace_id: workspaceId,
        type: "invoice_overdue",
        title: `Invoice overdue: ${invoice.invoice_number}`,
        related_entity_type: "invoice",
        related_entity_id: invoice.id,
        due_at: `${invoice.due_date}T09:00:00.000Z`,
        system_generated: true,
      });
    }
  });

  (jobs ?? []).forEach((job) => {
    if (!job.due_date || job.status === "completed" || job.status === "cancelled") return;
    const due = new Date(`${job.due_date}T09:00:00.000Z`);
    if (due <= todayEnd) {
      reminderRows.push({
        workspace_id: workspaceId,
        type: "job_due",
        title: due < todayStart ? `Job overdue: ${job.title}` : `Job due today: ${job.title}`,
        related_entity_type: "job",
        related_entity_id: job.id,
        assignee_user_id: job.assignee_user_id,
        due_at: due.toISOString(),
        system_generated: true,
      });
    }
  });

  if (reminderRows.length) {
    await supabase.from("reminders").upsert(reminderRows, {
      onConflict: "workspace_id,type,related_entity_type,related_entity_id,due_at",
      ignoreDuplicates: true,
    });
  }

  const overdueInvoiceIds = reminderRows.filter((r) => r.type === "invoice_overdue").map((r) => r.related_entity_id);
  const overdueLeadIds = reminderRows.filter((r) => r.type === "follow_up_due").map((r) => r.related_entity_id);

  if (overdueInvoiceIds.length) {
    const { data: existingInvoiceActivities } = await supabase
      .from("activities")
      .select("entity_id")
      .eq("workspace_id", workspaceId)
      .eq("activity_type", "invoice.overdue")
      .in("entity_id", overdueInvoiceIds);
    const existingSet = new Set((existingInvoiceActivities ?? []).map((a: { entity_id: string }) => a.entity_id));
    const newRows = overdueInvoiceIds.filter((id) => !existingSet.has(id)).map((id) => ({
      workspace_id: workspaceId,
      entity_type: "invoice",
      entity_id: id,
      activity_type: "invoice.overdue",
      description: "Invoice became overdue",
    }));
    if (newRows.length) await supabase.from("activities").insert(newRows);
  }

  if (overdueLeadIds.length) {
    const { data: existingLeadActivities } = await supabase
      .from("activities")
      .select("entity_id")
      .eq("workspace_id", workspaceId)
      .eq("activity_type", "follow_up.overdue")
      .in("entity_id", overdueLeadIds);
    const existingSet = new Set((existingLeadActivities ?? []).map((a: { entity_id: string }) => a.entity_id));
    const newRows = overdueLeadIds.filter((id) => !existingSet.has(id)).map((id) => ({
      workspace_id: workspaceId,
      entity_type: "lead",
      entity_id: id,
      activity_type: "follow_up.overdue",
      description: "Lead follow-up became overdue",
    }));
    if (newRows.length) await supabase.from("activities").insert(newRows);
  }

}

export async function getExecutionMetrics(workspaceId: string, userId: string) {
  const supabase = await createClient();
  await ensureSystemReminders(workspaceId);

  const now = new Date();
  const today = now.toISOString().slice(0, 10);

  const [jobsData, tasksData, remindersData] = await Promise.all([
    supabase.from("jobs").select("id,status,due_date,assignee_user_id").eq("workspace_id", workspaceId),
    supabase.from("tasks").select("id,status,due_at,assignee_user_id").eq("workspace_id", workspaceId),
    supabase.from("reminders").select("id,status,due_at,assignee_user_id").eq("workspace_id", workspaceId).eq("status", "open"),
  ]);

  if (jobsData.error) throw jobsData.error;
  if (tasksData.error) throw tasksData.error;
  if (remindersData.error) throw remindersData.error;

  const jobs = jobsData.data ?? [];
  const tasks = tasksData.data ?? [];
  const reminders = remindersData.data ?? [];

  return {
    activeJobs: jobs.filter((j) => !["completed", "cancelled"].includes(j.status)).length,
    jobsDueToday: jobs.filter((j) => j.due_date === today && !["completed", "cancelled"].includes(j.status)).length,
    overdueJobs: jobs.filter((j) => j.due_date && j.due_date < today && !["completed", "cancelled"].includes(j.status)).length,
    openTasks: tasks.filter((t) => !["done", "cancelled"].includes(t.status)).length,
    tasksDueToday: tasks.filter((t) => t.due_at && t.due_at.slice(0, 10) === today && !["done", "cancelled"].includes(t.status)).length,
    overdueTasks: tasks.filter((t) => t.due_at && new Date(t.due_at) < now && !["done", "cancelled"].includes(t.status)).length,
    remindersDue: reminders.length,
    assignedToMe: jobs.filter((j) => j.assignee_user_id === userId).length + tasks.filter((t) => t.assignee_user_id === userId && !["done", "cancelled"].includes(t.status)).length,
    unassignedItems: jobs.filter((j) => !j.assignee_user_id && !["completed", "cancelled"].includes(j.status)).length + tasks.filter((t) => !t.assignee_user_id && !["done", "cancelled"].includes(t.status)).length,
  };
}
