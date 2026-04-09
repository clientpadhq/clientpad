import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ActivityList } from "@/components/ui/activity-list";
import { QuickTaskForm } from "@/components/execution/quick-task-form";
import { ReminderList } from "@/components/execution/reminder-list";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { getLead } from "@/lib/db/leads";
import { createClient } from "@/lib/supabase/server";

export default async function LeadDetailPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { workspace } = await requireWorkspace();
  const { leadId } = await params;
  const lead = await getLead(workspace.id, leadId);

  const supabase = await createClient();
  const [{ data: activities }, { data: tasks }, { data: reminders }] = await Promise.all([
    supabase.from("activities").select("id, description, created_at, activity_type").eq("workspace_id", workspace.id).eq("entity_type", "lead").eq("entity_id", leadId).order("created_at", { ascending: false }),
    supabase.from("tasks").select("*").eq("workspace_id", workspace.id).eq("related_entity_type", "lead").eq("related_entity_id", leadId).order("due_at", { ascending: true }),
    supabase.from("reminders").select("*").eq("workspace_id", workspace.id).eq("related_entity_type", "lead").eq("related_entity_id", leadId).eq("status", "open").order("due_at", { ascending: true }),
  ]);

  const isFollowUpOverdue = !!lead.next_follow_up_at && new Date(lead.next_follow_up_at) < new Date();

  return (
    <div className="space-y-4">
      <PageHeader
        title={lead.name}
        description="Lead details and history"
        action={<Link className="rounded-md border border-slate-300 px-4 py-2 text-sm" href={`/leads/${lead.id}/edit`}>Edit lead</Link>}
      />

      <Card title="Lead Info">
        <dl className="grid gap-2 text-sm">
          <div><dt className="text-slate-500">Phone</dt><dd>{lead.phone}</dd></div>
          <div><dt className="text-slate-500">Source</dt><dd>{lead.source ?? "-"}</dd></div>
          <div><dt className="text-slate-500">Service interest</dt><dd>{lead.service_interest ?? "-"}</dd></div>
          <div><dt className="text-slate-500">Status</dt><dd>{lead.status}</dd></div>
          <div><dt className="text-slate-500">Next follow-up</dt><dd>{lead.next_follow_up_at ? new Date(lead.next_follow_up_at).toLocaleString() : "-"} {isFollowUpOverdue ? <span className="ml-2 rounded bg-red-100 px-2 py-1 text-xs text-red-700">Overdue</span> : null}</dd></div>
          <div><dt className="text-slate-500">Notes</dt><dd>{lead.notes ?? "-"}</dd></div>
        </dl>
      </Card>

      <Card title="Lead Tasks">
        <QuickTaskForm entityType="lead" entityId={leadId} titlePrefix={lead.name} />
        <ul className="mt-3 space-y-2 text-sm">{(tasks ?? []).map((task:any)=><li key={task.id} className="rounded border border-slate-200 p-2"><Link className="font-medium" href={`/tasks/${task.id}`}>{task.title}</Link><p className="text-slate-600">{task.status} • {task.priority}</p></li>)}</ul>
      </Card>

      <Card title="Lead Reminders"><ReminderList reminders={reminders ?? []} /></Card>
      <Card title="Activity"><ActivityList items={(activities ?? [])} /></Card>
    </div>
  );
}
