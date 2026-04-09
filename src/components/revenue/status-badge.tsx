export function StatusBadge({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    draft: "bg-slate-100 text-slate-700",
    sent: "bg-blue-100 text-blue-700",
    accepted: "bg-emerald-100 text-emerald-700",
    rejected: "bg-red-100 text-red-700",
    expired: "bg-orange-100 text-orange-700",
    issued: "bg-indigo-100 text-indigo-700",
    partially_paid: "bg-amber-100 text-amber-700",
    paid: "bg-green-100 text-green-700",
    overdue: "bg-rose-100 text-rose-700",
    cancelled: "bg-slate-200 text-slate-700",
    successful: "bg-green-100 text-green-700",
    failed: "bg-red-100 text-red-700",
    manually_recorded: "bg-purple-100 text-purple-700",
  };

  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${colorMap[status] ?? "bg-slate-100 text-slate-700"}`}>{status.replaceAll("_", " ")}</span>;
}
