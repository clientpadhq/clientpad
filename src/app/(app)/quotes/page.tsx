import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { StatusBadge } from "@/components/revenue/status-badge";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { listQuotes } from "@/lib/db/revenue";
import { formatNaira } from "@/lib/revenue/calculations";
type QuoteListRow = { client?: { business_name: string | null } | null };

export default async function QuotesPage() {
  const { workspace } = await requireWorkspace();
  const quotes = await listQuotes(workspace.id);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Quotes"
        description="Create and manage client quotations."
        action={<Link href="/quotes/new" className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white">New quote</Link>}
      />

      {quotes.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">No quotes yet.</div>
      ) : (
        <ul className="space-y-2">
          {quotes.map((quote) => {
            const row = quote as typeof quote & QuoteListRow;
            return (
            <li key={quote.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <Link href={`/quotes/${quote.id}`} className="font-medium text-slate-900">{quote.quote_number}</Link>
                <StatusBadge status={quote.status} />
              </div>
              <p className="text-sm text-slate-600">{row.client?.business_name ?? "No client"}</p>
              <p className="text-xs text-slate-500">{formatNaira(Number(quote.total_amount))}</p>
            </li>
          );})}
        </ul>
      )}
    </div>
  );
}
