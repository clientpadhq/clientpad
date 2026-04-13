import Link from "next/link";
import { AIHistoryList } from "@/components/ai/ai-history-list";
import { ReminderList } from "@/components/execution/reminder-list";
import { Card } from "@/components/ui/card";
import { ActivityList } from "@/components/ui/activity-list";
import { SetupReadinessCard } from "@/components/onboarding/setup-readiness-card";
import { PageHeader } from "@/components/ui/page-header";
import { generateWeeklyDigestAction } from "@/lib/actions/ai";
import { createReminderAction } from "@/lib/actions/execution";
import { listAIGenerations } from "@/lib/db/ai";
import { getDashboardStats } from "@/lib/db/dashboard";
import { getExecutionMetrics, listOpenReminders } from "@/lib/db/execution";
import { listPilotWorkspacePortfolio } from "@/lib/db/pilot";
import { getRevenueMetrics } from "@/lib/db/revenue";
import { getWeeklyReviewSnapshot } from "@/lib/db/review";
import { getSetupReadiness } from "@/lib/onboarding/readiness";
import { canManageSettings, requireWorkspace } from "@/lib/rbac/permissions";
import { formatNaira } from "@/lib/revenue/calculations";

export default async function DashboardPage() {
  const { workspace, user, role } = await requireWorkspace();
  const [stats, revenue, execution, reminders, digestRows, readiness, weeklyReview, portfolio] = await Promise.all([
    getDashboardStats(workspace.id),
    getRevenueMetrics(workspace.id),
    getExecutionMetrics(workspace.id, user.id),
    listOpenReminders(workspace.id),
    listAIGenerations(workspace.id),
    canManageSettings(role) ? getSetupReadiness(workspace.id) : Promise.resolve(null),
    canManageSettings(role) ? getWeeklyReviewSnapshot(workspace.id) : Promise.resolve(null),
    canManageSettings(role) ? listPilotWorkspacePortfolio(user.id, "7d") : Promise.resolve([]),
  ]);

  const atRiskCount = portfolio.filter((row) => row.attentionLevel === "at_risk" || row.attentionLevel === "needs_attention").length;

  return (
    <div className="space-y-4">
      <PageHeader title="Dashboard" description="Track lead, revenue, and execution operations." />

      {portfolio.length > 0 ? (
        <Card title="Pilot Portfolio Cockpit">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-slate-600">
                You are managing <span className="font-semibold text-slate-900">{portfolio.length}</span> pilot workspaces.
              </p>
              {atRiskCount > 0 ? (
                <p className="mt-1 text-sm text-red-700">
                  <span className="font-semibold">{atRiskCount}</span> workspaces require your attention this week.
                </p>
              ) : (
                <p className="mt-1 text-sm text-emerald-700">All pilot workspaces appear healthy or on track.</p>
              )}
            </div>
            <Link href="/pilots" className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800">
              Open Portfolio
            </Link>
          </div>
        </Card>
      ) : null}

      {readiness ? <SetupReadinessCard readiness={readiness} /> : null}
      {weeklyReview ? (
        <Card title="Workspace Health This Week">
          <p className="text-sm">Stalled deals: {weeklyReview.topAttention.stalledDeals}</p>
          <p className="text-sm">Overdue invoices: {weeklyReview.topAttention.overdueInvoices}</p>
          <p className="text-sm">Jobs at risk: {weeklyReview.topAttention.jobsAtRisk}</p>
          <p className="text-sm">Overdue tasks: {weeklyReview.topAttention.overdueTasks}</p>
          <a href="/review" className="mt-2 inline-block text-sm font-medium text-emerald-700 underline">
            Open weekly review
          </a>
        </Card>
      ) : null}

      <div className="grid gap-3 md:grid-cols-3">
        <Card title="Total Leads"><p className="text-2xl font-semibold">{stats.totalLeads}</p></Card>
        <Card title="Active Deals"><p className="text-2xl font-semibold">{stats.activeDeals}</p></Card>
        <Card title="Pipeline Value"><p className="text-2xl font-semibold">{formatNaira(stats.pipelineValue)}</p></Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Card title="Quotes / Invoices">
          <p className="text-sm">Quotes: {revenue.totalQuotes} (sent {revenue.quotesSent})</p>
          <p className="text-sm">Active invoices: {revenue.activeInvoices}</p>
        </Card>
        <Card title="Outstanding">
          <p className="text-xl font-semibold">{formatNaira(revenue.outstandingBalance)}</p>
          <p className="text-xs text-slate-500">Overdue invoices: {revenue.overdueInvoices}</p>
        </Card>
        <Card title="Jobs">
          <p className="text-sm">Active: {execution.activeJobs}</p>
          <p className="text-sm">Due today: {execution.jobsDueToday}</p>
          <p className="text-sm">Overdue: {execution.overdueJobs}</p>
        </Card>
        <Card title="Tasks">
          <p className="text-sm">Open: {execution.openTasks}</p>
          <p className="text-sm">Due today: {execution.tasksDueToday}</p>
          <p className="text-sm">Overdue: {execution.overdueTasks}</p>
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Card title="Accountability">
          <p className="text-sm">Assigned to me: {execution.assignedToMe}</p>
          <p className="text-sm">Unassigned items: {execution.unassignedItems}</p>
          <p className="text-sm">Reminders due: {execution.remindersDue}</p>
        </Card>
        <Card title="Create Custom Reminder">
          <form action={createReminderAction} className="space-y-2">
            <input name="title" placeholder="Reminder title" required />
            <textarea name="description" placeholder="Details" rows={2} />
            <input type="datetime-local" name="due_at" />
            <input name="related_entity_type" placeholder="related entity type (optional)" />
            <input name="related_entity_id" placeholder="related entity id (optional)" />
            <button className="w-full bg-slate-800 text-white">Create reminder</button>
          </form>
        </Card>
      </div>

      <Card title="Open Reminders"><ReminderList reminders={reminders} /></Card>

      <Card title="Weekly AI Digest (Optional)">
        <form action={generateWeeklyDigestAction} className="mb-3">
          <button className="bg-emerald-700 text-white">Generate weekly digest</button>
        </form>
        <AIHistoryList rows={(digestRows ?? []).filter((row) => row.generation_type === "weekly_digest").slice(0, 3)} />
      </Card>

      <Card title="Recent Activity"><ActivityList items={stats.recentActivity} /></Card>
    </div>
  );
}
