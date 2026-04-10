import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { ExportButton } from "@/components/ui/export-button";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { listLeads } from "@/lib/db/leads";

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await requireWorkspace();
  const [leads, params] = await Promise.all([listLeads(workspace.id), searchParams]);

  const exportParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.trim()) exportParams.set(key, value);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Leads"
        description="Capture and follow up on every opportunity."
        action={
          <div className="flex items-center gap-2">
            <ExportButton href={`/api/exports/leads${exportParams.toString() ? `?${exportParams.toString()}` : ""}`} />
            <Link className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white" href="/leads/new">
              New lead
            </Link>
          </div>
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
