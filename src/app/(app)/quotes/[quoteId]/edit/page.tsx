import { PageHeader } from "@/components/ui/page-header";
import { QuoteForm } from "@/components/revenue/quote-form";
import { updateQuoteAction } from "@/lib/actions/revenue";
import { AIGenerateCard } from "@/components/ai/ai-generate-card";
import { listClients } from "@/lib/db/clients";
import { listDeals } from "@/lib/db/deals";
import { getQuote } from "@/lib/db/revenue";
import { requireWorkspace } from "@/lib/rbac/permissions";
type QuoteClient = { business_name: string | null };
type QuoteItemInput = { description: string; quantity: number; unit_price: number; notes?: string | null };

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
      <AIGenerateCard title="Quote text drafting" description="Draft scope and terms phrasing. Review and copy into editable fields." generationType="quote_text_draft" entityType="quote" entityId={quoteId} returnPath={`/quotes/${quoteId}/edit`} context={{ quote_number: quoteData.quote.quote_number, client: (quoteData.quote as typeof quoteData.quote & { client?: QuoteClient | null }).client?.business_name, existing_notes: quoteData.quote.notes, existing_terms: quoteData.quote.terms }} />
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <QuoteForm action={action} clients={clients} deals={deals} quote={quoteData.quote} items={quoteData.items as QuoteItemInput[]} />
      </div>
    </div>
  );
}
