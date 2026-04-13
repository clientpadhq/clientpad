import Link from "next/link";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import {
  createCheckInNoteAction,
  createFeedbackItemAction,
  updateCheckInNoteAction,
  updateFeedbackItemAction,
  updatePilotProfileAction,
} from "@/lib/actions/pilot";
import {
  CASE_STUDY_STATUS_OPTIONS,
  CHECK_IN_CONFIDENCE_OPTIONS,
  CUSTOMER_STAGE_OPTIONS,
  FEEDBACK_CATEGORY_OPTIONS,
  FEEDBACK_IMPORTANCE_OPTIONS,
  FEEDBACK_STATUS_OPTIONS,
  PILOT_STATUS_OPTIONS,
  getPilotInsightsSnapshot,
  getWorkspaceFeedbackSummary,
  getWorkspacePortfolioSummary,
  getWorkspacePilotProfile,
  listPilotWorkspacePortfolio,
  listWorkspaceCheckInNotes,
  listWorkspaceFeedbackItems,
  type InsightsRange,
} from "@/lib/db/pilot";
import { getWeeklyReviewSnapshot } from "@/lib/db/review";
import { requireWorkspace } from "@/lib/rbac/permissions";
import type { PilotStatus } from "@/types/database";

function parseRange(value?: string): InsightsRange {
  if (value === "30d" || value === "month") return value;
  return "7d";
}

function metricTone(delta: number | null | undefined) {
  if (!delta) return "text-slate-500";
  return delta > 0 ? "text-emerald-700" : "text-amber-700";
}

