import { PageHeader } from "@/components/ui/page-header";
import { InvoiceForm } from "@/components/revenue/invoice-form";
import { updateInvoiceAction } from "@/lib/actions/revenue";
import { listClients } from "@/lib/db/clients";
import { listDeals } from "@/lib/db/deals";
import { getInvoice, listQuotes } from "@/lib/db/revenue";
import { requireWorkspace } from "@/lib/rbac/permissions";
type QuoteOption = { id: string; quote_number: string };
type InvoiceItemInput = { description: string; quantity: number; unit_price: number; notes?: string | null };

export default async function EditInvoicePage({ params }: { params: Promise<{ invoiceId: string }> }) {
  const { workspace } = await requireWorkspace();
  const { invoiceId } = await params;
  const [clients, deals, quotes, invoiceData] = await Promise.all([
    listClients(workspace.id),
    listDeals(workspace.id),
    listQuotes(workspace.id),
    getInvoice(workspace.id, invoiceId),
  ]);

  const action = updateInvoiceAction.bind(null, invoiceId);

  return (
    <div className="space-y-4">
      <PageHeader title="Edit Invoice" description="Update invoice details and amounts." />
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <InvoiceForm action={action} clients={clients} deals={deals} quotes={quotes as QuoteOption[]} invoice={invoiceData.invoice} items={invoiceData.items as InvoiceItemInput[]} />
      </div>
    </div>
  );
}
