import { DealForm } from "@/components/forms/deal-form";
import { PageHeader } from "@/components/ui/page-header";
import { updateDealAction } from "@/lib/actions/deals";
import { listClients } from "@/lib/db/clients";
import { getDeal, listPipelineStages } from "@/lib/db/deals";
import { listLeads } from "@/lib/db/leads";
import { getWorkspaceMembers } from "@/lib/db/workspace";
import { requireWorkspace } from "@/lib/rbac/permissions";

export default async function EditDealPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { workspace } = await requireWorkspace();
  const { dealId } = await params;
  const [deal, stages, leads, clients, members] = await Promise.all([
    getDeal(workspace.id, dealId),
    listPipelineStages(workspace.id),
    listLeads(workspace.id),
    listClients(workspace.id),
    getWorkspaceMembers(workspace.id),
  ]);

  const action = updateDealAction.bind(null, dealId);

  return (
    <div className="space-y-4">
      <PageHeader title="Edit Deal" description="Update stage, amount, and ownership." />
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <DealForm action={action} stages={stages} leads={leads} clients={clients} members={members} deal={deal} />
      </div>
    </div>
  );
}
