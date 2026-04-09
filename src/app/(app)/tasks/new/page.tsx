import { PageHeader } from "@/components/ui/page-header";
import { TaskForm } from "@/components/execution/task-form";
import { createTaskAction } from "@/lib/actions/execution";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { getWorkspaceMembers } from "@/lib/db/workspace";

export default async function NewTaskPage() {
  const { workspace } = await requireWorkspace();
  const members = await getWorkspaceMembers(workspace.id);
  return <div className="space-y-4"><PageHeader title="New Task" description="Create a follow-up or execution task." /><div className="rounded-lg border border-slate-200 bg-white p-4"><TaskForm action={createTaskAction} members={members} /></div></div>;
}
