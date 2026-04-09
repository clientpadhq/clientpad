import { PageHeader } from "@/components/ui/page-header";
import { QuoteForm } from "@/components/revenue/quote-form";
import { updateQuoteAction } from "@/lib/actions/revenue";
import { listClients } from "@/lib/db/clients";
import { listDeals } from "@/lib/db/deals";
import { getQuote } from "@/lib/db/revenue";
import { requireWorkspace } from "@/lib/rbac/permissions";

export default async function EditQuotePage({ params }: { params: Promise<{ quoteId: string }> }) {
  const { workspace } = await requireWorkspace();
  const { quoteId } = await params;

  const [clients, deals, quoteData] = await Promise.all([
    listClients(workspace.id),
    listDeals(workspace.id),
    getQuote(workspace.id, quoteId),
  ]);

  const action = updateQuoteAction.bind(null, quoteId);

  return (
    <div className="space-y-4">
      <PageHeader title="Edit Quote" description="Update quote details and status." />
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <QuoteForm action={action} clients={clients} deals={deals} quote={quoteData.quote} items={quoteData.items as any} />
      </div>
    </div>
  );
}
