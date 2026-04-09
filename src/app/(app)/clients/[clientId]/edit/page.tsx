import { ClientForm } from "@/components/forms/client-form";
import { PageHeader } from "@/components/ui/page-header";
import { updateClientAction } from "@/lib/actions/clients";
import { getClient } from "@/lib/db/clients";
import { requireWorkspace } from "@/lib/rbac/permissions";

export default async function EditClientPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { workspace } = await requireWorkspace();
  const { clientId } = await params;
  const client = await getClient(workspace.id, clientId);

  const action = updateClientAction.bind(null, clientId);

  return (
    <div className="space-y-4">
      <PageHeader title="Edit Client" description="Update client record." />
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <ClientForm action={action} client={client} />
      </div>
    </div>
  );
}
