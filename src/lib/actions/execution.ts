"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { logActivity } from "@/lib/db/activity";
import { ensureSystemReminders } from "@/lib/db/execution";

async function validateWorkspaceRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  table: "clients" | "deals" | "invoices" | "jobs" | "leads",
  recordId: string | null,
  label: string,
) {
  if (!recordId) return null;
  const { data } = await supabase.from(table).select("id").eq("workspace_id", workspaceId).eq("id", recordId).maybeSingle();
  if (!data) return `${label} does not belong to this workspace.`;
  return null;
}

async function validateJobLinks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  links: { clientId?: string | null; dealId?: string | null; invoiceId?: string | null },
) {
  const checks = await Promise.all([
    validateWorkspaceRecord(supabase, workspaceId, "clients", links.clientId ?? null, "Selected client"),
    validateWorkspaceRecord(supabase, workspaceId, "deals", links.dealId ?? null, "Selected deal"),
    validateWorkspaceRecord(supabase, workspaceId, "invoices", links.invoiceId ?? null, "Selected invoice"),
  ]);
  return checks.find(Boolean) ?? null;
}

async function validateRelatedEntity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  workspaceId: string,
  relatedType: string | null,
  relatedId: string | null,
) {
  if (!relatedType || !relatedId) return null;
  const relationMap: Record<string, { table: "jobs" | "deals" | "invoices" | "leads"; label: string }> = {
    job: { table: "jobs", label: "Selected job" },
    deal: { table: "deals", label: "Selected deal" },
    invoice: { table: "invoices", label: "Selected invoice" },
    lead: { table: "leads", label: "Selected lead" },
  };
  const relation = relationMap[relatedType];
  if (!relation) return null;
  return validateWorkspaceRecord(supabase, workspaceId, relation.table, relatedId, relation.label);
}

export async function createJobAction(formData: FormData) {
  const { workspace, user } = await requireWorkspace("staff");
  const supabase = await createClient();
  const clientId = String(formData.get("client_id") ?? "").trim() || null;
  const dealId = String(formData.get("deal_id") ?? "").trim() || null;
  const invoiceId = String(formData.get("invoice_id") ?? "").trim() || null;
  const linkError = await validateJobLinks(supabase, workspace.id, { clientId, dealId, invoiceId });
  if (linkError) redirect(`/jobs/new?error=${encodeURIComponent(linkError)}`);

  const payload = {
    workspace_id: workspace.id,
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    client_id: clientId,
    deal_id: dealId,
    invoice_id: invoiceId,
    assignee_user_id: String(formData.get("assignee_user_id") ?? "").trim() || null,
    owner_user_id: String(formData.get("owner_user_id") ?? "").trim() || user.id,
    status: String(formData.get("status") ?? "pending"),
    priority: String(formData.get("priority") ?? "medium"),
    start_date: String(formData.get("start_date") ?? "").trim() || null,
    due_date: String(formData.get("due_date") ?? "").trim() || null,
    completion_note: String(formData.get("completion_note") ?? "").trim() || null,
    internal_notes: String(formData.get("internal_notes") ?? "").trim() || null,
    created_by: user.id,
  };

  const { data, error } = await supabase.from("jobs").insert(payload).select("id,status,assignee_user_id").single();
  if (error || !data) redirect(`/jobs/new?error=${encodeURIComponent(error?.message ?? "Could not create job")}`);

  await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: "job", entityId: data.id, type: "job.created", description: `Job created: ${payload.title}` });
  if (data.assignee_user_id) await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: "job", entityId: data.id, type: "job.assigned", description: "Job assigned" });

  await ensureSystemReminders(workspace.id);
  redirect(`/jobs/${data.id}`);
}

