import { PageHeader } from "@/components/ui/page-header";
import { TaskForm } from "@/components/execution/task-form";
import { updateTaskAction } from "@/lib/actions/execution";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { getWorkspaceMembers } from "@/lib/db/workspace";
import { getTask } from "@/lib/db/execution";

export default async function EditTaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const { workspace } = await requireWorkspace();
  const { taskId } = await params;
  const [members, task] = await Promise.all([getWorkspaceMembers(workspace.id), getTask(workspace.id, taskId)]);

  return <div className="space-y-4"><PageHeader title="Edit Task" description="Update assignment, due date, and status." /><div className="rounded-lg border border-slate-200 bg-white p-4"><TaskForm action={updateTaskAction.bind(null, taskId)} task={task} members={members} /></div></div>;
}
