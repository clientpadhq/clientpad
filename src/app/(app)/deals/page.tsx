import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { ExportButton } from "@/components/ui/export-button";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { listDeals, listPipelineStages } from "@/lib/db/deals";

export default async function DealsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { workspace } = await requireWorkspace();
  const [deals, stages, params] = await Promise.all([
    listDeals(workspace.id),
    listPipelineStages(workspace.id),
    searchParams,
  ]);

  const exportParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (typeof value === "string" && value.trim()) exportParams.set(key, value);
  }

  const grouped = stages.map((stage) => ({
    stage,
    deals: deals.filter((deal) => deal.stage_id === stage.id),
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Deals"
        description="Track opportunities by pipeline stage."
        action={
          <div className="flex items-center gap-2">
            <ExportButton href={`/api/exports/deals${exportParams.toString() ? `?${exportParams.toString()}` : ""}`} />
            <Link className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white" href="/deals/new">
              New deal
            </Link>
          </div>
        }
      />

      {deals.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
          No deals yet. Create your first deal to start tracking pipeline value.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {grouped.map(({ stage, deals: stageDeals }) => (
            <section key={stage.id} className="rounded-lg border border-slate-200 bg-white p-3">
              <h2 className="mb-2 text-sm font-semibold text-slate-700">{stage.name}</h2>
              <ul className="space-y-2">
                {stageDeals.length === 0 ? (
                  <li className="rounded border border-dashed border-slate-200 p-2 text-xs text-slate-500">No deals</li>
                ) : (
                  stageDeals.map((deal) => (
                    <li key={deal.id} className="rounded border border-slate-200 p-2">
                      <Link href={`/deals/${deal.id}`} className="text-sm font-medium text-slate-900">
                        {deal.title}
                      </Link>
                      <p className="text-xs text-slate-500">NGN {Number(deal.amount).toLocaleString()}</p>
                    </li>
                  ))
                )}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
