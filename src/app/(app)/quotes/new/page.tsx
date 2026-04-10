import { PageHeader } from "@/components/ui/page-header";
import { QuoteForm } from "@/components/revenue/quote-form";
import { createQuoteAction } from "@/lib/actions/revenue";
import { AIGenerateCard } from "@/components/ai/ai-generate-card";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { listClients } from "@/lib/db/clients";
import { listDeals } from "@/lib/db/deals";
import { getPaymentSettings } from "@/lib/db/revenue";

export default async function NewQuotePage() {
  const { workspace } = await requireWorkspace();
  const [clients, deals, paymentSettings] = await Promise.all([
    listClients(workspace.id),
    listDeals(workspace.id),
    getPaymentSettings(workspace.id),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader title="New Quote" description="Create a professional quote for your client." />
      <AIGenerateCard title="Quote text drafting" description="Draft service/scope wording and optional terms text (no totals changed)." generationType="quote_text_draft" entityType="quote" entityId="" returnPath="/quotes/new" context={{ business_types: "agency/installer/printer", service_context: "describe service", line_item_hint: "draft text only" }} />
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <QuoteForm action={createQuoteAction} clients={clients} deals={deals} defaultTerms={paymentSettings?.quote_default_terms ?? ""} />
      </div>
    </div>
  );
}
