import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { ActivityList } from "@/components/ui/activity-list";
import { ReminderList } from "@/components/execution/reminder-list";
import { AIHistoryList } from "@/components/ai/ai-history-list";
import { SetupReadinessCard } from "@/components/onboarding/setup-readiness-card";
import { requireWorkspace, canManageSettings } from "@/lib/rbac/permissions";
import { getDashboardStats } from "@/lib/db/dashboard";
import { getRevenueMetrics } from "@/lib/db/revenue";
import { getExecutionMetrics, listOpenReminders } from "@/lib/db/execution";
import { formatNaira } from "@/lib/revenue/calculations";
import { createReminderAction } from "@/lib/actions/execution";
import { generateWeeklyDigestAction } from "@/lib/actions/ai";
import { listAIGenerations } from "@/lib/db/ai";
import { getSetupReadiness } from "@/lib/onboarding/readiness";

export default async function DashboardPage() {
  const { workspace, user, role } = await requireWorkspace();
  const [stats, revenue, execution, reminders, digestRows, readiness] = await Promise.all([
import { AIHistoryList } from "@/components/ai/ai-history-list";

export default async function DashboardPage() {
  const { workspace, user } = await requireWorkspace();
  const [stats, revenue, execution, reminders, digestRows] = await Promise.all([
    getDashboardStats(workspace.id),
    getRevenueMetrics(workspace.id),
    getExecutionMetrics(workspace.id, user.id),
    listOpenReminders(workspace.id),
    listAIGenerations(workspace.id),
    canManageSettings(role) ? getSetupReadiness(workspace.id) : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-4">
      <PageHeader title="Dashboard" description="Track lead, revenue, and execution operations." />

      {readiness ? <SetupReadinessCard readiness={readiness} /> : null}

      <div className="grid gap-3 md:grid-cols-3">
        <Card title="Total Leads">
          <p className="text-2xl font-semibold">{stats.totalLeads}</p>
        </Card>
        <Card title="Active Deals">
          <p className="text-2xl font-semibold">{stats.activeDeals}</p>
        </Card>
        <Card title="Pipeline Value">
          <p className="text-2xl font-semibold">{formatNaira(stats.pipelineValue)}</p>
        </Card>
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

      <Card title="Open Reminders">
        <ReminderList reminders={reminders} />
      </Card>
      <Card title="Weekly AI Digest (Optional)">
        <form action={generateWeeklyDigestAction} className="mb-3">
          <button className="bg-emerald-700 text-white">Generate weekly digest</button>
        </form>
        <AIHistoryList rows={(digestRows ?? []).filter((row: any) => row.generation_type === "weekly_digest").slice(0, 3)} />
        <form action={generateWeeklyDigestAction} className="mb-3"><button className="bg-emerald-700 text-white">Generate weekly digest</button></form>
        <AIHistoryList rows={(digestRows ?? []).filter((row) => row.generation_type === "weekly_digest").slice(0, 3)} />
      </Card>

      <Card title="Recent Activity">
        <ActivityList items={stats.recentActivity} />
      </Card>
    </div>
  );
}
