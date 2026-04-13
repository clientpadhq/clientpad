import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/page-header";
import { updatePilotFollowUpAction } from "@/lib/actions/pilot";
import { switchActiveWorkspaceAction } from "@/lib/actions/workspace";
import {
  FEEDBACK_CATEGORY_OPTIONS,
  FEEDBACK_IMPORTANCE_OPTIONS,
  PILOT_STATUS_OPTIONS,
  PORTFOLIO_ATTENTION_OPTIONS,
  listPilotWorkspacePortfolio,
  listPortfolioFeedbackQueue,
  type InsightsRange,
  type PilotPortfolioRow,
  type PortfolioAttentionLevel,
  type PortfolioFollowUpStatus,
} from "@/lib/db/pilot";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { formatNaira } from "@/lib/revenue/calculations";
import type { FeedbackCategory, FeedbackImportance, PilotStatus } from "@/types/database";

function parseRange(value?: string): InsightsRange {
  if (value === "30d" || value === "month") return value;
  return "7d";
}

function parseCompareIds(value: string | string[] | undefined) {
  if (!value) return [] as string[];
  return Array.isArray(value) ? value : [value];
}

function toTitleCase(value: string) {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function attentionTone(value: PortfolioAttentionLevel) {
  if (value === "healthy") return "text-emerald-700";
  if (value === "watch") return "text-amber-700";
  if (value === "needs_attention") return "text-orange-700";
  return "text-red-700";
}

function followUpTone(value: PortfolioFollowUpStatus) {
  if (value === "recently_checked_in") return "text-emerald-700";
  if (value === "scheduled") return "text-slate-600";
  if (value === "due_this_week") return "text-amber-700";
  if (value === "overdue") return "text-red-700";
  return "text-orange-700";
}

function hiddenFilterFields(params: {
  range: InsightsRange;
  pilotStatus: string;
  attention: string;
  businessType: string;
  caseStudyOnly: boolean;
  followUpStatus: string;
  feedbackImportance: string;
  feedbackCategory: string;
  feedbackModule: string;
}) {
  return (
    <>
      <input type="hidden" name="range" value={params.range} />
      <input type="hidden" name="pilot_status" value={params.pilotStatus} />
      <input type="hidden" name="attention" value={params.attention} />
      <input type="hidden" name="business_type" value={params.businessType} />
      <input type="hidden" name="case_study_only" value={params.caseStudyOnly ? "true" : "false"} />
      <input type="hidden" name="follow_up_status" value={params.followUpStatus} />
      <input type="hidden" name="feedback_importance" value={params.feedbackImportance} />
      <input type="hidden" name="feedback_category" value={params.feedbackCategory} />
      <input type="hidden" name="feedback_module" value={params.feedbackModule} />
    </>
  );
}

function portfolioFilterFields(params: {
  range: InsightsRange;
  pilotStatus: string;
  attention: string;
  businessType: string;
  caseStudyOnly: boolean;
  followUpStatus: string;
}) {
  return (
    <>
      <input type="hidden" name="range" value={params.range} />
      <input type="hidden" name="pilot_status" value={params.pilotStatus} />
      <input type="hidden" name="attention" value={params.attention} />
      <input type="hidden" name="business_type" value={params.businessType} />
      <input type="hidden" name="case_study_only" value={params.caseStudyOnly ? "true" : "false"} />
      <input type="hidden" name="follow_up_status" value={params.followUpStatus} />
    </>
  );
}

function WorkspaceDrillAction({
  workspaceId,
  path,
  label,
}: {
  workspaceId: string;
  path: string;
  label: string;
}) {
  return (
    <form action={switchActiveWorkspaceAction}>
      <input type="hidden" name="workspace_id" value={workspaceId} />
      <input type="hidden" name="redirect_to" value={path} />
      <button className="rounded border border-slate-300 px-2 py-1 text-xs">{label}</button>
    </form>
  );
}

function PortfolioActionList({
  title,
  rows,
  empty,
  path,
  subtitle,
}: {
  title: string;
  rows: PilotPortfolioRow[];
  empty: string;
  path: string;
  subtitle: string;
}) {
  return (
    <Card title={title}>
      <p className="mb-2 text-xs text-slate-500">{subtitle}</p>
      {rows.length === 0 ? (
        <p className="text-sm text-slate-600">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => (
            <li key={`${title}-${row.workspaceId}`} className="rounded border border-slate-200 p-3 text-sm">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{row.workspaceName}</p>
                  <p className="text-xs text-slate-500">
                    {row.businessType ?? "Business type not set"} • {toTitleCase(row.attentionLevel)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <WorkspaceDrillAction workspaceId={row.workspaceId} path={path} label="Open" />
                </div>
              </div>
              {row.attentionReasons.length > 0 ? <p className="mt-2 text-xs text-slate-600">{row.attentionReasons[0]}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default async function PilotsPage({
  searchParams,
}: {
  searchParams: Promise<{
    range?: string;
    pilot_status?: string;
    attention?: string;
    business_type?: string;
    case_study_only?: string;
    follow_up_status?: string;
    feedback_importance?: string;
    feedback_category?: string;
    feedback_module?: string;
    compare_workspace_id?: string | string[];
    success?: string;
    error?: string;
  }>;
}) {
  const context = await requireWorkspace("admin");
  const params = await searchParams;

  const range = parseRange(params.range);
  const pilotStatus = params.pilot_status ?? "all";
  const attention = params.attention ?? "all";
  const businessType = params.business_type ?? "all";
  const caseStudyOnly = params.case_study_only === "true";
  const followUpStatus = params.follow_up_status ?? "all";
  const feedbackImportance = params.feedback_importance ?? "all";
  const feedbackCategory = params.feedback_category ?? "all";
  const feedbackModule = params.feedback_module ?? "all";

  const portfolio = await listPilotWorkspacePortfolio(context.user.id, range, {
    pilotStatus: pilotStatus === "all" ? "all" : (pilotStatus as PilotStatus),
    attentionLevel: attention === "all" ? "all" : (attention as PortfolioAttentionLevel),
    businessType: businessType === "all" ? "all" : businessType,
    caseStudyOnly,
    followUpStatus: followUpStatus === "all" ? "all" : (followUpStatus as PortfolioFollowUpStatus),
  });

  const feedbackQueue = await listPortfolioFeedbackQueue(context.user.id, {
    importance: feedbackImportance === "all" ? "all" : (feedbackImportance as FeedbackImportance),
    category: feedbackCategory === "all" ? "all" : (feedbackCategory as FeedbackCategory),
    module: feedbackModule,
  });

  const businessTypeOptions = Array.from(
    new Set(portfolio.map((row) => row.businessType).filter((value): value is string => Boolean(value))),
  ).sort();
  const moduleOptions = Array.from(
    new Set(feedbackQueue.map((row) => row.relatedModule).filter((value): value is string => Boolean(value))),
  ).sort();
  const compareIds = parseCompareIds(params.compare_workspace_id);
  const compareRows = portfolio.filter((row) => compareIds.includes(row.workspaceId)).slice(0, 4);

  const total = portfolio.length;
  const atRisk = portfolio.filter((row) => row.attentionLevel === "at_risk").length;
  const dueFollowUp = portfolio.filter((row) => row.followUpStatus === "overdue" || row.followUpStatus === "due_this_week").length;
  const caseStudyCandidates = portfolio.filter((row) => row.caseStudyReadiness.isCandidate).length;
  const healthy = portfolio.filter((row) => row.attentionLevel === "healthy").length;

  const actionCenter = {
    followUp: portfolio.filter((row) => row.followUpStatus === "overdue" || row.followUpStatus === "due_this_week").slice(0, 6),
    overdueInvoices: portfolio.filter((row) => row.overdueInvoices > 0).slice(0, 6),
    stalledDeals: portfolio.filter((row) => row.stalledDeals > 0).slice(0, 6),
    jobsAtRisk: portfolio.filter((row) => row.jobsAtRisk > 0).slice(0, 6),
    criticalFeedback: portfolio.filter((row) => row.criticalOpenFeedback > 0).slice(0, 6),
    caseStudy: portfolio.filter((row) => row.caseStudyReadiness.isCandidate).slice(0, 6),
  };

  const filterState = {
    range,
    pilotStatus,
    attention,
    businessType,
    caseStudyOnly,
    followUpStatus,
    feedbackImportance,
    feedbackCategory,
    feedbackModule,
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Pilot Portfolio"
        description="Founder/operator cockpit across pilot workspaces: health, follow-up cadence, unresolved feedback, and case-study candidates."
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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        <Card title="Pilot workspaces">
          <p className="text-2xl font-semibold text-slate-900">{total}</p>
          <p className="mt-1 text-xs text-slate-500">Owner/admin accessible pilot workspaces in this portfolio view.</p>
        </Card>
        <Card title="At risk">
          <p className="text-2xl font-semibold text-red-700">{atRisk}</p>
          <p className="mt-1 text-xs text-slate-500">Deterministic attention level from setup, usage, overdue work, feedback, and cadence.</p>
        </Card>
        <Card title="Due follow-up">
          <p className="text-2xl font-semibold text-amber-700">{dueFollowUp}</p>
          <p className="mt-1 text-xs text-slate-500">Workspaces with founder follow-up overdue or due this week.</p>
        </Card>
        <Card title="Healthy">
          <p className="text-2xl font-semibold text-emerald-700">{healthy}</p>
          <p className="mt-1 text-xs text-slate-500">Healthy workspaces are the closest candidates for expansion or referrals.</p>
        </Card>
        <Card title="Case-study candidates">
          <p className="text-2xl font-semibold text-slate-900">{caseStudyCandidates}</p>
          <p className="mt-1 text-xs text-slate-500">Candidates require healthy adoption plus evidence and permissions signals.</p>
        </Card>
      </div>

      <Card title="Filters">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-5" method="get">
          <select name="pilot_status" defaultValue={pilotStatus}>
            <option value="all">All pilot statuses</option>
            {PILOT_STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select name="attention" defaultValue={attention}>
            {PORTFOLIO_ATTENTION_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select name="business_type" defaultValue={businessType}>
            <option value="all">All business types</option>
            {businessTypeOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <select name="follow_up_status" defaultValue={followUpStatus}>
            <option value="all">All follow-up statuses</option>
            <option value="overdue">Overdue</option>
            <option value="due_this_week">Due this week</option>
            <option value="scheduled">Scheduled</option>
            <option value="recently_checked_in">Recently checked in</option>
            <option value="unplanned">Unplanned</option>
          </select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="case_study_only" value="true" defaultChecked={caseStudyOnly} className="h-4 w-4" />
            Case-study candidates only
          </label>
          <input type="hidden" name="range" value={range} />
          <button className="border border-slate-300 px-3 py-2 text-sm xl:col-span-5">Apply filters</button>
        </form>
      </Card>

      <div className="grid gap-3 xl:grid-cols-2">
        <PortfolioActionList
          title="Pilots needing check-in"
          rows={actionCenter.followUp}
          empty="No pilots need a founder check-in this week."
          path="/insights"
          subtitle="Use this to keep white-glove pilot follow-up disciplined."
        />
        <PortfolioActionList
          title="Collection pressure"
          rows={actionCenter.overdueInvoices}
          empty="No pilots have overdue invoice pressure right now."
          path="/invoices?status=overdue"
          subtitle="These workspaces need payment follow-up support."
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <PortfolioActionList
          title="Stalled deals"
          rows={actionCenter.stalledDeals}
          empty="No stalled deals right now."
          path="/review"
          subtitle="Stalled sales are a direct pilot risk."
        />
        <PortfolioActionList
          title="Jobs at risk"
          rows={actionCenter.jobsAtRisk}
          empty="No jobs at risk right now."
          path="/review"
          subtitle="Execution issues delay pilot success evidence."
        />
      </div>

      <div className="grid gap-3 xl:grid-cols-2">
        <PortfolioActionList
          title="High-severity product feedback"
          rows={actionCenter.criticalFeedback}
          empty="No pilots currently have unresolved critical feedback."
          path="/insights"
          subtitle="Useful for weekly product review and founder prioritization."
        />
        <PortfolioActionList
          title="Case-study candidate drill-down"
          rows={actionCenter.caseStudy}
          empty="No strong case-study candidates yet."
          path="/insights"
          subtitle="These are the healthiest pilots with the best evidence signals so far."
        />
      </div>

      <Card title="Portfolio view">
        {portfolio.length === 0 ? (
          <p className="text-sm text-slate-600">No pilot workspaces match the current filters.</p>
        ) : (
          <form className="space-y-3" method="get">
            {hiddenFilterFields(filterState)}
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-slate-500">
                  <tr>
                    <th className="pb-2 pr-4">Compare</th>
                    <th className="pb-2 pr-4">Workspace</th>
                    <th className="pb-2 pr-4">Attention</th>
                    <th className="pb-2 pr-4">Pilot</th>
                    <th className="pb-2 pr-4">Readiness</th>
                    <th className="pb-2 pr-4">Activity</th>
                    <th className="pb-2 pr-4">Usage</th>
                    <th className="pb-2 pr-4">Revenue / execution</th>
                    <th className="pb-2 pr-4">Feedback</th>
                    <th className="pb-2 pr-4">Cadence</th>
                    <th className="pb-2 pr-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.map((row) => (
                    <tr key={row.workspaceId} className="border-t border-slate-100 align-top">
                      <td className="py-3 pr-4">
                        <input
                          type="checkbox"
                          name="compare_workspace_id"
                          value={row.workspaceId}
                          defaultChecked={compareIds.includes(row.workspaceId)}
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="py-3 pr-4">
                        <div>
                          <p className="font-medium text-slate-900">{row.workspaceName}</p>
                          <p className="text-xs text-slate-500">{row.businessType ?? "Business type not set"} • {row.role}</p>
                          <p className="mt-1 text-xs text-slate-500">Recent activity: {row.recentActivityAt ? new Date(row.recentActivityAt).toLocaleDateString() : "No activity yet"}</p>
                        </div>
                      </td>
                      <td className="py-3 pr-4">
                        <p className={`font-medium ${attentionTone(row.attentionLevel)}`}>{toTitleCase(row.attentionLevel)}</p>
                        <p className="text-xs text-slate-500">Score {row.healthScore}</p>
                        {row.attentionReasons.length > 0 ? <p className="mt-1 text-xs text-slate-500">{row.attentionReasons[0]}</p> : null}
                      </td>
                      <td className="py-3 pr-4">
                        <p>{toTitleCase(row.pilotStatus)}</p>
                        <p className="text-xs text-slate-500">{toTitleCase(row.customerStage)}</p>
                        <p className="mt-1 text-xs text-slate-500">{toTitleCase(row.caseStudyStatus)}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <p>{row.readinessCompletionPercent}%</p>
                        <p className="text-xs text-slate-500">{row.readinessThresholdReached ? "Threshold reached" : "Needs setup work"}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <p>Seats: {row.activeSeats}</p>
                        <p className="text-xs text-slate-500">Leads {row.leadsCreated} • Deals {row.dealsCreated}</p>
                        <p className="text-xs text-slate-500">Quotes {row.quotesSent} • Invoices {row.invoicesIssued}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <p>Conversion {row.leadToDealConversion}%</p>
                        <p className="text-xs text-slate-500">Payment rate {row.invoicePaymentRate}%</p>
                        <p className="text-xs text-slate-500">On-time jobs {row.jobsCompletedOnTime}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <p>Overdue work {row.overdueWorkCount}</p>
                        <p className="text-xs text-slate-500">Overdue invoices {row.overdueInvoices} • Stalled deals {row.stalledDeals}</p>
                        <p className="text-xs text-slate-500">Jobs at risk {row.jobsAtRisk} • Overdue tasks {row.overdueTasks}</p>
                        <p className="mt-1 text-xs text-slate-500">Outstanding {formatNaira(row.outstandingBalance)}</p>
                      </td>
                      <td className="py-3 pr-4">
                        <p>Open {row.openFeedback}</p>
                        <p className="text-xs text-slate-500">Critical {row.criticalOpenFeedback} • Follow-up due {row.feedbackFollowUpDue}</p>
                        {row.caseStudyReadiness.isCandidate ? <p className="mt-1 text-xs text-emerald-700">Case-study candidate</p> : null}
                      </td>
                      <td className="py-3 pr-4">
                        <p className={followUpTone(row.followUpStatus)}>{toTitleCase(row.followUpStatus)}</p>
                        <p className="text-xs text-slate-500">Last check-in {row.latestCheckInDate ?? "—"}</p>
                        <p className="text-xs text-slate-500">Next follow-up {row.nextFollowUpDate ?? "—"}</p>
                        {row.followUpFocusNote ? <p className="mt-1 text-xs text-slate-500">{row.followUpFocusNote}</p> : null}
                        <details className="mt-2">
                          <summary className="cursor-pointer text-xs text-emerald-700">Update cadence</summary>
                          <form action={updatePilotFollowUpAction} className="mt-2 space-y-2">
                            <input type="hidden" name="workspace_id" value={row.workspaceId} />
                            <input type="date" name="next_follow_up_date" defaultValue={row.nextFollowUpDate ?? ""} />
                            <textarea
                              name="follow_up_focus_note"
                              defaultValue={row.followUpFocusNote ?? ""}
                              rows={2}
                              placeholder="Next follow-up focus"
                            />
                            <button className="rounded border border-slate-300 px-2 py-1 text-xs">Save follow-up</button>
                          </form>
                        </details>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="flex flex-col gap-2">
                          <WorkspaceDrillAction workspaceId={row.workspaceId} path="/pilots" label="Switch here" />
                          <WorkspaceDrillAction workspaceId={row.workspaceId} path="/insights" label="Open insights" />
                          <WorkspaceDrillAction workspaceId={row.workspaceId} path="/review" label="Open review" />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button className="border border-slate-300 px-3 py-2 text-sm">Compare selected</button>
          </form>
        )}
      </Card>

      {compareRows.length > 0 ? (
        <Card title="Workspace comparison">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-2 pr-4">Metric</th>
                  {compareRows.map((row) => (
                    <th key={row.workspaceId} className="pb-2 pr-4">{row.workspaceName}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: "Setup readiness", render: (row: PilotPortfolioRow) => `${row.readinessCompletionPercent}%` },
                  { label: "Attention level", render: (row: PilotPortfolioRow) => toTitleCase(row.attentionLevel) },
                  { label: "Weekly active seats", render: (row: PilotPortfolioRow) => String(row.activeSeats) },
                  { label: "Leads created", render: (row: PilotPortfolioRow) => String(row.leadsCreated) },
                  { label: "Deals created", render: (row: PilotPortfolioRow) => String(row.dealsCreated) },
                  { label: "Lead-to-deal conversion", render: (row: PilotPortfolioRow) => `${row.leadToDealConversion}%` },
                  { label: "Quotes sent", render: (row: PilotPortfolioRow) => String(row.quotesSent) },
                  { label: "Invoices issued", render: (row: PilotPortfolioRow) => String(row.invoicesIssued) },
                  { label: "Invoice payment rate", render: (row: PilotPortfolioRow) => `${row.invoicePaymentRate}%` },
                  { label: "Jobs completed on time", render: (row: PilotPortfolioRow) => String(row.jobsCompletedOnTime) },
                  { label: "Overdue work", render: (row: PilotPortfolioRow) => String(row.overdueWorkCount) },
                  { label: "Open feedback", render: (row: PilotPortfolioRow) => String(row.openFeedback) },
                ].map((metric) => (
                  <tr key={metric.label} className="border-t border-slate-100">
                    <td className="py-2 pr-4 font-medium text-slate-900">{metric.label}</td>
                    {compareRows.map((row) => (
                      <td key={`${metric.label}-${row.workspaceId}`} className="py-2 pr-4 text-slate-700">
                        {metric.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : null}

      <Card title="Open feedback queue across workspaces">
        <form className="mb-3 grid gap-2 md:grid-cols-3 xl:grid-cols-4" method="get">
          {portfolioFilterFields(filterState)}
          <select name="feedback_importance" defaultValue={feedbackImportance}>
            <option value="all">All severities</option>
            {FEEDBACK_IMPORTANCE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select name="feedback_category" defaultValue={feedbackCategory}>
            <option value="all">All categories</option>
            {FEEDBACK_CATEGORY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select name="feedback_module" defaultValue={feedbackModule}>
            <option value="all">All modules</option>
            {moduleOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <button className="border border-slate-300 px-3 py-2 text-sm">Filter queue</button>
        </form>

        {feedbackQueue.length === 0 ? (
          <p className="text-sm text-slate-600">No unresolved feedback items match the current queue filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="pb-2 pr-4">Workspace</th>
                  <th className="pb-2 pr-4">Feedback</th>
                  <th className="pb-2 pr-4">Severity</th>
                  <th className="pb-2 pr-4">Category</th>
                  <th className="pb-2 pr-4">Module</th>
                  <th className="pb-2 pr-4">Follow-up</th>
                  <th className="pb-2 pr-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {feedbackQueue.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="py-2 pr-4">
                      <div>
                        <p className="font-medium text-slate-900">{item.workspaceName}</p>
                        <p className="text-xs text-slate-500">{item.businessType ?? "Business type not set"}</p>
                      </div>
                    </td>
                    <td className="py-2 pr-4">
                      <p>{item.title}</p>
                      <p className="text-xs text-slate-500">{new Date(item.createdAt).toLocaleDateString()}</p>
                    </td>
                    <td className="py-2 pr-4">{toTitleCase(item.importance)}</td>
                    <td className="py-2 pr-4">{toTitleCase(item.category)}</td>
                    <td className="py-2 pr-4">{item.relatedModule ?? "—"}</td>
                    <td className="py-2 pr-4">{item.followUpDate ?? "—"}</td>
                    <td className="py-2 pr-4">
                      <WorkspaceDrillAction workspaceId={item.workspaceId} path="/insights" label="Open workspace" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title="Health score logic">
        <ul className="space-y-1 text-sm text-slate-700">
          <li>Healthy: strong setup readiness, recent activity, no major overdue work, and follow-up cadence in control.</li>
          <li>Watch: early warning signs exist, but the workspace is not yet in a needs-attention state.</li>
          <li>Needs attention: multiple deterministic risks exist across workflow pressure, cadence, or open critical feedback.</li>
          <li>At risk: severe deterministic risk signals or an explicitly at-risk pilot status are present.</li>
        </ul>
      </Card>
    </div>
  );
}
