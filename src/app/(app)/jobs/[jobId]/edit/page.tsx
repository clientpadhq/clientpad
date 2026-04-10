import { PageHeader } from "@/components/ui/page-header";
import { JobForm } from "@/components/execution/job-form";
import { updateJobAction } from "@/lib/actions/execution";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { listClients } from "@/lib/db/clients";
import { listDeals } from "@/lib/db/deals";
import { listInvoices } from "@/lib/db/revenue";
import { getWorkspaceMembers } from "@/lib/db/workspace";
import { getJob } from "@/lib/db/execution";
type InvoiceOption = { id: string; invoice_number: string };

export default async function EditJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { workspace } = await requireWorkspace();
  const { jobId } = await params;
  const [clients, deals, invoices, members, jobData] = await Promise.all([listClients(workspace.id), listDeals(workspace.id), listInvoices(workspace.id), getWorkspaceMembers(workspace.id), getJob(workspace.id, jobId)]);
  return <div className="space-y-4"><PageHeader title="Edit Job" description="Update ownership, status and execution details." /><div className="rounded-lg border border-slate-200 bg-white p-4"><JobForm action={updateJobAction.bind(null, jobId)} job={jobData.job} clients={clients} deals={deals} invoices={invoices as InvoiceOption[]} members={members} /></div></div>;
}
