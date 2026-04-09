import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ActivityList } from "@/components/ui/activity-list";
import { QuickTaskForm } from "@/components/execution/quick-task-form";
import { ReminderList } from "@/components/execution/reminder-list";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { AIGenerateCard } from "@/components/ai/ai-generate-card";
import { AIHistoryList } from "@/components/ai/ai-history-list";
import { listAIGenerations } from "@/lib/db/ai";
import { getDeal } from "@/lib/db/deals";
import { createClient } from "@/lib/supabase/server";
import { StatusBadge } from "@/components/revenue/status-badge";

export default async function DealDetailPage({ params }: { params: Promise<{ dealId: string }> }) {
  const { workspace } = await requireWorkspace();
  const { dealId } = await params;
  const deal = await getDeal(workspace.id, dealId);

  const supabase = await createClient();
  const [aiRows, { data: activities }, { data: tasks }, { data: reminders }] = await Promise.all([
    listAIGenerations(workspace.id, "deal", dealId),
  const [{ data: activities }, { data: tasks }, { data: reminders }] = await Promise.all([
    supabase.from("activities").select("id, description, created_at, activity_type").eq("workspace_id", workspace.id).eq("entity_type", "deal").eq("entity_id", dealId).order("created_at", { ascending: false }),
    supabase.from("tasks").select("*").eq("workspace_id", workspace.id).eq("related_entity_type", "deal").eq("related_entity_id", dealId).order("due_at", { ascending: true }),
    supabase.from("reminders").select("*").eq("workspace_id", workspace.id).eq("related_entity_type", "deal").eq("related_entity_id", dealId).eq("status", "open").order("due_at", { ascending: true }),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader
        title={deal.title}
        description="Deal details and stage tracking"
        action={<Link className="rounded-md border border-slate-300 px-4 py-2 text-sm" href={`/deals/${deal.id}/edit`}>Edit deal</Link>}
      />
      <Card title="Deal Info">
        <dl className="grid gap-2 text-sm">
          <div><dt className="text-slate-500">Stage</dt><dd>{deal.stage?.name ?? "-"}</dd></div>
          <div><dt className="text-slate-500">Amount</dt><dd>NGN {Number(deal.amount).toLocaleString()}</dd></div>
          <div><dt className="text-slate-500">Expected close date</dt><dd>{deal.expected_close_date ?? "-"}</dd></div>
          <div><dt className="text-slate-500">Linked lead</dt><dd>{deal.lead?.name ?? "-"}</dd></div>
          <div><dt className="text-slate-500">Linked client</dt><dd>{deal.client?.business_name ?? "-"}</dd></div>
          <div><dt className="text-slate-500">Notes</dt><dd>{deal.notes ?? "-"}</dd></div>
        </dl>
        {deal.stage?.name === "Won" ? <div className="mt-3"><Link href={`/jobs/new?dealId=${deal.id}&clientId=${deal.client_id ?? ""}`} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white">Create job from won deal</Link></div> : <p className="mt-2 text-xs text-slate-500">Mark deal as Won to create execution job.</p>}
      </Card>
      <Card title="Deal Tasks"><QuickTaskForm entityType="deal" entityId={dealId} titlePrefix={deal.title} /><ul className="mt-3 space-y-2 text-sm">{(tasks ?? []).map((task:any)=><li key={task.id} className="rounded border border-slate-200 p-2"><Link href={`/tasks/${task.id}`} className="font-medium">{task.title}</Link><div className="mt-1"><StatusBadge status={task.status} /></div></li>)}</ul></Card>
      <Card title="Deal Reminders"><ReminderList reminders={reminders ?? []} /></Card>
      <Card title="AI Copilot (Optional)">
        <div className="grid gap-3 md:grid-cols-2">
          <AIGenerateCard
            title="Follow-up draft"
            description="Generate a practical follow-up draft for this deal."
            generationType="follow_up_draft"
            entityType="deal"
            entityId={dealId}
            returnPath={`/deals/${dealId}`}
            context={{ deal_title: deal.title, stage: deal.stage?.name, amount: deal.amount, expected_close_date: deal.expected_close_date, notes: deal.notes }}
          />
          <AIGenerateCard
            title="Next-step suggestions"
            description="Get recommendation-only next steps for closing or progressing this deal."
            generationType="next_step_suggestion"
            entityType="deal"
            entityId={dealId}
            returnPath={`/deals/${dealId}`}
            context={{ deal_title: deal.title, stage: deal.stage?.name, client: deal.client?.business_name, amount: deal.amount, notes: deal.notes }}
          />
        </div>
        <div className="mt-3"><AIHistoryList rows={aiRows} /></div>
      </Card>

      <Card title="Activity"><ActivityList items={(activities ?? [])} /></Card>
    </div>
  );
}
