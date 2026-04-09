import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ActivityList } from "@/components/ui/activity-list";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { getClient } from "@/lib/db/clients";
import { createClient } from "@/lib/supabase/server";

export default async function ClientDetailPage({ params }: { params: Promise<{ clientId: string }> }) {
  const { workspace } = await requireWorkspace();
  const { clientId } = await params;
  const client = await getClient(workspace.id, clientId);

  const supabase = await createClient();
  const { data: activities } = await supabase
    .from("activities")
    .select("id, description, created_at, activity_type")
    .eq("workspace_id", workspace.id)
    .eq("entity_type", "client")
    .eq("entity_id", clientId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <PageHeader
        title={client.business_name}
        description="Client details and history"
        action={
          <Link className="rounded-md border border-slate-300 px-4 py-2 text-sm" href={`/clients/${client.id}/edit`}>
            Edit client
          </Link>
        }
      />
      <Card title="Client Info">
        <dl className="grid gap-2 text-sm">
          <div><dt className="text-slate-500">Primary contact</dt><dd>{client.primary_contact ?? "-"}</dd></div>
          <div><dt className="text-slate-500">Phone</dt><dd>{client.phone ?? "-"}</dd></div>
          <div><dt className="text-slate-500">Email</dt><dd>{client.email ?? "-"}</dd></div>
          <div><dt className="text-slate-500">Location</dt><dd>{client.location ?? "-"}</dd></div>
          <div><dt className="text-slate-500">Notes</dt><dd>{client.notes ?? "-"}</dd></div>
        </dl>
      </Card>
      <Card title="Activity">
        <ActivityList items={(activities ?? [])} />
      </Card>
    </div>
  );
}
