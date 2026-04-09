import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/revenue/status-badge";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { getTask } from "@/lib/db/execution";

export default async function TaskDetailPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { workspace } = await requireWorkspace();
  const { taskId } = await params;
  const task = await getTask(workspace.id, taskId);

  return (
    <div className="space-y-4">
      <PageHeader title={task.title} description="Task detail" action={<Link className="rounded-md border border-slate-300 px-4 py-2 text-sm" href={`/tasks/${taskId}/edit`}>Edit</Link>} />
      <Card title="Task Summary"><p className="text-sm">Status: <StatusBadge status={task.status} /></p><p className="text-sm">Priority: {task.priority}</p><p className="text-sm">Due: {task.due_at ? new Date(task.due_at).toLocaleString() : '-'}</p><p className="text-sm">Related: {task.related_entity_type ?? '-'} {task.related_entity_id ?? ''}</p><p className="text-sm">Description: {task.description ?? '-'}</p></Card>
    </div>
  );
}