function formatDelta(delta: number | null | undefined, suffix = "") {
  if (delta === null || delta === undefined || delta === 0) return "No change";
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta}${suffix} vs previous`;
}

function toTitleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function pickEvidenceSummary(value: Record<string, unknown> | null) {
  if (!value) return null;
  const weeklyMetrics = typeof value.weekly_metrics === "object" && value.weekly_metrics ? (value.weekly_metrics as Record<string, unknown>) : null;
  const topAttention = typeof value.top_attention === "object" && value.top_attention ? (value.top_attention as Record<string, unknown>) : null;
  return {
    reviewWindow: typeof value.review_window === "string" ? value.review_window : null,
    leads: weeklyMetrics?.newLeads,
    overdueInvoices: topAttention?.overdueInvoices,
    jobsAtRisk: topAttention?.jobsAtRisk,
    overdueTasks: topAttention?.overdueTasks,
  };
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    feedback_status?: string;
    feedback_category?: string;
    pilot_status?: string;
    error?: string;
    success?: string;
  }>;
}) {
  const { workspace, user, role } = await requireWorkspace("admin");
  const params = await searchParams;
  const range = parseRange(params.range);

  const [pilotProfile, insights, weeklyReview, feedbackSummary, feedbackItems, checkInNotes, portfolio, workspaceSummary] = await Promise.all([
    getWorkspacePilotProfile(workspace.id),
    getPilotInsightsSnapshot(workspace.id, range),
    getWeeklyReviewSnapshot(workspace.id),
    getWorkspaceFeedbackSummary(workspace.id),
    listWorkspaceFeedbackItems(workspace.id),
    listWorkspaceCheckInNotes(workspace.id),
    listPilotWorkspacePortfolio(
      user.id,
      range,
      { pilotStatus: params.pilot_status && params.pilot_status !== "all" ? (params.pilot_status as PilotStatus) : "all" },
    ),
    getWorkspacePortfolioSummary({
      workspaceId: workspace.id,
      workspaceName: workspace.name,
      businessType: workspace.business_type,
      role,
      range,
    }),
  ]);

  const filteredFeedback = feedbackItems.filter((item) => {
    const statusMatches = !params.feedback_status || params.feedback_status === "all" || item.status === params.feedback_status;
    const categoryMatches = !params.feedback_category || params.feedback_category === "all" || item.category === params.feedback_category;
    return statusMatches && categoryMatches;
  });

  const openFeedbackOptions = feedbackItems.filter((item) => !["resolved", "wont_fix"].includes(item.status));

  const metricCards = [
    {
      title: "Leads created",
      value: insights.metrics.leadsCreated,
      delta: insights.deltas.leadsCreated,
      detail: `${insights.windowLabel}`,
    },
    {
      title: "Lead-to-deal conversion",
      value: `${insights.metrics.leadToDealConversion}%`,
      delta: insights.deltas.leadToDealConversion,
      detail: "Cohort based on leads created in the selected window.",
      suffix: " pts",
    },
    {
      title: "Quotes sent",
      value: insights.metrics.quotesSent,
      delta: insights.deltas.quotesSent,
      detail: "Counted from quote sent/accepted activity events.",
    },
    {
      title: "Invoice payment rate",
      value: `${insights.metrics.invoicePaymentRate}%`,
      delta: insights.deltas.invoicePaymentRate,
      detail: `${insights.metrics.invoicesPaid}/${insights.metrics.invoicesIssued} invoices created in this window are fully paid.`,
      suffix: " pts",
    },
    {
      title: "Average days to payment",
      value: insights.metrics.avgDaysToPayment === null ? "—" : insights.metrics.avgDaysToPayment,
      delta: insights.deltas.avgDaysToPayment,
      detail: "Based on payment records logged in the selected window.",
      suffix: " days",
    },
    {
      title: "On-time job completions",
      value: insights.metrics.jobsCompletedOnTime,
      delta: insights.deltas.jobsCompletedOnTime,
      detail: `${insights.metrics.completedJobs} jobs were marked completed in this window.`,
    },
    {
      title: "Active seats",
      value: insights.metrics.activeSeats,
      delta: insights.deltas.activeSeats,
      detail: "Distinct users with logged activity in the selected window.",
    },
    {
      title: "Reminder completion rate",
      value: `${insights.metrics.reminderCompletionRate}%`,
      delta: insights.deltas.reminderCompletionRate,
      detail: "Completion rate for reminders created in the selected window.",
      suffix: " pts",
    },
    {
      title: "Task completion rate",
      value: `${insights.metrics.taskCompletionRate}%`,
      delta: insights.deltas.taskCompletionRate,
      detail: "Completion rate for tasks created in the selected window.",
      suffix: " pts",
    },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pilot Insights"
        description="Internal pilot-learning layer for weekly reviews, founder-led check-ins, and case-study readiness."
        action={
          <form className="flex flex-wrap items-center gap-2" method="get">
            <select name="range" defaultValue={range}>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="month">This month</option>
            </select>
            <button className="border border-slate-300 px-3 py-2 text-sm">Apply window</button>
          </form>
        }
      />

      {params.error ? <p className="rounded bg-red-50 p-2 text-sm text-red-700">{params.error}</p> : null}
      {params.success ? <p className="rounded bg-emerald-50 p-2 text-sm text-emerald-700">{params.success}</p> : null}

      <Card title="Data window">
        <p className="text-sm text-slate-700">Current window: {insights.windowLabel}</p>
        <p className="text-sm text-slate-700">Comparison window: {insights.previousWindowLabel}</p>
        <p className="text-xs text-slate-500">Generated at {new Date(insights.generatedAt).toLocaleString()}</p>
      </Card>

      <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
        <Card title="Current workspace health">
          <p className={`text-lg font-semibold ${workspaceSummary.attentionLevel === "healthy" ? "text-emerald-700" : workspaceSummary.attentionLevel === "watch" ? "text-amber-700" : workspaceSummary.attentionLevel === "needs_attention" ? "text-orange-700" : "text-red-700"}`}>
            {toTitleCase(workspaceSummary.attentionLevel)}
          </p>
          <p className="text-xs text-slate-500">Health score {workspaceSummary.healthScore}</p>
          <ul className="mt-2 space-y-1 text-sm text-slate-700">
            <li>Setup readiness: {workspaceSummary.readinessCompletionPercent}%</li>
            <li>Recent activity: {workspaceSummary.recentActivityAt ? new Date(workspaceSummary.recentActivityAt).toLocaleDateString() : "No activity yet"}</li>
            <li>Overdue work: {workspaceSummary.overdueWorkCount}</li>
            <li>Critical open feedback: {workspaceSummary.criticalOpenFeedback}</li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Link className="rounded border border-slate-300 px-2 py-1" href="/pilots">
              Open portfolio cockpit
            </Link>
          </div>
        </Card>

        <Card title="Founder follow-up cadence">
          <p className="text-sm text-slate-700">Last check-in: {workspaceSummary.latestCheckInDate ?? "—"}</p>
          <p className="text-sm text-slate-700">Next follow-up: {workspaceSummary.nextFollowUpDate ?? "—"}</p>
          <p className="text-sm text-slate-700">Status: {toTitleCase(workspaceSummary.followUpStatus)}</p>
          {workspaceSummary.followUpFocusNote ? <p className="mt-2 text-sm text-slate-700">{workspaceSummary.followUpFocusNote}</p> : null}
        </Card>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {metricCards.map((metric) => (
          <Card key={metric.title} title={metric.title}>
            <p className="text-2xl font-semibold text-slate-900">{metric.value}</p>
            <p className={`mt-1 text-xs ${metricTone(metric.delta)}`}>{formatDelta(metric.delta, metric.suffix)}</p>
            <p className="mt-2 text-xs text-slate-500">{metric.detail}</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
        <Card title="What changed">
          {insights.whatChanged.length === 0 ? (
            <p className="text-sm text-slate-600">No meaningful metric changes versus the previous period.</p>
          ) : (
            <ul className="space-y-2 text-sm text-slate-700">
              {insights.whatChanged.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Operational evidence now">
          <ul className="space-y-1 text-sm text-slate-700">
            <li>Stalled deals: {weeklyReview.topAttention.stalledDeals}</li>
            <li>Overdue invoices: {weeklyReview.topAttention.overdueInvoices}</li>
            <li>Jobs at risk: {weeklyReview.topAttention.jobsAtRisk}</li>
            <li>Overdue tasks: {weeklyReview.topAttention.overdueTasks}</li>
            <li>Open feedback items: {feedbackSummary.open}</li>
            <li>Critical open feedback: {feedbackSummary.criticalOpen}</li>
          </ul>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <Link className="rounded border border-slate-300 px-2 py-1" href="/review">
              Weekly review
            </Link>
            <Link className="rounded border border-slate-300 px-2 py-1" href="/deals">
              Stalled deals
            </Link>
            <Link className="rounded border border-slate-300 px-2 py-1" href="/invoices?status=overdue">
              Overdue invoices
            </Link>
            <Link className="rounded border border-slate-300 px-2 py-1" href="/tasks?due=overdue">
              Overdue tasks
            </Link>
          </div>
        </Card>
      </div>

      <div className="grid gap-3 xl:grid-cols-[1.15fr_0.85fr]">
        <Card title="Pilot profile and case-study readiness">
          <form action={updatePilotProfileAction} className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-slate-600">Pilot status</span>
                <select name="pilot_status" defaultValue={pilotProfile?.pilot_status ?? "onboarding"}>
                  {PILOT_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-600">Customer stage</span>
                <select name="customer_stage" defaultValue={pilotProfile?.customer_stage ?? "trial"}>
                  {CUSTOMER_STAGE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-slate-600">Team size estimate</span>
                <input name="team_size_estimate" type="number" min="1" defaultValue={pilotProfile?.team_size_estimate ?? ""} />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-slate-600">Case-study status</span>
                <select name="case_study_status" defaultValue={pilotProfile?.case_study_status ?? "not_started"}>
                  {CASE_STUDY_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <textarea
              name="baseline_process_notes"
              defaultValue={pilotProfile?.baseline_process_notes ?? ""}
              placeholder="Baseline process notes: what the team was doing before ClientPad, current friction, manual workarounds."
              rows={3}
            />
            <textarea
              name="measurable_outcome_notes"
              defaultValue={pilotProfile?.measurable_outcome_notes ?? ""}
              placeholder="Measurable outcome notes: wins, metrics, observed behavior changes, and founder learning."
              rows={3}
            />
            <textarea
              name="testimonial_quote"
              defaultValue={pilotProfile?.testimonial_quote ?? ""}
              placeholder="Testimonial quote or strongest customer language so far."
              rows={3}
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="permission_to_use_name" defaultChecked={pilotProfile?.permission_to_use_name ?? false} className="h-4 w-4" />
              Permission to use customer name
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="permission_to_use_logo" defaultChecked={pilotProfile?.permission_to_use_logo ?? false} className="h-4 w-4" />
              Permission to use customer logo
            </label>
            <input name="next_follow_up_date" type="date" defaultValue={pilotProfile?.next_follow_up_date ?? ""} />
            <textarea
              name="follow_up_focus_note"
              defaultValue={pilotProfile?.follow_up_focus_note ?? ""}
              placeholder="Next founder/operator follow-up focus"
              rows={2}
            />
            <button className="w-full bg-emerald-700 text-white">Save pilot profile</button>
          </form>
        </Card>

        <Card title="Feedback summary">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="rounded border border-slate-200 p-3 text-sm">
              <p className="font-medium text-slate-900">Open items</p>
              <p className="mt-1 text-2xl font-semibold">{feedbackSummary.open}</p>
            </div>
            <div className="rounded border border-slate-200 p-3 text-sm">
              <p className="font-medium text-slate-900">Critical open</p>
              <p className="mt-1 text-2xl font-semibold">{feedbackSummary.criticalOpen}</p>
            </div>
            <div className="rounded border border-slate-200 p-3 text-sm">
              <p className="font-medium text-slate-900">Follow-up due</p>
              <p className="mt-1 text-2xl font-semibold">{feedbackSummary.followUpDue}</p>
            </div>
            <div className="rounded border border-slate-200 p-3 text-sm">
              <p className="font-medium text-slate-900">Positive signals</p>
              <p className="mt-1 text-2xl font-semibold">{feedbackSummary.positiveSignals}</p>
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Use this with the weekly review. If open feedback is high while active seats drop or overdue work rises, the pilot likely needs a founder check-in this week.
          </p>
        </Card>
      </div>

      <Card title="Accessible pilot workspaces">
        <form className="mb-3 flex flex-wrap gap-2" method="get">
          <input type="hidden" name="range" value={range} />
          <input type="hidden" name="feedback_status" value={params.feedback_status ?? "all"} />
          <input type="hidden" name="feedback_category" value={params.feedback_category ?? "all"} />
          <select name="pilot_status" defaultValue={params.pilot_status ?? "all"}>
            <option value="all">All pilot statuses</option>
            {PILOT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <button className="border border-slate-300 px-3 py-2 text-sm">Filter workspaces</button>
        </form>

        {portfolio.length === 0 ? (
          <p className="text-sm text-slate-600">No accessible workspaces match this pilot status filter.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-2 pr-4">Workspace</th>
                  <th className="pb-2 pr-4">Pilot</th>
                  <th className="pb-2 pr-4">Stage</th>
                  <th className="pb-2 pr-4">Active seats</th>
                  <th className="pb-2 pr-4">Leads</th>
                  <th className="pb-2 pr-4">Conversion</th>
                  <th className="pb-2 pr-4">Payment rate</th>
                  <th className="pb-2 pr-4">Open feedback</th>
                  <th className="pb-2 pr-4">At risk</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.map((row) => (
                  <tr key={row.workspaceId} className="border-t border-slate-100">
                    <td className="py-2 pr-4">
                      <div>
                        <p className="font-medium text-slate-900">{row.workspaceName}</p>
                        <p className="text-xs text-slate-500">{row.role} {row.businessType ? `• ${row.businessType}` : ""}</p>
                      </div>
                    </td>
                    <td className="py-2 pr-4">{toTitleCase(row.pilotStatus)}</td>
                    <td className="py-2 pr-4">{toTitleCase(row.customerStage)}</td>
                    <td className="py-2 pr-4">{row.activeSeats}</td>
                    <td className="py-2 pr-4">{row.leadsCreated}</td>
                    <td className="py-2 pr-4">{row.leadToDealConversion}%</td>
                    <td className="py-2 pr-4">{row.invoicePaymentRate}%</td>
                    <td className="py-2 pr-4">{row.openFeedback}</td>
                    <td className="py-2 pr-4">{row.overdueInvoices + row.jobsAtRisk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <div className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
        <Card title="Capture customer feedback">
          <form action={createFeedbackItemAction} className="space-y-3">
            <input name="title" placeholder="Short feedback title" required />
            <div className="grid gap-3 md:grid-cols-2">
              <select name="category" defaultValue="pain_point">
                {FEEDBACK_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <select name="importance" defaultValue="medium">
                {FEEDBACK_IMPORTANCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <select name="status" defaultValue="open">
                {FEEDBACK_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input name="related_module" placeholder="Related module: leads, payments, jobs, onboarding" />
            </div>
            <textarea name="note_body" placeholder="What the customer said, what happened, and why it matters." rows={4} required />
            <div className="grid gap-3 md:grid-cols-2">
              <input name="contact_name" placeholder="Contact or person name (optional)" />
              <input name="follow_up_date" type="date" />
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <input name="evidence_entity_type" placeholder="Optional evidence type: deal, invoice, job, task" />
              <input name="evidence_entity_id" placeholder="Optional evidence record ID" />
            </div>
            <button className="w-full bg-slate-900 text-white">Save feedback</button>
          </form>
        </Card>

        <Card title="Feedback log">
          <form className="mb-3 grid gap-2 md:grid-cols-[1fr_1fr_auto]" method="get">
            <input type="hidden" name="range" value={range} />
            <input type="hidden" name="pilot_status" value={params.pilot_status ?? "all"} />
            <select name="feedback_status" defaultValue={params.feedback_status ?? "all"}>
              <option value="all">All feedback statuses</option>
              {FEEDBACK_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <select name="feedback_category" defaultValue={params.feedback_category ?? "all"}>
              <option value="all">All feedback categories</option>
              {FEEDBACK_CATEGORY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button className="border border-slate-300 px-3 py-2 text-sm">Filter</button>
          </form>

          {filteredFeedback.length === 0 ? (
            <p className="text-sm text-slate-600">No feedback items match the current filters.</p>
          ) : (
            <div className="space-y-3">
              {filteredFeedback.map((item) => (
                <div key={item.id} className="rounded border border-slate-200 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-slate-900">{item.title}</p>
                      <p className="text-xs text-slate-500">
                        {toTitleCase(item.category)} • {toTitleCase(item.importance)} • {toTitleCase(item.status)} • {new Date(item.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {item.follow_up_date ? <span className="text-xs text-amber-700">Follow up {item.follow_up_date}</span> : null}
                  </div>
                  <p className="mt-2 text-sm text-slate-700">{item.note_body}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    Module: {item.related_module ?? "—"} {item.contact_name ? `• Contact: ${item.contact_name}` : ""}
                  </p>
                  <details className="mt-3">
                    <summary className="cursor-pointer text-sm text-emerald-700">Edit feedback</summary>
                    <form action={updateFeedbackItemAction} className="mt-3 space-y-3">
                      <input type="hidden" name="feedback_id" value={item.id} />
                      <input name="title" defaultValue={item.title} required />
                      <div className="grid gap-3 md:grid-cols-2">
                        <select name="category" defaultValue={item.category}>
                          {FEEDBACK_CATEGORY_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <select name="importance" defaultValue={item.importance}>
                          {FEEDBACK_IMPORTANCE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <select name="status" defaultValue={item.status}>
                          {FEEDBACK_STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                        <input name="related_module" defaultValue={item.related_module ?? ""} placeholder="Related module" />
                      </div>
                      <textarea name="note_body" defaultValue={item.note_body} rows={4} required />
                      <div className="grid gap-3 md:grid-cols-2">
                        <input name="contact_name" defaultValue={item.contact_name ?? ""} placeholder="Contact name" />
                        <input name="follow_up_date" type="date" defaultValue={item.follow_up_date ?? ""} />
                      </div>
                      <div className="grid gap-3 md:grid-cols-2">
                        <input name="evidence_entity_type" defaultValue={item.evidence_entity_type ?? ""} placeholder="Evidence type" />
                        <input name="evidence_entity_id" defaultValue={item.evidence_entity_id ?? ""} placeholder="Evidence record ID" />
                      </div>
                      <button className="border border-slate-300 px-3 py-2 text-sm">Update feedback</button>
                    </form>
                  </details>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-3 xl:grid-cols-[0.95fr_1.05fr]">
        <Card title="Log weekly check-in">
          <form action={createCheckInNoteAction} className="space-y-3">
            <input name="title" placeholder="Check-in title" defaultValue={`Weekly check-in ${new Date().toISOString().slice(0, 10)}`} required />
            <div className="grid gap-3 md:grid-cols-2">
              <input name="note_date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} />
              <select name="confidence_level" defaultValue="medium">
                {CHECK_IN_CONFIDENCE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <textarea name="customer_summary" placeholder="What the customer said this week." rows={3} />
            <textarea name="wins" placeholder="Wins, adoption signals, and positive outcomes." rows={3} />
            <textarea name="blockers" placeholder="Blockers, risks, and resistance points." rows={3} />
            <textarea name="requested_changes" placeholder="Requested changes or recurring asks." rows={3} />
            <textarea name="next_actions" placeholder="Next founder/operator actions before the next check-in." rows={3} />
            {openFeedbackOptions.length > 0 ? (
              <div className="rounded border border-slate-200 p-3">
                <p className="mb-2 text-sm font-medium text-slate-900">Link existing feedback items</p>
                <div className="space-y-2">
                  {openFeedbackOptions.slice(0, 12).map((item) => (
                    <label key={item.id} className="flex items-start gap-2 text-sm">
                      <input type="checkbox" name="linked_feedback_ids" value={item.id} className="mt-1 h-4 w-4" />
                      <span>
                        {item.title}
                        <span className="block text-xs text-slate-500">
                          {toTitleCase(item.category)} • {toTitleCase(item.status)}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-500">No open feedback items available to link yet.</p>
            )}
            <button className="w-full bg-indigo-700 text-white">Save check-in note</button>
          </form>
        </Card>

        <Card title="Check-in history">
          {checkInNotes.length === 0 ? (
            <p className="text-sm text-slate-600">No check-in notes yet. Start with the founder/customer review from this week.</p>
          ) : (
            <div className="space-y-3">
              {checkInNotes.map((note) => {
                const evidence = pickEvidenceSummary(note.evidence_snapshot);
                return (
                  <div key={note.id} className="rounded border border-slate-200 p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-slate-900">{note.title}</p>
                        <p className="text-xs text-slate-500">
                          {note.note_date} • {toTitleCase(note.confidence_level)} confidence
                        </p>
                      </div>
                      {note.linkedFeedback.length > 0 ? (
                        <span className="text-xs text-emerald-700">{note.linkedFeedback.length} linked feedback items</span>
                      ) : null}
                    </div>
                    {note.customer_summary ? <p className="mt-2 text-sm text-slate-700">{note.customer_summary}</p> : null}
                    <div className="mt-2 grid gap-2 md:grid-cols-2">
                      {note.wins ? (
                        <div className="rounded border border-emerald-100 bg-emerald-50 p-2 text-sm text-emerald-900">
                          <p className="font-medium">Wins</p>
                          <p>{note.wins}</p>
                        </div>
                      ) : null}
                      {note.blockers ? (
                        <div className="rounded border border-amber-100 bg-amber-50 p-2 text-sm text-amber-900">
                          <p className="font-medium">Blockers</p>
                          <p>{note.blockers}</p>
                        </div>
                      ) : null}
                    </div>
                    {note.requested_changes ? (
                      <p className="mt-2 text-sm text-slate-700">
                        <span className="font-medium text-slate-900">Requested changes:</span> {note.requested_changes}
                      </p>
                    ) : null}
                    {note.next_actions ? (
                      <p className="mt-2 text-sm text-slate-700">
                        <span className="font-medium text-slate-900">Next actions:</span> {note.next_actions}
                      </p>
                    ) : null}
                    {note.linkedFeedback.length > 0 ? (
                      <div className="mt-3">
                        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Linked feedback</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {note.linkedFeedback.map((item) => (
                            <span key={item.id} className="rounded-full border border-slate-200 px-2 py-1 text-xs text-slate-700">
                              {item.title} • {toTitleCase(item.status)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    {evidence ? (
                      <div className="mt-3 rounded border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                        <p className="font-medium text-slate-800">Operational evidence snapshot</p>
                        <p>{evidence.reviewWindow ?? "Last 7 days"} • Leads {String(evidence.leads ?? 0)} • Overdue invoices {String(evidence.overdueInvoices ?? 0)} • Jobs at risk {String(evidence.jobsAtRisk ?? 0)} • Overdue tasks {String(evidence.overdueTasks ?? 0)}</p>
                      </div>
                    ) : null}
                    <details className="mt-3">
                      <summary className="cursor-pointer text-sm text-emerald-700">Edit check-in</summary>
                      <form action={updateCheckInNoteAction} className="mt-3 space-y-3">
                        <input type="hidden" name="check_in_note_id" value={note.id} />
                        <input name="title" defaultValue={note.title} required />
                        <div className="grid gap-3 md:grid-cols-2">
                          <input name="note_date" type="date" defaultValue={note.note_date} />
                          <select name="confidence_level" defaultValue={note.confidence_level}>
                            {CHECK_IN_CONFIDENCE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <textarea name="customer_summary" defaultValue={note.customer_summary ?? ""} rows={3} />
                        <textarea name="wins" defaultValue={note.wins ?? ""} rows={3} />
                        <textarea name="blockers" defaultValue={note.blockers ?? ""} rows={3} />
                        <textarea name="requested_changes" defaultValue={note.requested_changes ?? ""} rows={3} />
                        <textarea name="next_actions" defaultValue={note.next_actions ?? ""} rows={3} />
                        {openFeedbackOptions.length > 0 ? (
                          <div className="rounded border border-slate-200 p-3">
                            <p className="mb-2 text-sm font-medium text-slate-900">Linked feedback</p>
                            <div className="space-y-2">
                              {openFeedbackOptions.slice(0, 12).map((item) => {
                                const checked = note.linkedFeedback.some((linked) => linked.id === item.id);
                                return (
                                  <label key={item.id} className="flex items-start gap-2 text-sm">
                                    <input type="checkbox" name="linked_feedback_ids" value={item.id} defaultChecked={checked} className="mt-1 h-4 w-4" />
                                    <span>
                                      {item.title}
                                      <span className="block text-xs text-slate-500">
                                        {toTitleCase(item.category)} • {toTitleCase(item.status)}
                                      </span>
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        ) : null}
                        <button className="border border-slate-300 px-3 py-2 text-sm">Update check-in</button>
                      </form>
                    </details>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
