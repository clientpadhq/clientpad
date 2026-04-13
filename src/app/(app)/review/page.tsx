import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { AIHistoryList } from "@/components/ai/ai-history-list";
import { getSetupReadiness } from "@/lib/onboarding/readiness";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { formatNaira } from "@/lib/revenue/calculations";
import { getWeeklyReviewSnapshot, STALLED_DEAL_DAYS } from "@/lib/db/review";
import { getWorkspaceAISettings, listAIGenerations } from "@/lib/db/ai";
import { getWorkspaceFeedbackSummary, getWorkspacePilotProfile } from "@/lib/db/pilot";
import { generateWeeklyDigestAction } from "@/lib/actions/ai";

export default async function ReviewPage() {
  const { workspace } = await requireWorkspace("admin");

  const [review, readiness, aiSettings, aiRows, feedbackSummary, pilotProfile] = await Promise.all([
    getWeeklyReviewSnapshot(workspace.id),
    getSetupReadiness(workspace.id),
    getWorkspaceAISettings(workspace.id),
    listAIGenerations(workspace.id),
    getWorkspaceFeedbackSummary(workspace.id),
    getWorkspacePilotProfile(workspace.id),
  ]);

  const digestRows = aiRows.filter((row) => row.generation_type === "weekly_digest").slice(0, 2);
  const canUseAiSummary = (aiSettings?.ai_enabled ?? true) && Boolean(aiSettings?.default_provider && aiSettings?.default_model);

  return (
    <div className="space-y-4">
      <PageHeader title="Weekly Review" description="Deterministic pilot operations summary for the last 7 days." />

      <Card title="Data window">
        <p className="text-sm text-slate-700">{review.windowLabel}</p>
        <p className="text-xs text-slate-500">Generated at: {new Date(review.generatedAt).toLocaleString()}</p>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card title="Leads">
          <p className="text-sm">New leads: {review.metrics.newLeads}</p>
          <p className="text-sm">Leads converted to deals: {review.metrics.leadsConvertedToDeals}</p>
        </Card>
        <Card title="Quotes">
          <p className="text-sm">Quotes sent: {review.metrics.quotesSent}</p>
          <p className="text-sm">Quotes accepted: {review.metrics.quotesAccepted}</p>
        </Card>
        <Card title="Invoices">
          <p className="text-sm">Issued: {review.metrics.invoicesIssued}</p>
          <p className="text-sm">Paid: {review.metrics.invoicesPaid}</p>
          <p className="text-sm">Outstanding: {formatNaira(review.metrics.outstandingBalance)}</p>
          <p className="text-sm">Overdue: {review.metrics.overdueInvoices}</p>
        </Card>
        <Card title="Execution">
          <p className="text-sm">Jobs completed: {review.metrics.jobsCompleted}</p>
          <p className="text-sm">Overdue jobs: {review.metrics.overdueJobs}</p>
          <p className="text-sm">Task completion: {review.metrics.taskCompletionRate}%</p>
          <p className="text-sm">Reminder completion: {review.metrics.reminderCompletionRate}%</p>
        </Card>
      </div>

      <Card title="Workspace health (actionable)">
        <ul className="space-y-1 text-sm text-slate-700">
          <li>Setup readiness: {readiness.completionPercent}% complete.</li>
          <li>Attention now: {review.topAttention.stalledDeals} stalled deals, {review.topAttention.overdueInvoices} overdue invoices, {review.topAttention.jobsAtRisk} jobs at risk.</li>
          <li>Operational load: {review.topAttention.openTasks} open tasks, {review.topAttention.openReminders} open reminders.</li>
          <li>Ownership gaps: {review.topAttention.unassignedJobs} unassigned jobs, {review.topAttention.unassignedTasks} unassigned tasks.</li>
          <li>Pilot status: {pilotProfile?.pilot_status ?? "onboarding"} • customer stage: {pilotProfile?.customer_stage ?? "trial"}.</li>
          <li>Pilot learning: {feedbackSummary.open} open feedback items, {feedbackSummary.criticalOpen} critical open, {feedbackSummary.followUpDue} follow-up due.</li>
        </ul>
        <div className="mt-2 flex flex-wrap gap-2 text-xs">
          <Link className="rounded border border-slate-300 px-2 py-1" href="/settings">Open setup checklist</Link>
          <Link className="rounded border border-slate-300 px-2 py-1" href="/deals">Open stalled deals</Link>
          <Link className="rounded border border-slate-300 px-2 py-1" href="/invoices?status=overdue">Open overdue invoices</Link>
          <Link className="rounded border border-slate-300 px-2 py-1" href="/jobs">Open jobs at risk</Link>
          <Link className="rounded border border-slate-300 px-2 py-1" href="/tasks">Open overdue tasks</Link>
          <Link className="rounded border border-slate-300 px-2 py-1" href="/insights">Open pilot insights</Link>
        </div>
      </Card>

      <Card title="Collection pressure (invoice aging)">
        <div className="grid gap-2 md:grid-cols-2">
          {review.agingBands.map((band) => (
            <div key={band.key} className="rounded border border-slate-200 p-3 text-sm">
              <p className="font-medium">{band.label}</p>
              <p>Count: {band.count}</p>
              <p>Outstanding: {formatNaira(band.balance)}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title={`Stalled deals (${STALLED_DEAL_DAYS}+ days without updates)`}>
          {review.stalledDeals.length === 0 ? (
            <p className="text-sm text-slate-600">No stalled deals right now.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {review.stalledDeals.map((deal) => (
                <li key={deal.id} className="rounded border border-slate-200 p-2">
                  <Link href={`/deals/${deal.id}`} className="font-medium text-emerald-700 underline">{deal.title}</Link>
                  <p className="text-xs text-slate-500">Last update: {new Date(deal.updated_at).toLocaleDateString()}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Jobs at risk">
          {review.jobsAtRisk.length === 0 ? (
            <p className="text-sm text-slate-600">No at-risk jobs right now.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {review.jobsAtRisk.map((job) => (
                <li key={job.id} className="rounded border border-slate-200 p-2">
                  <Link href={`/jobs/${job.id}`} className="font-medium text-emerald-700 underline">{job.title}</Link>
                  <p className="text-xs text-slate-500">Status: {job.status} • Due: {job.due_date ?? "—"}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Overdue invoices needing follow-up">
          {review.overdueInvoices.length === 0 ? (
            <p className="text-sm text-slate-600">No overdue invoices.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {review.overdueInvoices.map((invoice) => (
                <li key={invoice.id} className="rounded border border-slate-200 p-2">
                  <Link href={`/invoices/${invoice.id}`} className="font-medium text-emerald-700 underline">{invoice.invoice_number}</Link>
                  <p className="text-xs text-slate-500">Due: {invoice.due_date ?? "—"} • Balance: {formatNaira(Number(invoice.balance_amount ?? 0))}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Overdue tasks">
          {review.overdueTasks.length === 0 ? (
            <p className="text-sm text-slate-600">No overdue tasks.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {review.overdueTasks.map((task) => (
                <li key={task.id} className="rounded border border-slate-200 p-2">
                  <p className="font-medium">{task.title}</p>
                  <p className="text-xs text-slate-500">Due: {task.due_at ? new Date(task.due_at).toLocaleString() : "—"}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Optional AI weekly summary">
        {canUseAiSummary ? (
          <>
            <p className="mb-2 text-xs text-slate-500">Deterministic metrics above are source of truth. AI summary is supplementary.</p>
            <form action={generateWeeklyDigestAction} className="mb-3">
              <button className="bg-emerald-700 text-white">Generate AI weekly summary</button>
            </form>
            <AIHistoryList rows={digestRows} />
          </>
        ) : (
          <p className="text-sm text-slate-600">AI summary unavailable until AI provider/model is configured in settings.</p>
        )}
      </Card>
    </div>
  );
}
