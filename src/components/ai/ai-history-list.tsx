type AIHistoryRow = {
  id: string;
  generation_type: string;
  status: string;
  created_at: string;
  provider: string | null;
  model: string | null;
  output_text: string | null;
  error_message: string | null;
};

export function AIHistoryList({ rows }: { rows: AIHistoryRow[] }) {
  if (!rows.length) return <p className="text-sm text-slate-600">No AI history yet.</p>;

  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.id} className="rounded border border-slate-200 p-3 text-sm">
          <p className="font-medium">{row.generation_type} • {row.status}</p>
          <p className="text-xs text-slate-500">
            {new Date(row.created_at).toLocaleString()} • {row.provider ?? "-"}/{row.model ?? "-"}
          </p>
          {row.output_text ? (
            <textarea readOnly value={row.output_text} rows={4} className="mt-2 text-xs" />
          ) : (
            <p className="mt-1 text-xs text-red-600">{row.error_message ?? "No output"}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
