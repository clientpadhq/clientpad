import { LeadForm } from "@/components/forms/lead-form";
import { PageHeader } from "@/components/ui/page-header";
import { updateLeadAction } from "@/lib/actions/leads";
import { getLead } from "@/lib/db/leads";
import { getWorkspaceMembers } from "@/lib/db/workspace";
import { requireWorkspace } from "@/lib/rbac/permissions";

export default async function EditLeadPage({ params }: { params: Promise<{ leadId: string }> }) {
  const { workspace } = await requireWorkspace();
  const { leadId } = await params;
  const [lead, members] = await Promise.all([
    getLead(workspace.id, leadId),
    getWorkspaceMembers(workspace.id),
  ]);

  const action = updateLeadAction.bind(null, leadId);

  return (
    <div className="space-y-4">
      <PageHeader title="Edit Lead" description="Update lead details and follow-up context." />
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <LeadForm action={action} members={members} lead={lead} />
      </div>
    </div>
  );
}