export async function updateJobAction(jobId: string, formData: FormData) {
  const { workspace, user } = await requireWorkspace("staff");
  const supabase = await createClient();
  const clientId = String(formData.get("client_id") ?? "").trim() || null;
  const dealId = String(formData.get("deal_id") ?? "").trim() || null;
  const invoiceId = String(formData.get("invoice_id") ?? "").trim() || null;
  const linkError = await validateJobLinks(supabase, workspace.id, { clientId, dealId, invoiceId });
  if (linkError) redirect(`/jobs/${jobId}/edit?error=${encodeURIComponent(linkError)}`);

  const { data: previous } = await supabase
    .from("jobs")
    .select("status,assignee_user_id,title")
    .eq("workspace_id", workspace.id)
    .eq("id", jobId)
    .single();

  const payload = {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    client_id: clientId,
    deal_id: dealId,
    invoice_id: invoiceId,
    assignee_user_id: String(formData.get("assignee_user_id") ?? "").trim() || null,
    owner_user_id: String(formData.get("owner_user_id") ?? "").trim() || null,
    status: String(formData.get("status") ?? "pending"),
    priority: String(formData.get("priority") ?? "medium"),
    start_date: String(formData.get("start_date") ?? "").trim() || null,
    due_date: String(formData.get("due_date") ?? "").trim() || null,
    completion_note: String(formData.get("completion_note") ?? "").trim() || null,
    internal_notes: String(formData.get("internal_notes") ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("jobs").update(payload).eq("workspace_id", workspace.id).eq("id", jobId);
  if (error) redirect(`/jobs/${jobId}/edit?error=${encodeURIComponent(error.message)}`);

  await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: "job", entityId: jobId, type: "job.updated", description: `Job updated: ${payload.title}` });
  if (previous?.assignee_user_id !== payload.assignee_user_id) await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: "job", entityId: jobId, type: "job.assigned", description: "Job reassigned" });
  if (previous?.status !== payload.status) await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: "job", entityId: jobId, type: payload.status === "completed" ? "job.completed" : "job.status_changed", description: `Job status changed to ${payload.status}` });

  await ensureSystemReminders(workspace.id);
  redirect(`/jobs/${jobId}`);
}

export async function createTaskAction(formData: FormData) {
  const { workspace, user } = await requireWorkspace("staff");
  const supabase = await createClient();
  const relatedType = String(formData.get("related_entity_type") ?? "").trim() || null;
  const relatedId = String(formData.get("related_entity_id") ?? "").trim() || null;
  const relatedError = await validateRelatedEntity(supabase, workspace.id, relatedType, relatedId);
  if (relatedError) redirect(`/tasks/new?error=${encodeURIComponent(relatedError)}`);

  const payload = {
    workspace_id: workspace.id,
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    related_entity_type: relatedType,
    related_entity_id: relatedId,
    assignee_user_id: String(formData.get("assignee_user_id") ?? "").trim() || null,
    owner_user_id: String(formData.get("owner_user_id") ?? "").trim() || user.id,
    due_at: String(formData.get("due_at") ?? "").trim() || null,
    snoozed_until: String(formData.get("snoozed_until") ?? "").trim() || null,
    priority: String(formData.get("priority") ?? "medium"),
    status: String(formData.get("status") ?? "open"),
    created_by: user.id,
  };

  const { data, error } = await supabase.from("tasks").insert(payload).select("id").single();
  if (error || !data) redirect(`/tasks/new?error=${encodeURIComponent(error?.message ?? "Could not create task")}`);

  await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: "task", entityId: data.id, type: "task.created", description: `Task created: ${payload.title}` });
  if (payload.related_entity_type && payload.related_entity_id && ["lead","deal","invoice","job"].includes(payload.related_entity_type)) {
    await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: payload.related_entity_type as any, entityId: payload.related_entity_id, type: "task.created", description: `Task linked: ${payload.title}`, metadata: { task_id: data.id } });
  }
  await ensureSystemReminders(workspace.id);
  if (payload.related_entity_type && payload.related_entity_id) redirect(`/${payload.related_entity_type}s/${payload.related_entity_id}`);
  redirect(`/tasks/${data.id}`);
}

export async function updateTaskAction(taskId: string, formData: FormData) {
  const { workspace, user } = await requireWorkspace("staff");
  const supabase = await createClient();
  const relatedType = String(formData.get("related_entity_type") ?? "").trim() || null;
  const relatedId = String(formData.get("related_entity_id") ?? "").trim() || null;
  const relatedError = await validateRelatedEntity(supabase, workspace.id, relatedType, relatedId);
  if (relatedError) redirect(`/tasks/${taskId}/edit?error=${encodeURIComponent(relatedError)}`);

  const { data: previous } = await supabase
    .from("tasks")
    .select("status,assignee_user_id,title")
    .eq("workspace_id", workspace.id)
    .eq("id", taskId)
    .single();

  const payload = {
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    related_entity_type: relatedType,
    related_entity_id: relatedId,
    assignee_user_id: String(formData.get("assignee_user_id") ?? "").trim() || null,
    owner_user_id: String(formData.get("owner_user_id") ?? "").trim() || null,
    due_at: String(formData.get("due_at") ?? "").trim() || null,
    snoozed_until: String(formData.get("snoozed_until") ?? "").trim() || null,
    priority: String(formData.get("priority") ?? "medium"),
    status: String(formData.get("status") ?? "open"),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("tasks").update(payload).eq("workspace_id", workspace.id).eq("id", taskId);
  if (error) redirect(`/tasks/${taskId}/edit?error=${encodeURIComponent(error.message)}`);

  await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: "task", entityId: taskId, type: payload.status === "done" ? "task.done" : "task.updated", description: payload.status === "done" ? "Task marked done" : `Task updated: ${payload.title}` });
  if (payload.related_entity_type && payload.related_entity_id && ["lead","deal","invoice","job"].includes(payload.related_entity_type)) {
    await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: payload.related_entity_type as any, entityId: payload.related_entity_id, type: payload.status === "done" ? "task.done" : "task.updated", description: `Task update linked: ${payload.title}`, metadata: { task_id: taskId } });
  }
  if (previous?.assignee_user_id !== payload.assignee_user_id) await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: "task", entityId: taskId, type: "task.reassigned", description: "Task reassigned" });

  await ensureSystemReminders(workspace.id);
  redirect(`/tasks/${taskId}`);
}

