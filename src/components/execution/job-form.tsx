import { TaskPriority, JobStatus } from "@/types/database";

const statuses: JobStatus[] = ["pending", "scheduled", "in_progress", "blocked", "completed", "cancelled"];
const priorities: TaskPriority[] = ["low", "medium", "high", "urgent"];

export function JobForm({ action, job, clients, deals, invoices, members }: { action: (formData: FormData) => void; job?: any; clients: any[]; deals: any[]; invoices: any[]; members: any[]; }) {
  return (
    <form action={action} className="space-y-3">
      <input name="title" placeholder="Job title" defaultValue={job?.title} required />
      <textarea name="description" placeholder="Description / scope note" defaultValue={job?.description ?? ""} rows={3} />
      <div className="grid gap-2 md:grid-cols-3">
        <select name="client_id" defaultValue={job?.client_id ?? ""}><option value="">No client</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.business_name}</option>)}</select>
        <select name="deal_id" defaultValue={job?.deal_id ?? ""}><option value="">No deal</option>{deals.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}</select>
        <select name="invoice_id" defaultValue={job?.invoice_id ?? ""}><option value="">No invoice</option>{invoices.map((i) => <option key={i.id} value={i.id}>{i.invoice_number}</option>)}</select>
      </div>
      <div className="grid gap-2 md:grid-cols-2">
        <select name="assignee_user_id" defaultValue={job?.assignee_user_id ?? ""}><option value="">Unassigned</option>{members.map((m) => <option key={m.user_id} value={m.user_id}>{m.profiles?.full_name ?? m.user_id.slice(0,8)}</option>)}</select>
        <select name="owner_user_id" defaultValue={job?.owner_user_id ?? ""}><option value="">Owner</option>{members.map((m) => <option key={m.user_id} value={m.user_id}>{m.profiles?.full_name ?? m.user_id.slice(0,8)}</option>)}</select>
      </div>
      <div className="grid gap-2 md:grid-cols-4">
        <input type="date" name="start_date" defaultValue={job?.start_date ?? ""} />
        <input type="date" name="due_date" defaultValue={job?.due_date ?? ""} />
        <select name="status" defaultValue={job?.status ?? "pending"}>{statuses.map((s)=><option key={s} value={s}>{s}</option>)}</select>
        <select name="priority" defaultValue={job?.priority ?? "medium"}>{priorities.map((p)=><option key={p} value={p}>{p}</option>)}</select>
      </div>
      <textarea name="completion_note" placeholder="Completion note" defaultValue={job?.completion_note ?? ""} rows={2} />
      <textarea name="internal_notes" placeholder="Internal notes" defaultValue={job?.internal_notes ?? ""} rows={3} />
      <button className="w-full bg-emerald-600 text-white">Save job</button>
    </form>
  );
}
