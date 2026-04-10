import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/revenue/status-badge";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { listTasks } from "@/lib/db/execution";

export default async function TasksPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { workspace, user } = await requireWorkspace();
  const params = await searchParams;
  const tasks = await listTasks(workspace.id, params);

  return (
    <div className="space-y-4">
      <PageHeader title="Tasks" description="Operational to-dos across leads, deals, invoices, and jobs." action={<Link className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white" href="/tasks/new">New task</Link>} />

      <div className="flex flex-wrap gap-2">
        <Link href={`/tasks?assignee=${user.id}`} className="rounded border border-slate-300 px-3 py-1 text-xs">Assigned to me</Link>
        <Link href="/tasks?due=today" className="rounded border border-slate-300 px-3 py-1 text-xs">Due today</Link>
        <Link href="/tasks?due=overdue" className="rounded border border-slate-300 px-3 py-1 text-xs">Overdue</Link>
      </div>
      <form className="grid gap-2 rounded border border-slate-200 bg-white p-3 md:grid-cols-6" method="get">
        <input name="assignee" placeholder="Assignee user id" defaultValue={params.assignee ?? ""} />
        <select name="status" defaultValue={params.status ?? ""}><option value="">Any status</option><option value="open">open</option><option value="in_progress">in_progress</option><option value="done">done</option><option value="cancelled">cancelled</option></select>
        <select name="priority" defaultValue={params.priority ?? ""}><option value="">Any priority</option><option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="urgent">urgent</option></select>
        <select name="due" defaultValue={params.due ?? ""}><option value="">Any due</option><option value="today">Due today</option><option value="overdue">Overdue</option></select>
        <select name="entity_type" defaultValue={params.entity_type ?? ""}><option value="">Any entity</option><option value="lead">Lead</option><option value="deal">Deal</option><option value="invoice">Invoice</option><option value="job">Job</option></select>
        <button className="border border-slate-300">Apply</button>
      </form>
      {tasks.length === 0 ? <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No tasks found.</div> : <ul className="space-y-2">{tasks.map((task) => <li key={task.id} className="rounded-lg border border-slate-200 bg-white p-4"><div className="flex items-center justify-between"><Link href={`/tasks/${task.id}`} className="font-medium">{task.title}</Link><StatusBadge status={task.status} /></div><p className="text-sm text-slate-600">Priority: {task.priority} • Due: {task.due_at ? new Date(task.due_at).toLocaleString() : "-"}</p></li>)}</ul>}
    </div>
  );
}
