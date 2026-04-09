import { DealForm } from "@/components/forms/deal-form";
import { PageHeader } from "@/components/ui/page-header";
import { createDealAction } from "@/lib/actions/deals";
import { listClients } from "@/lib/db/clients";
import { listLeads } from "@/lib/db/leads";
import { listPipelineStages } from "@/lib/db/deals";
import { getWorkspaceMembers } from "@/lib/db/workspace";
import { requireWorkspace } from "@/lib/rbac/permissions";

export default async function NewDealPage() {
  const { workspace } = await requireWorkspace();
  const [stages, leads, clients, members] = await Promise.all([
    listPipelineStages(workspace.id),
    listLeads(workspace.id),
    listClients(workspace.id),
    getWorkspaceMembers(workspace.id),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader title="New Deal" description="Create a pipeline opportunity." />
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <DealForm action={createDealAction} stages={stages} leads={leads} clients={clients} members={members} />
      </div>
    </div>
  );
}
