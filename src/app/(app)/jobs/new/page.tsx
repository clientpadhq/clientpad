import { PageHeader } from "@/components/ui/page-header";
import { JobForm } from "@/components/execution/job-form";
import { createJobAction } from "@/lib/actions/execution";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { listClients } from "@/lib/db/clients";
import { listDeals } from "@/lib/db/deals";
import { listInvoices } from "@/lib/db/revenue";
import { getWorkspaceMembers } from "@/lib/db/workspace";
type InvoiceOption = { id: string; invoice_number: string };

export default async function NewJobPage({ searchParams }: { searchParams: Promise<{ dealId?: string; clientId?: string; invoiceId?: string }> }) {
  const { workspace } = await requireWorkspace();
  const [clients, deals, invoices, members, params] = await Promise.all([
    listClients(workspace.id),
    listDeals(workspace.id),
    listInvoices(workspace.id),
    getWorkspaceMembers(workspace.id),
    searchParams,
  ]);

  const initial = {
    deal_id: params.dealId ?? "",
    client_id: params.clientId ?? "",
    invoice_id: params.invoiceId ?? "",
  };

  return <div className="space-y-4"><PageHeader title="New Job" description="Create execution job." /><div className="rounded-lg border border-slate-200 bg-white p-4"><JobForm action={createJobAction} job={initial} clients={clients} deals={deals} invoices={invoices as InvoiceOption[]} members={members} /></div></div>;
}
