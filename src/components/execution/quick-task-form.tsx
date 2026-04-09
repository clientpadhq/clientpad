import { createTaskAction } from "@/lib/actions/execution";

export function QuickTaskForm({ entityType, entityId, titlePrefix }: { entityType: string; entityId: string; titlePrefix: string; }) {
  return (
    <form action={createTaskAction} className="space-y-2 rounded border border-slate-200 p-3">
      <input type="hidden" name="related_entity_type" value={entityType} />
      <input type="hidden" name="related_entity_id" value={entityId} />
      <input name="title" placeholder={`Task for ${titlePrefix}`} required />
      <input type="datetime-local" name="due_at" />
      <select name="priority" defaultValue="medium">
        <option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="urgent">urgent</option>
      </select>
      <button className="w-full bg-slate-800 text-white">Create task</button>
    </form>
  );
}
