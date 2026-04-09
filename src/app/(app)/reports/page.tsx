import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { getReportingSnapshot } from "@/lib/db/reports";
import { formatNaira } from "@/lib/revenue/calculations";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: "7d"|"30d"|"month" }> }) {
  const { workspace } = await requireWorkspace("admin");
  const params = await searchParams;
  const range = params.range ?? "30d";
  const report = await getReportingSnapshot(workspace.id, range);

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" description="Lightweight operational reporting snapshot." />
      <form className="flex gap-2" method="get">
        <select name="range" defaultValue={range}><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="month">This month</option></select>
        <button className="border border-slate-300">Apply</button>
      </form>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Card title="Lead → Deal"><p className="text-sm">Leads: {report.leadsCreated}</p><p className="text-sm">Deals: {report.dealsCreated}</p><p className="text-sm">Conversion: {report.leadToDealConversion}%</p></Card>
        <Card title="Quotes"><p className="text-sm">Sent: {report.quotesSent}</p><p className="text-sm">Accepted: {report.quotesAccepted}</p></Card>
        <Card title="Invoices"><p className="text-sm">Invoiced: {formatNaira(report.totalInvoiced)}</p><p className="text-sm">Paid: {formatNaira(report.totalPaid)}</p><p className="text-sm">Overdue: {report.overdueInvoices}</p></Card>
        <Card title="Jobs"><p className="text-sm">Completed on time: {report.jobsCompletedOnTime}</p></Card>
        <Card title="Tasks"><p className="text-sm">Completion rate: {report.taskCompletionRate}%</p></Card>
        <Card title="Reminders"><p className="text-sm">Completion rate: {report.reminderCompletionRate}%</p></Card>
      </div>
    </div>
  );
}
