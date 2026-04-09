export type ActivityRow = {
  id: string;
  description: string;
  created_at: string;
  activity_type: string;
};

export function ActivityList({ items }: { items: ActivityRow[] }) {
  if (!items.length) {
    return <p className="text-sm text-slate-500">No activity yet.</p>;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="rounded border border-slate-200 p-3">
          <p className="text-sm text-slate-800">{item.description}</p>
          <p className="mt-1 text-xs text-slate-500">
            {new Date(item.created_at).toLocaleString()} • {item.activity_type}
          </p>
        </li>
      ))}
    </ul>
  );
}
