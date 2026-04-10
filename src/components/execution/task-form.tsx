import type { Task, TaskPriority, TaskStatus } from "@/types/database";

const statuses: TaskStatus[] = ["open", "in_progress", "done", "cancelled"];
const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];

type WorkspaceMemberProfile = {
  user_id: string;
  profiles?: { full_name: string | null } | Array<{ full_name: string | null }> | null;
};
const memberName = (member: WorkspaceMemberProfile) =>
  Array.isArray(member.profiles)
    ? (member.profiles[0]?.full_name ?? member.user_id.slice(0, 8))
    : (member.profiles?.full_name ?? member.user_id.slice(0, 8));

export function TaskForm({
  action,
  task,
  members,
}: {
  action: (formData: FormData) => void;
  task?: Task;
  members: WorkspaceMemberProfile[];
}) {
  return (
    <form action={action} className="space-y-3">
      <input name="title" placeholder="Task title" defaultValue={task?.title} required />
      <textarea name="description" placeholder="Description" defaultValue={task?.description ?? ""} rows={3} />
      <div className="grid gap-2 md:grid-cols-2">
        <select name="related_entity_type" defaultValue={task?.related_entity_type ?? ""}>
          <option value="">Standalone</option>
          <option value="lead">Lead</option>
          <option value="deal">Deal</option>
          <option value="invoice">Invoice</option>
          <option value="job">Job</option>
        </select>
        <input name="related_entity_id" placeholder="Related entity ID (optional)" defaultValue={task?.related_entity_id ?? ""} />
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <select name="assignee_user_id" defaultValue={task?.assignee_user_id ?? ""}><option value="">Unassigned</option>{members.map((m)=><option key={m.user_id} value={m.user_id}>{memberName(m)}</option>)}</select>
        <select name="owner_user_id" defaultValue={task?.owner_user_id ?? ""}><option value="">Owner</option>{members.map((m)=><option key={m.user_id} value={m.user_id}>{memberName(m)}</option>)}</select>
      </div>
      <div className="grid gap-2 md:grid-cols-4">
        <input type="datetime-local" name="due_at" defaultValue={task?.due_at ? task.due_at.slice(0,16) : ""} />
        <input type="datetime-local" name="snoozed_until" defaultValue={task?.snoozed_until ? task.snoozed_until.slice(0,16) : ""} />
        <select name="priority" defaultValue={task?.priority ?? "medium"}>{priorities.map((p)=><option key={p} value={p}>{p}</option>)}</select>
        <select name="status" defaultValue={task?.status ?? "open"}>{statuses.map((s)=><option key={s} value={s}>{s}</option>)}</select>
      </div>
      <button className="w-full bg-emerald-600 text-white">Save task</button>
    </form>
  );
}
