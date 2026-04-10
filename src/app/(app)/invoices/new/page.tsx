import { PageHeader } from "@/components/ui/page-header";
import { InvoiceForm } from "@/components/revenue/invoice-form";
import { createInvoiceAction } from "@/lib/actions/revenue";
import { listClients } from "@/lib/db/clients";
import { listDeals } from "@/lib/db/deals";
import { listQuotes } from "@/lib/db/revenue";
import { requireWorkspace } from "@/lib/rbac/permissions";
type QuoteOption = { id: string; quote_number: string };

export default async function NewInvoicePage() {
  const { workspace } = await requireWorkspace();
  const [clients, deals, quotes] = await Promise.all([
    listClients(workspace.id),
    listDeals(workspace.id),
    listQuotes(workspace.id),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader title="New Invoice" description="Create invoice and send payment request." />
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <InvoiceForm action={createInvoiceAction} clients={clients} deals={deals} quotes={quotes as QuoteOption[]} />
      </div>
    </div>
  );
}
