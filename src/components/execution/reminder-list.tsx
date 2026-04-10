import { updateReminderStatusAction } from "@/lib/actions/execution";
import { StatusBadge } from "@/components/revenue/status-badge";
import type { Reminder } from "@/types/database";

export function ReminderList({ reminders }: { reminders: Reminder[] }) {
  if (!reminders.length) return <p className="text-sm text-slate-600">No reminders due.</p>;

  return (
    <ul className="space-y-2">
      {reminders.map((reminder) => (
        <li key={reminder.id} className="rounded border border-slate-200 p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium">{reminder.title}</p>
            <StatusBadge status={reminder.status} />
          </div>
          <p className="text-slate-600">{reminder.due_at ? new Date(reminder.due_at).toLocaleString() : "No due date"}</p>
          <div className="mt-2 flex gap-2">
            <form action={updateReminderStatusAction.bind(null, reminder.id, "done")}><button className="border border-slate-300">Done</button></form>
            <form action={updateReminderStatusAction.bind(null, reminder.id, "dismissed")}><button className="border border-slate-300">Dismiss</button></form>
          </div>
        </li>
      ))}
    </ul>
  );
}
