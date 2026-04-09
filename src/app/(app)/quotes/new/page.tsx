import { PageHeader } from "@/components/ui/page-header";
import { QuoteForm } from "@/components/revenue/quote-form";
import { createQuoteAction } from "@/lib/actions/revenue";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { listClients } from "@/lib/db/clients";
import { listDeals } from "@/lib/db/deals";

export default async function NewQuotePage() {
  const { workspace } = await requireWorkspace();
  const [clients, deals] = await Promise.all([listClients(workspace.id), listDeals(workspace.id)]);

  return (
    <div className="space-y-4">
      <PageHeader title="New Quote" description="Create a professional quote for your client." />
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <QuoteForm action={createQuoteAction} clients={clients} deals={deals} />
      </div>
    </div>
  );
}
