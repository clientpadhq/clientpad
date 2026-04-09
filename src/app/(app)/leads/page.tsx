import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { listLeads } from "@/lib/db/leads";

export default async function LeadsPage() {
  const { workspace } = await requireWorkspace();
  const leads = await listLeads(workspace.id);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Leads"
        description="Capture and follow up on every opportunity."
        action={
          <Link className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white" href="/leads/new">
            New lead
          </Link>
        }
      />

      {leads.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          No leads yet. Create your first lead to start tracking opportunities.
        </div>
      ) : (
        <ul className="space-y-2">
          {leads.map((lead) => (
            <li key={lead.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <Link href={`/leads/${lead.id}`} className="font-medium text-slate-900">
                {lead.name}
              </Link>
              <p className="text-sm text-slate-600">{lead.phone}</p>
              <p className="mt-1 text-xs text-slate-500">Status: {lead.status}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