export async function createReminderAction(formData: FormData) {
  const { workspace, user } = await requireWorkspace("staff");
  const supabase = await createClient();
  const relatedType = String(formData.get("related_entity_type") ?? "").trim() || null;
  const relatedId = String(formData.get("related_entity_id") ?? "").trim() || null;
  const relatedError = await validateRelatedEntity(supabase, workspace.id, relatedType, relatedId);
  if (relatedError) redirect(`/dashboard?error=${encodeURIComponent(relatedError)}`);

  const payload = {
    workspace_id: workspace.id,
    type: String(formData.get("type") ?? "custom"),
    title: String(formData.get("title") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim() || null,
    related_entity_type: relatedType,
    related_entity_id: relatedId,
    assignee_user_id: String(formData.get("assignee_user_id") ?? "").trim() || null,
    due_at: String(formData.get("due_at") ?? "").trim() || null,
    status: "open",
    system_generated: false,
    created_by: user.id,
  };

  const { data, error } = await supabase.from("reminders").insert(payload).select("id").single();
  if (error || !data) redirect(`/dashboard?error=${encodeURIComponent(error?.message ?? "Could not create reminder")}`);

  await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: "reminder", entityId: data.id, type: "reminder.created", description: `Reminder created: ${payload.title}` });
  if (payload.related_entity_type && payload.related_entity_id && ["lead","deal","invoice","job"].includes(payload.related_entity_type)) {
    await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: payload.related_entity_type as any, entityId: payload.related_entity_id, type: "reminder.created", description: `Reminder linked: ${payload.title}`, metadata: { reminder_id: data.id } });
  }
  redirect("/dashboard?success=Reminder created");
}

export async function updateReminderStatusAction(reminderId: string, status: "done" | "dismissed") {
  const { workspace, user } = await requireWorkspace("staff");
  const supabase = await createClient();

  const { data: reminder } = await supabase.from("reminders").select("related_entity_type,related_entity_id,title").eq("workspace_id", workspace.id).eq("id", reminderId).single();

  const { error } = await supabase
    .from("reminders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("workspace_id", workspace.id)
    .eq("id", reminderId);

  if (error) throw error;

  await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: "reminder", entityId: reminderId, type: status === "done" ? "reminder.completed" : "reminder.dismissed", description: `Reminder ${status}` });
  if (reminder?.related_entity_type && reminder?.related_entity_id && ["lead","deal","invoice","job"].includes(reminder.related_entity_type)) {
    await logActivity({ workspaceId: workspace.id, actorUserId: user.id, entityType: reminder.related_entity_type as any, entityId: reminder.related_entity_id, type: status === "done" ? "reminder.completed" : "reminder.dismissed", description: `Reminder ${status}: ${reminder.title}`, metadata: { reminder_id: reminderId } });
  }
}

export async function addNoteAction(formData: FormData) {
  const { workspace, user } = await requireWorkspace("staff");
  const supabase = await createClient();

  const relatedType = String(formData.get("related_entity_type") ?? "").trim();
  const relatedId = String(formData.get("related_entity_id") ?? "").trim();
  const relatedError = await validateRelatedEntity(supabase, workspace.id, relatedType || null, relatedId || null);
  if (relatedError) redirect(`/dashboard?error=${encodeURIComponent(relatedError)}`);

  const { error } = await supabase.from("notes").insert({
    workspace_id: workspace.id,
    related_entity_type: relatedType,
    related_entity_id: relatedId,
    body: String(formData.get("body") ?? "").trim(),
    author_user_id: user.id,
  });

  if (error) throw error;

  redirect(`/${relatedType}s/${relatedId}`);
}
