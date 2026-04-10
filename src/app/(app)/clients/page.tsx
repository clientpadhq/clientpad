import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { ExportButton } from "@/components/ui/export-button";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { listClients } from "@/lib/db/clients";

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await requireWorkspace();
  const [clients, params] = await Promise.all([listClients(workspace.id), searchParams]);

  const exportParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.trim()) exportParams.set(key, value);
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Clients"
        description="Manage your customer records and details."
        action={
          <div className="flex items-center gap-2">
            <ExportButton href={`/api/exports/clients${exportParams.toString() ? `?${exportParams.toString()}` : ""}`} />
            <Link className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white" href="/clients/new">
              New client
            </Link>
          </div>
        }
      />
      {clients.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          No clients yet. Add your first client.
        </div>
      ) : (
        <ul className="space-y-2">
          {clients.map((client) => (
            <li key={client.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <Link href={`/clients/${client.id}`} className="font-medium text-slate-900">
                {client.business_name}
              </Link>
              <p className="text-sm text-slate-600">{client.primary_contact ?? "No primary contact"}</p>
              <p className="text-xs text-slate-500">{client.phone ?? "No phone"}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
