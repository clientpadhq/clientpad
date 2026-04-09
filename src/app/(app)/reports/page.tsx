import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { getReportingSnapshot } from "@/lib/db/reports";
import { formatNaira } from "@/lib/revenue/calculations";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ range?: "7d" | "30d" | "month" }> }) {
  const { workspace } = await requireWorkspace("admin");
  const params = await searchParams;
  const range = params.range ?? "30d";
  const report = await getReportingSnapshot(workspace.id, range);

  const reportStateCopy =
    report.dataStatus === "failed"
      ? {
          className: "rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800",
          title: "Report data could not be loaded.",
          body: "All report queries failed. Values shown are zeroed fallbacks.",
        }
      : report.dataStatus === "partial"
        ? {
            className: "rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900",
            title: "Report contains partial data.",
            body: `Some metrics failed to load: ${report.failedSources.join("; ")}`,
          }
        : {
            className: "rounded border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900",
            title: "Report loaded successfully.",
            body: "All reporting queries completed successfully.",
          };

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" description="Lightweight operational reporting snapshot." />
      <form className="flex gap-2" method="get">
        <select name="range" defaultValue={range}>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="month">This month</option>
        </select>
        <button className="border border-slate-300">Apply</button>
      </form>

      <div className={reportStateCopy.className}>
        <p className="font-medium">{reportStateCopy.title}</p>
        <p>{reportStateCopy.body}</p>
        <p className="mt-1 text-xs opacity-80">Generated at: {new Date(report.generatedAt).toLocaleString()}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        <Card title="Lead → Deal">
          <p className="text-sm">Leads (cohort): {report.leadsCreated}</p>
          <p className="text-sm">Deals created in range: {report.dealsCreated}</p>
          <p className="text-sm">Converted cohort leads: {report.convertedLeads}</p>
          <p className="text-sm">Conversion: {report.leadToDealConversion}%</p>
        </Card>
        <Card title="Quotes">
          <p className="text-sm">Sent: {report.quotesSent}</p>
          <p className="text-sm">Accepted: {report.quotesAccepted}</p>
        </Card>
        <Card title="Invoices">
          <p className="text-sm">Invoiced: {formatNaira(report.totalInvoiced)}</p>
          <p className="text-sm">Paid: {formatNaira(report.totalPaid)}</p>
          <p className="text-sm">Overdue: {report.overdueInvoices}</p>
        </Card>
        <Card title="Jobs">
          <p className="text-sm">Completed on time: {report.jobsCompletedOnTime}</p>
        </Card>
        <Card title="Tasks">
          <p className="text-sm">Completion rate: {report.taskCompletionRate}%</p>
        </Card>
        <Card title="Reminders">
          <p className="text-sm">Completion rate: {report.reminderCompletionRate}%</p>
        </Card>
      </div>

      <Card title="Metric definitions">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>
            <span className="font-medium">Lead → Deal conversion</span>: leads created in the selected range that have at least one linked deal
            created on or before report generation time, divided by leads created in the selected range.
          </li>
          <li>
            <span className="font-medium">Quotes sent</span>: quote statuses normalized to lowercase and counted when status is
            <code> sent</code> or <code>accepted</code>.
          </li>
          <li>
            <span className="font-medium">Task/Reminder completion</span>: status normalized to lowercase and counted complete when status
            is <code>done</code>. If total records are zero, completion rate is 0%.
          </li>
        </ul>
      </Card>
    </div>
  );
}
