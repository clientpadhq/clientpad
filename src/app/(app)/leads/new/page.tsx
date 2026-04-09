import { LeadForm } from "@/components/forms/lead-form";
import { PageHeader } from "@/components/ui/page-header";
import { createLeadAction } from "@/lib/actions/leads";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { getWorkspaceMembers } from "@/lib/db/workspace";

export default async function NewLeadPage() {
  const { workspace } = await requireWorkspace();
  const members = await getWorkspaceMembers(workspace.id);

  return (
    <div className="space-y-4">
      <PageHeader title="New Lead" description="Add a lead quickly and assign ownership." />
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <LeadForm action={createLeadAction} members={members} />
      </div>
    </div>
  );
}
