import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/revenue/status-badge";
import { ActivityList } from "@/components/ui/activity-list";
import { ReminderList } from "@/components/execution/reminder-list";
import { QuickTaskForm } from "@/components/execution/quick-task-form";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { AIGenerateCard } from "@/components/ai/ai-generate-card";
import { AIHistoryList } from "@/components/ai/ai-history-list";
import { listAIGenerations } from "@/lib/db/ai";
import { getJob } from "@/lib/db/execution";
import { createClient } from "@/lib/supabase/server";
import { addNoteAction } from "@/lib/actions/execution";
import type { Task } from "@/types/database";

type JobRelations = { client?: { business_name: string | null } | null; deal?: { title: string | null } | null; invoice?: { invoice_number: string | null } | null };
type JobNote = { id: string; body: string; created_at: string };

export default async function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { workspace } = await requireWorkspace();
  const { jobId } = await params;
  const jobData = await getJob(workspace.id, jobId);
  const job = jobData.job as typeof jobData.job & JobRelations;
  const aiRows = await listAIGenerations(workspace.id, "job", jobId);

  const supabase = await createClient();
  const { data: activities } = await supabase.from("activities").select("id,description,created_at,activity_type").eq("workspace_id", workspace.id).eq("entity_id", jobId).in("entity_type", ["job", "reminder", "task"]).order("created_at", { ascending: false }).limit(12);

  return (
    <div className="space-y-4">
      <PageHeader title={jobData.job.title} description="Execution detail" action={<Link className="rounded-md border border-slate-300 px-4 py-2 text-sm" href={`/jobs/${jobId}/edit`}>Edit</Link>} />
      <Card title="Job Summary"><p className="text-sm">Status: <StatusBadge status={jobData.job.status} /></p><p className="text-sm">Priority: {jobData.job.priority}</p><p className="text-sm">Assignee: {jobData.job.assignee_user_id ?? 'Unassigned'}</p><p className="text-sm">Due: {jobData.job.due_date ?? '-'}</p><p className="text-sm">Completion note: {jobData.job.completion_note ?? '-'}</p></Card>
      <Card title="Related Records"><ul className="text-sm space-y-1"><li>Client: {job.client?.business_name ?? "-"}</li><li>Deal: {job.deal?.title ?? "-"}</li><li>Invoice: {job.invoice?.invoice_number ?? "-"}</li></ul></Card>
      <Card title="Tasks"><QuickTaskForm entityType="job" entityId={jobId} titlePrefix={jobData.job.title} /><ul className="mt-3 space-y-2">{jobData.tasks.map((task: Task) => <li key={task.id} className="rounded border border-slate-200 p-2 text-sm"><Link href={`/tasks/${task.id}`} className="font-medium">{task.title}</Link><p className="text-slate-600">{task.status} • {task.priority}</p></li>)}</ul></Card>
      <Card title="Reminders"><ReminderList reminders={jobData.reminders} /></Card>
      <Card title="Internal Notes"><form action={addNoteAction} className="space-y-2"><input type="hidden" name="related_entity_type" value="job" /><input type="hidden" name="related_entity_id" value={jobId} /><textarea name="body" rows={3} placeholder="Add internal note" required /><button className="bg-slate-800 text-white">Add note</button></form><ul className="mt-3 space-y-2 text-sm">{jobData.notes.map((note: JobNote) => <li key={note.id} className="rounded border border-slate-200 p-2">{note.body}<p className="text-xs text-slate-500">{new Date(note.created_at).toLocaleString()}</p></li>)}</ul></Card>

      <Card title="AI Copilot (Optional)">
        <AIGenerateCard
          title="Next-step suggestions"
          description="Get recommendation-only next actions for execution progress."
          generationType="next_step_suggestion"
          entityType="job"
          entityId={jobId}
          returnPath={`/jobs/${jobId}`}
          context={{ job_title: jobData.job.title, status: jobData.job.status, priority: jobData.job.priority, due_date: jobData.job.due_date, assignee: jobData.job.assignee_user_id, internal_notes: jobData.job.internal_notes }}
        />
        <div className="mt-3"><AIHistoryList rows={aiRows} /></div>
      </Card>

      <Card title="Timeline"><ActivityList items={activities ?? []} /></Card>
    </div>
  );
}
