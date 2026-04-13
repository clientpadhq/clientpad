import { createClient } from "@/lib/supabase/server";
import { getSetupReadiness } from "@/lib/onboarding/readiness";
import { getWeeklyReviewSnapshot } from "@/lib/db/review";
import { getWorkspacesForUser } from "@/lib/db/workspace";
import type {
  CaseStudyStatus,
  CheckInConfidenceLevel,
  CustomerStage,
  FeedbackCategory,
  FeedbackImportance,
  FeedbackStatus,
  PilotStatus,
  WorkspaceCheckInNote,
  WorkspaceFeedbackItem,
  WorkspacePilotProfile,
} from "@/types/database";

export type InsightsRange = "7d" | "30d" | "month";
export type PortfolioAttentionLevel = "healthy" | "watch" | "needs_attention" | "at_risk";
export type PortfolioFollowUpStatus = "recently_checked_in" | "scheduled" | "due_this_week" | "overdue" | "unplanned";

type DateWindow = {
  currentStart: Date;
  currentEnd: Date;
  previousStart: Date;
  previousEnd: Date;
};

type TimePaymentRow = {
  paid_at: string | null;
  invoice: { issue_date: string | null } | Array<{ issue_date: string | null }> | null;
};

type PilotMetricKey =
  | "leadsCreated"
  | "dealsCreated"
  | "leadToDealConversion"
  | "quotesSent"
  | "invoicePaymentRate"
  | "avgDaysToPayment"
  | "jobsCompletedOnTime"
  | "activeSeats"
  | "reminderCompletionRate"
  | "taskCompletionRate";

type WorkspaceReference = {
  id: string;
  name: string;
  business_type: string | null;
};

type MetricResult = {
  leadsCreated: number;
  dealsCreated: number;
  leadToDealConversion: number;
  quotesSent: number;
  invoicePaymentRate: number;
  avgDaysToPayment: number | null;
  jobsCompletedOnTime: number;
  completedJobs: number;
  activeSeats: number;
  reminderCompletionRate: number;
  taskCompletionRate: number;
  invoicesIssued: number;
  invoicesPaid: number;
};

export type PilotInsightsSnapshot = {
  range: InsightsRange;
  generatedAt: string;
  windowLabel: string;
  previousWindowLabel: string;
  metrics: MetricResult;
  deltas: Record<PilotMetricKey, number | null>;
  whatChanged: string[];
};

export type FeedbackFilters = {
  status?: FeedbackStatus | "all";
  category?: FeedbackCategory | "all";
};

export type FeedbackSummary = {
  total: number;
  open: number;
  followUpDue: number;
  criticalOpen: number;
  positiveSignals: number;
};

export type CheckInNoteWithLinks = WorkspaceCheckInNote & {
  linkedFeedback: Array<Pick<WorkspaceFeedbackItem, "id" | "title" | "status" | "category">>;
};

export type CaseStudyReadinessSummary = {
  signalCount: number;
  positiveSignalCount: number;
  hasOutcomeNotes: boolean;
  hasTestimonialQuote: boolean;
  permissionsReady: boolean;
  isCandidate: boolean;
  summary: string[];
};

export type WorkspaceFollowUpSnapshot = {
  lastCheckInDate: string | null;
  nextFollowUpDate: string | null;
  suggestedNextFollowUpDate: string | null;
  followUpStatus: PortfolioFollowUpStatus;
  followUpFocusNote: string | null;
};

export type PilotPortfolioRow = {
  workspaceId: string;
  workspaceName: string;
  role: string;
  businessType: string | null;
  pilotStatus: PilotStatus;
  customerStage: CustomerStage;
  caseStudyStatus: CaseStudyStatus;
  attentionLevel: PortfolioAttentionLevel;
  healthScore: number;
  attentionReasons: string[];
  readinessCompletionPercent: number;
  readinessThresholdReached: boolean;
  recentActivityAt: string | null;
  latestCheckInDate: string | null;
  nextFollowUpDate: string | null;
  followUpStatus: PortfolioFollowUpStatus;
  followUpFocusNote: string | null;
  activeSeats: number;
  leadsCreated: number;
  dealsCreated: number;
  leadToDealConversion: number;
  quotesSent: number;
  invoicesIssued: number;
  invoicePaymentRate: number;
  jobsCompletedOnTime: number;
  overdueInvoices: number;
  stalledDeals: number;
  jobsAtRisk: number;
  overdueTasks: number;
  outstandingBalance: number;
  overdueWorkCount: number;
  openFeedback: number;
  criticalOpenFeedback: number;
  feedbackFollowUpDue: number;
  caseStudyReadiness: CaseStudyReadinessSummary;
};

export type PortfolioFeedbackQueueItem = {
  id: string;
  workspaceId: string;
  workspaceName: string;
  businessType: string | null;
  title: string;
  category: FeedbackCategory;
  importance: FeedbackImportance;
  relatedModule: string | null;
  status: FeedbackStatus;
  followUpDate: string | null;
  contactName: string | null;
  createdAt: string;
};

export const PILOT_STATUS_OPTIONS: Array<{ value: PilotStatus; label: string }> = [
  { value: "onboarding", label: "Onboarding" },
  { value: "active_pilot", label: "Active pilot" },
  { value: "needs_attention", label: "Needs attention" },
  { value: "healthy", label: "Healthy" },
  { value: "expansion_opportunity", label: "Expansion opportunity" },
  { value: "at_risk", label: "At risk" },
  { value: "completed", label: "Completed" },
];

export const CUSTOMER_STAGE_OPTIONS: Array<{ value: CustomerStage; label: string }> = [
  { value: "trial", label: "Trial" },
  { value: "active_pilot", label: "Active pilot" },
  { value: "successful_pilot", label: "Successful pilot" },
  { value: "churn_risk", label: "Churn risk" },
  { value: "case_study_candidate", label: "Case study candidate" },
];

export const CASE_STUDY_STATUS_OPTIONS: Array<{ value: CaseStudyStatus; label: string }> = [
  { value: "not_started", label: "Not started" },
  { value: "collecting_evidence", label: "Collecting evidence" },
  { value: "awaiting_permission", label: "Awaiting permission" },
  { value: "ready_to_write", label: "Ready to write" },
  { value: "published", label: "Published" },
  { value: "not_applicable", label: "Not applicable" },
];

export const FEEDBACK_CATEGORY_OPTIONS: Array<{ value: FeedbackCategory; label: string }> = [
  { value: "pain_point", label: "Pain point" },
  { value: "missing_feature", label: "Missing feature" },
  { value: "confusing_workflow", label: "Confusing workflow" },
  { value: "bug_report", label: "Bug report" },
  { value: "positive_outcome", label: "Positive outcome" },
  { value: "time_saved", label: "Time saved" },
  { value: "customer_quote", label: "Customer quote" },
  { value: "support_note", label: "Support note" },
];

export const FEEDBACK_IMPORTANCE_OPTIONS: Array<{ value: FeedbackImportance; label: string }> = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];

export const FEEDBACK_STATUS_OPTIONS: Array<{ value: FeedbackStatus; label: string }> = [
  { value: "open", label: "Open" },
  { value: "planned", label: "Planned" },
  { value: "in_progress", label: "In progress" },
  { value: "monitoring", label: "Monitoring" },
  { value: "resolved", label: "Resolved" },
  { value: "wont_fix", label: "Won't fix" },
];

export const CHECK_IN_CONFIDENCE_OPTIONS: Array<{ value: CheckInConfidenceLevel; label: string }> = [
  { value: "low", label: "Low confidence" },
  { value: "medium", label: "Medium confidence" },
  { value: "high", label: "High confidence" },
];

export const PORTFOLIO_ATTENTION_OPTIONS: Array<{ value: PortfolioAttentionLevel | "all"; label: string }> = [
  { value: "all", label: "All attention levels" },
  { value: "healthy", label: "Healthy" },
  { value: "watch", label: "Watch" },
  { value: "needs_attention", label: "Needs attention" },
  { value: "at_risk", label: "At risk" },
];

function startOfMonth(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function normalizeStatus(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function getDateWindow(range: InsightsRange, now = new Date()): DateWindow {
  const currentEnd = new Date(now);

  if (range === "month") {
    const currentStart = startOfMonth(now);
    const previousEnd = new Date(currentStart);
    const previousStart = new Date(Date.UTC(previousEnd.getUTCFullYear(), previousEnd.getUTCMonth() - 1, 1));
    return { currentStart, currentEnd, previousStart, previousEnd };
  }

  const days = range === "7d" ? 7 : 30;
  const currentStart = new Date(currentEnd.getTime() - days * 24 * 60 * 60 * 1000);
  const previousEnd = new Date(currentStart);
  const previousStart = new Date(previousEnd.getTime() - days * 24 * 60 * 60 * 1000);
  return { currentStart, currentEnd, previousStart, previousEnd };
}

function windowLabel(start: Date, end: Date) {
  return `${formatDate(start)} to ${formatDate(end)}`;
}

function averageDaysToPayment(rows: TimePaymentRow[]) {
  const durations = rows
    .map((row) => {
      if (!row.paid_at) return null;
      const invoice = Array.isArray(row.invoice) ? row.invoice[0] : row.invoice;
      if (!invoice?.issue_date) return null;
      const diff = new Date(row.paid_at).getTime() - new Date(invoice.issue_date).getTime();
      return diff >= 0 ? diff / (24 * 60 * 60 * 1000) : null;
    })
    .filter((value): value is number => value !== null);

  if (!durations.length) return null;
  return Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10) / 10;
}

function metricDelta(current: number | null, previous: number | null) {
  if (current === null || previous === null) return null;
  return Math.round((current - previous) * 10) / 10;
}

function formatDelta(delta: number, suffix = "") {
  const sign = delta > 0 ? "+" : "";
  return `${sign}${delta}${suffix}`;
}

function buildWhatChanged(current: MetricResult, previous: MetricResult) {
  const candidates: Array<{ label: string; delta: number; type: "count" | "points" | "days" }> = [
    { label: "Lead-to-deal conversion", delta: current.leadToDealConversion - previous.leadToDealConversion, type: "points" },
    { label: "Invoice payment rate", delta: current.invoicePaymentRate - previous.invoicePaymentRate, type: "points" },
    { label: "Active seats", delta: current.activeSeats - previous.activeSeats, type: "count" },
    { label: "Quotes sent", delta: current.quotesSent - previous.quotesSent, type: "count" },
    { label: "On-time jobs completed", delta: current.jobsCompletedOnTime - previous.jobsCompletedOnTime, type: "count" },
  ]
    .filter((item) => item.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 4);

  if (current.avgDaysToPayment !== null && previous.avgDaysToPayment !== null && current.avgDaysToPayment !== previous.avgDaysToPayment) {
    candidates.push({
      label: "Average days to payment",
      delta: Math.round((current.avgDaysToPayment - previous.avgDaysToPayment) * 10) / 10,
      type: "days",
    });
  }

  return candidates.slice(0, 4).map((item) => {
    if (item.type === "points") return `${item.label} changed ${formatDelta(item.delta, " pts")} versus the previous period.`;
    if (item.type === "days") return `${item.label} changed ${formatDelta(item.delta, " days")} versus the previous period.`;
    return `${item.label} changed ${formatDelta(item.delta)} versus the previous period.`;
  });
}

function addDays(dateValue: string, days: number) {
  const next = new Date(`${dateValue}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return formatDate(next);
}

function deriveFollowUpStatus(params: {
  lastCheckInDate: string | null;
  explicitNextFollowUpDate: string | null;
  followUpFocusNote: string | null;
}) {
  const today = formatDate(new Date());
  const sevenDaysOut = addDays(today, 7);
  const suggestedNextFollowUpDate = params.lastCheckInDate ? addDays(params.lastCheckInDate, 7) : null;
  const nextFollowUpDate = params.explicitNextFollowUpDate ?? suggestedNextFollowUpDate;

  let followUpStatus: PortfolioFollowUpStatus = "unplanned";
  if (nextFollowUpDate) {
    if (nextFollowUpDate < today) followUpStatus = "overdue";
    else if (nextFollowUpDate <= sevenDaysOut) followUpStatus = "due_this_week";
    else if (params.lastCheckInDate && params.lastCheckInDate >= addDays(today, -7)) followUpStatus = "recently_checked_in";
    else followUpStatus = "scheduled";
  } else if (params.lastCheckInDate && params.lastCheckInDate >= addDays(today, -7)) {
    followUpStatus = "recently_checked_in";
  }

  return {
    lastCheckInDate: params.lastCheckInDate,
    nextFollowUpDate,
    suggestedNextFollowUpDate,
    followUpStatus,
    followUpFocusNote: params.followUpFocusNote,
  } satisfies WorkspaceFollowUpSnapshot;
}

function computeCaseStudyReadiness(params: {
  profile: WorkspacePilotProfile | null;
  positiveSignals: number;
  attentionLevel: PortfolioAttentionLevel;
  activeSeats: number;
}) {
  const hasOutcomeNotes = Boolean(params.profile?.measurable_outcome_notes?.trim());
  const hasTestimonialQuote = Boolean(params.profile?.testimonial_quote?.trim());
  const permissionsReady = Boolean(params.profile?.permission_to_use_name || params.profile?.permission_to_use_logo);

  const signalCount = [
    hasOutcomeNotes,
    hasTestimonialQuote,
    params.profile?.permission_to_use_name ?? false,
    params.profile?.permission_to_use_logo ?? false,
    params.positiveSignals > 0,
    params.attentionLevel === "healthy",
    params.activeSeats > 0,
  ].filter(Boolean).length;

  const isCandidate =
    params.profile?.customer_stage === "case_study_candidate" ||
    params.profile?.case_study_status === "ready_to_write" ||
    ((params.profile?.pilot_status === "healthy" || params.profile?.pilot_status === "completed") &&
      signalCount >= 4 &&
      params.positiveSignals > 0 &&
      params.attentionLevel !== "at_risk");

  const summary = [
    hasOutcomeNotes ? "Outcome notes present" : null,
    hasTestimonialQuote ? "Testimonial quote captured" : null,
    params.profile?.permission_to_use_name ? "Name permission recorded" : null,
    params.profile?.permission_to_use_logo ? "Logo permission recorded" : null,
    params.positiveSignals > 0 ? `${params.positiveSignals} positive signal(s)` : null,
  ].filter(Boolean) as string[];

  return {
    signalCount,
    positiveSignalCount: params.positiveSignals,
    hasOutcomeNotes,
    hasTestimonialQuote,
    permissionsReady,
    isCandidate,
    summary,
  } satisfies CaseStudyReadinessSummary;
}

async function countLeadConversions(workspaceId: string, leadIds: string[], endIso: string) {
  if (!leadIds.length) return 0;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("deals")
    .select("lead_id")
    .eq("workspace_id", workspaceId)
    .in("lead_id", leadIds)
    .lt("created_at", endIso);

  if (error) throw error;
  return new Set((data ?? []).map((row) => row.lead_id).filter(Boolean)).size;
}

async function buildMetricResult(workspaceId: string, start: Date, end: Date): Promise<MetricResult> {
  const supabase = await createClient();
  const startIso = start.toISOString();
  const endIso = end.toISOString();

  const [
    leadsQuery,
    dealsQuery,
    quoteEventsQuery,
    invoicesQuery,
    paymentsQuery,
    jobsQuery,
    tasksQuery,
    remindersQuery,
    activeSeatsQuery,
  ] = await Promise.all([
    supabase.from("leads").select("id").eq("workspace_id", workspaceId).gte("created_at", startIso).lt("created_at", endIso),
    supabase.from("deals").select("id").eq("workspace_id", workspaceId).gte("created_at", startIso).lt("created_at", endIso),
    supabase
      .from("activities")
      .select("entity_id")
      .eq("workspace_id", workspaceId)
      .in("activity_type", ["quote.sent", "quote.accepted"])
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    supabase
      .from("invoices")
      .select("id,status,total_amount,paid_amount")
      .eq("workspace_id", workspaceId)
      .gte("created_at", startIso)
      .lt("created_at", endIso),
    supabase
      .from("payments")
      .select("paid_at,invoice:invoices(issue_date)")
      .eq("workspace_id", workspaceId)
      .gte("paid_at", startIso)
      .lt("paid_at", endIso),
    supabase
      .from("jobs")
      .select("id,status,due_date,updated_at")
      .eq("workspace_id", workspaceId)
      .eq("status", "completed")
      .gte("updated_at", startIso)
      .lt("updated_at", endIso),
    supabase.from("tasks").select("id,status").eq("workspace_id", workspaceId).gte("created_at", startIso).lt("created_at", endIso),
    supabase.from("reminders").select("id,status").eq("workspace_id", workspaceId).gte("created_at", startIso).lt("created_at", endIso),
    supabase
      .from("activities")
      .select("actor_user_id")
      .eq("workspace_id", workspaceId)
      .not("actor_user_id", "is", null)
      .gte("created_at", startIso)
      .lt("created_at", endIso),
  ]);

  if (leadsQuery.error) throw leadsQuery.error;
  if (dealsQuery.error) throw dealsQuery.error;
  if (quoteEventsQuery.error) throw quoteEventsQuery.error;
  if (invoicesQuery.error) throw invoicesQuery.error;
  if (paymentsQuery.error) throw paymentsQuery.error;
  if (jobsQuery.error) throw jobsQuery.error;
  if (tasksQuery.error) throw tasksQuery.error;
  if (remindersQuery.error) throw remindersQuery.error;
  if (activeSeatsQuery.error) throw activeSeatsQuery.error;

  const leads = leadsQuery.data ?? [];
  const leadConversions = await countLeadConversions(workspaceId, leads.map((lead) => lead.id), endIso);
  const invoices = invoicesQuery.data ?? [];
  const fullyPaidInvoices = invoices.filter((invoice) => {
    const totalAmount = Number(invoice.total_amount ?? 0);
    const paidAmount = Number(invoice.paid_amount ?? 0);
    return normalizeStatus(invoice.status) === "paid" || (totalAmount > 0 && paidAmount >= totalAmount);
  }).length;
  const completedJobs = jobsQuery.data ?? [];
  const tasks = tasksQuery.data ?? [];
  const reminders = remindersQuery.data ?? [];
  const uniqueQuoteIds = new Set((quoteEventsQuery.data ?? []).map((row) => row.entity_id).filter(Boolean));
  const uniqueActors = new Set((activeSeatsQuery.data ?? []).map((row) => row.actor_user_id).filter(Boolean));

  return {
    leadsCreated: leads.length,
    dealsCreated: (dealsQuery.data ?? []).length,
    leadToDealConversion: leads.length > 0 ? Math.round((leadConversions / leads.length) * 100) : 0,
    quotesSent: uniqueQuoteIds.size,
    invoicePaymentRate: invoices.length > 0 ? Math.round((fullyPaidInvoices / invoices.length) * 100) : 0,
    avgDaysToPayment: averageDaysToPayment((paymentsQuery.data ?? []) as TimePaymentRow[]),
    jobsCompletedOnTime: completedJobs.filter((job) => !job.due_date || (job.updated_at?.slice(0, 10) ?? "") <= job.due_date).length,
    completedJobs: completedJobs.length,
    activeSeats: uniqueActors.size,
    reminderCompletionRate:
      reminders.length > 0 ? Math.round((reminders.filter((item) => normalizeStatus(item.status) === "done").length / reminders.length) * 100) : 0,
    taskCompletionRate:
      tasks.length > 0 ? Math.round((tasks.filter((item) => normalizeStatus(item.status) === "done").length / tasks.length) * 100) : 0,
    invoicesIssued: invoices.length,
    invoicesPaid: fullyPaidInvoices,
  };
}

async function buildWorkspacePortfolioRow(params: {
  workspace: WorkspaceReference;
  role: string;
  range: InsightsRange;
}) {
  const supabase = await createClient();
  const [profile, insight, feedbackSummary, review, readiness, latestActivityQuery, latestCheckInQuery] = await Promise.all([
    getWorkspacePilotProfile(params.workspace.id),
    getPilotInsightsSnapshot(params.workspace.id, params.range),
    getWorkspaceFeedbackSummary(params.workspace.id),
    getWeeklyReviewSnapshot(params.workspace.id),
    getSetupReadiness(params.workspace.id),
    supabase.from("activities").select("created_at").eq("workspace_id", params.workspace.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase
      .from("workspace_check_in_notes")
      .select("note_date")
      .eq("workspace_id", params.workspace.id)
      .order("note_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (latestActivityQuery.error) throw latestActivityQuery.error;
  if (latestCheckInQuery.error) throw latestCheckInQuery.error;

  const followUp = deriveFollowUpStatus({
    lastCheckInDate: latestCheckInQuery.data?.note_date ?? null,
    explicitNextFollowUpDate: profile?.next_follow_up_date ?? null,
    followUpFocusNote: profile?.follow_up_focus_note ?? null,
  });

  const attentionReasons: string[] = [];
  let healthScore = 100;

  if (!readiness.isThresholdReached) {
    healthScore -= 15;
    attentionReasons.push(`Setup readiness ${readiness.completionPercent}%`);
  }
  if (insight.metrics.activeSeats === 0) {
    healthScore -= 20;
    attentionReasons.push("No active seats this window");
  } else if (insight.metrics.activeSeats === 1) {
    healthScore -= 10;
    attentionReasons.push("Only one active seat this window");
  }
  if (review.topAttention.overdueInvoices > 0) {
    healthScore -= 15;
    attentionReasons.push(`${review.topAttention.overdueInvoices} overdue invoice(s)`);
  }
  if (review.topAttention.stalledDeals > 0) {
    healthScore -= 12;
    attentionReasons.push(`${review.topAttention.stalledDeals} stalled deal(s)`);
  }
  if (review.topAttention.jobsAtRisk > 0) {
    healthScore -= 10;
    attentionReasons.push(`${review.topAttention.jobsAtRisk} job(s) at risk`);
  }
  if (review.topAttention.overdueTasks > 0) {
    healthScore -= 8;
    attentionReasons.push(`${review.topAttention.overdueTasks} overdue task(s)`);
  }
  if (feedbackSummary.criticalOpen > 0) {
    healthScore -= 15;
    attentionReasons.push(`${feedbackSummary.criticalOpen} critical feedback item(s)`);
  }
  if (followUp.followUpStatus === "overdue") {
    healthScore -= 20;
    attentionReasons.push("Founder follow-up overdue");
  } else if (followUp.followUpStatus === "due_this_week") {
    healthScore -= 8;
    attentionReasons.push("Founder follow-up due this week");
  } else if (followUp.followUpStatus === "unplanned") {
    healthScore -= 12;
    attentionReasons.push("No follow-up cadence set");
  }
  if (profile?.pilot_status === "at_risk") {
    healthScore -= 20;
    attentionReasons.push("Pilot marked at risk");
  } else if (profile?.pilot_status === "needs_attention") {
    healthScore -= 10;
    attentionReasons.push("Pilot marked needs attention");
  }

  const attentionLevel: PortfolioAttentionLevel =
    profile?.pilot_status === "at_risk" || healthScore <= 49
      ? "at_risk"
      : healthScore <= 69
        ? "needs_attention"
        : healthScore <= 84
          ? "watch"
          : "healthy";

  const caseStudyReadiness = computeCaseStudyReadiness({
    profile,
    positiveSignals: feedbackSummary.positiveSignals,
    attentionLevel,
    activeSeats: insight.metrics.activeSeats,
  });

  return {
    workspaceId: params.workspace.id,
    workspaceName: params.workspace.name,
    role: params.role,
    businessType: params.workspace.business_type,
    pilotStatus: profile?.pilot_status ?? "onboarding",
    customerStage: profile?.customer_stage ?? "trial",
    caseStudyStatus: profile?.case_study_status ?? "not_started",
    attentionLevel,
    healthScore: Math.max(0, healthScore),
    attentionReasons: attentionReasons.slice(0, 4),
    readinessCompletionPercent: readiness.completionPercent,
    readinessThresholdReached: readiness.isThresholdReached,
    recentActivityAt: latestActivityQuery.data?.created_at ?? null,
    latestCheckInDate: followUp.lastCheckInDate,
    nextFollowUpDate: followUp.nextFollowUpDate,
    followUpStatus: followUp.followUpStatus,
    followUpFocusNote: followUp.followUpFocusNote,
    activeSeats: insight.metrics.activeSeats,
    leadsCreated: insight.metrics.leadsCreated,
    dealsCreated: insight.metrics.dealsCreated,
    leadToDealConversion: insight.metrics.leadToDealConversion,
    quotesSent: insight.metrics.quotesSent,
    invoicesIssued: insight.metrics.invoicesIssued,
    invoicePaymentRate: insight.metrics.invoicePaymentRate,
    jobsCompletedOnTime: insight.metrics.jobsCompletedOnTime,
    overdueInvoices: review.topAttention.overdueInvoices,
    stalledDeals: review.topAttention.stalledDeals,
    jobsAtRisk: review.topAttention.jobsAtRisk,
    overdueTasks: review.topAttention.overdueTasks,
    outstandingBalance: review.metrics.outstandingBalance,
    overdueWorkCount: review.topAttention.overdueInvoices + review.topAttention.jobsAtRisk + review.topAttention.overdueTasks,
    openFeedback: feedbackSummary.open,
    criticalOpenFeedback: feedbackSummary.criticalOpen,
    feedbackFollowUpDue: feedbackSummary.followUpDue,
    caseStudyReadiness,
  } satisfies PilotPortfolioRow;
}

export async function getWorkspacePilotProfile(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("workspace_pilot_profiles").select("*").eq("workspace_id", workspaceId).maybeSingle();
  if (error) throw error;
  return data as WorkspacePilotProfile | null;
}

export async function getPilotInsightsSnapshot(workspaceId: string, range: InsightsRange): Promise<PilotInsightsSnapshot> {
  const window = getDateWindow(range);
  const [current, previous] = await Promise.all([
    buildMetricResult(workspaceId, window.currentStart, window.currentEnd),
    buildMetricResult(workspaceId, window.previousStart, window.previousEnd),
  ]);

  return {
    range,
    generatedAt: new Date().toISOString(),
    windowLabel: windowLabel(window.currentStart, window.currentEnd),
    previousWindowLabel: windowLabel(window.previousStart, window.previousEnd),
    metrics: current,
    deltas: {
      leadsCreated: metricDelta(current.leadsCreated, previous.leadsCreated),
      dealsCreated: metricDelta(current.dealsCreated, previous.dealsCreated),
      leadToDealConversion: metricDelta(current.leadToDealConversion, previous.leadToDealConversion),
      quotesSent: metricDelta(current.quotesSent, previous.quotesSent),
      invoicePaymentRate: metricDelta(current.invoicePaymentRate, previous.invoicePaymentRate),
      avgDaysToPayment: metricDelta(current.avgDaysToPayment, previous.avgDaysToPayment),
      jobsCompletedOnTime: metricDelta(current.jobsCompletedOnTime, previous.jobsCompletedOnTime),
      activeSeats: metricDelta(current.activeSeats, previous.activeSeats),
      reminderCompletionRate: metricDelta(current.reminderCompletionRate, previous.reminderCompletionRate),
      taskCompletionRate: metricDelta(current.taskCompletionRate, previous.taskCompletionRate),
    },
    whatChanged: buildWhatChanged(current, previous),
  };
}

export async function getWorkspacePortfolioSummary(params: {
  workspaceId: string;
  workspaceName: string;
  businessType: string | null;
  role: string;
  range: InsightsRange;
}) {
  return buildWorkspacePortfolioRow({
    workspace: { id: params.workspaceId, name: params.workspaceName, business_type: params.businessType },
    role: params.role,
    range: params.range,
  });
}

export async function listWorkspaceFeedbackItems(workspaceId: string, filters?: FeedbackFilters) {
  const supabase = await createClient();
  let query = supabase
    .from("workspace_feedback_items")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });

  if (filters?.status && filters.status !== "all") query = query.eq("status", filters.status);
  if (filters?.category && filters.category !== "all") query = query.eq("category", filters.category);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as WorkspaceFeedbackItem[];
}

export async function getWorkspaceFeedbackSummary(workspaceId: string): Promise<FeedbackSummary> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_feedback_items")
    .select("id,status,importance,category,follow_up_date")
    .eq("workspace_id", workspaceId);

  if (error) throw error;

  const today = formatDate(new Date());
  const rows = data ?? [];
  return {
    total: rows.length,
    open: rows.filter((row) => !["resolved", "wont_fix"].includes(normalizeStatus(row.status))).length,
    followUpDue: rows.filter((row) => row.follow_up_date && row.follow_up_date <= today && !["resolved", "wont_fix"].includes(normalizeStatus(row.status))).length,
    criticalOpen: rows.filter((row) => normalizeStatus(row.importance) === "critical" && !["resolved", "wont_fix"].includes(normalizeStatus(row.status))).length,
    positiveSignals: rows.filter((row) => ["positive_outcome", "time_saved", "customer_quote"].includes(normalizeStatus(row.category))).length,
  };
}

export async function listWorkspaceCheckInNotes(workspaceId: string) {
  const supabase = await createClient();
  const [notesQuery, linksQuery, feedbackQuery] = await Promise.all([
    supabase.from("workspace_check_in_notes").select("*").eq("workspace_id", workspaceId).order("note_date", { ascending: false }).order("created_at", { ascending: false }),
    supabase.from("workspace_check_in_feedback_links").select("check_in_note_id, feedback_item_id").eq("workspace_id", workspaceId),
    supabase.from("workspace_feedback_items").select("id,title,status,category").eq("workspace_id", workspaceId),
  ]);

  if (notesQuery.error) throw notesQuery.error;
  if (linksQuery.error) throw linksQuery.error;
  if (feedbackQuery.error) throw feedbackQuery.error;

  const feedbackMap = new Map((feedbackQuery.data ?? []).map((item) => [item.id, item]));
  const linksByNote = new Map<string, CheckInNoteWithLinks["linkedFeedback"]>();

  for (const link of linksQuery.data ?? []) {
    const feedback = feedbackMap.get(link.feedback_item_id);
    if (!feedback) continue;
    const existing = linksByNote.get(link.check_in_note_id) ?? [];
    existing.push({
      id: feedback.id,
      title: feedback.title,
      status: feedback.status as FeedbackStatus,
      category: feedback.category as FeedbackCategory,
    });
    linksByNote.set(link.check_in_note_id, existing);
  }

  return ((notesQuery.data ?? []) as WorkspaceCheckInNote[]).map((note) => ({
    ...note,
    linkedFeedback: linksByNote.get(note.id) ?? [],
  }));
}

export async function listPilotWorkspacePortfolio(
  userId: string,
  range: InsightsRange,
  filters?: {
    pilotStatus?: PilotStatus | "all";
    attentionLevel?: PortfolioAttentionLevel | "all";
    businessType?: string | "all";
    caseStudyOnly?: boolean;
    followUpStatus?: PortfolioFollowUpStatus | "all";
  },
) {
  const memberships = (await getWorkspacesForUser(userId)).filter((membership) => membership.role === "owner" || membership.role === "admin");
  let rows = await Promise.all(
    memberships.map((membership) =>
      buildWorkspacePortfolioRow({
        workspace: membership.workspace,
        role: membership.role,
        range,
      }),
    ),
  );

  if (filters?.pilotStatus && filters.pilotStatus !== "all") rows = rows.filter((row) => row.pilotStatus === filters.pilotStatus);
  if (filters?.attentionLevel && filters.attentionLevel !== "all") rows = rows.filter((row) => row.attentionLevel === filters.attentionLevel);
  if (filters?.businessType && filters.businessType !== "all") rows = rows.filter((row) => row.businessType === filters.businessType);
  if (filters?.followUpStatus && filters.followUpStatus !== "all") rows = rows.filter((row) => row.followUpStatus === filters.followUpStatus);
  if (filters?.caseStudyOnly) rows = rows.filter((row) => row.caseStudyReadiness.isCandidate);

  rows.sort((a, b) => {
    const attentionRank: Record<PortfolioAttentionLevel, number> = { at_risk: 0, needs_attention: 1, watch: 2, healthy: 3 };
    const followUpRank: Record<PortfolioFollowUpStatus, number> = {
      overdue: 0,
      due_this_week: 1,
      unplanned: 2,
      scheduled: 3,
      recently_checked_in: 4,
    };
    if (attentionRank[a.attentionLevel] !== attentionRank[b.attentionLevel]) {
      return attentionRank[a.attentionLevel] - attentionRank[b.attentionLevel];
    }
    if (followUpRank[a.followUpStatus] !== followUpRank[b.followUpStatus]) {
      return followUpRank[a.followUpStatus] - followUpRank[b.followUpStatus];
    }
    return a.workspaceName.localeCompare(b.workspaceName);
  });

  return rows;
}

export async function listPortfolioFeedbackQueue(
  userId: string,
  filters?: {
    importance?: FeedbackImportance | "all";
    category?: FeedbackCategory | "all";
    module?: string | "all";
  },
) {
  const memberships = (await getWorkspacesForUser(userId)).filter((membership) => membership.role === "owner" || membership.role === "admin");
  const workspaceIds = memberships.map((membership) => membership.workspace.id);
  if (!workspaceIds.length) return [] as PortfolioFeedbackQueueItem[];

  const workspaceMap = new Map(
    memberships.map((membership) => [
      membership.workspace.id,
      { workspaceName: membership.workspace.name, businessType: membership.workspace.business_type },
    ]),
  );

  const supabase = await createClient();
  let query = supabase
    .from("workspace_feedback_items")
    .select("id,workspace_id,title,category,importance,related_module,status,follow_up_date,contact_name,created_at")
    .in("workspace_id", workspaceIds)
    .order("created_at", { ascending: false });

  if (filters?.importance && filters.importance !== "all") query = query.eq("importance", filters.importance);
  if (filters?.category && filters.category !== "all") query = query.eq("category", filters.category);
  if (filters?.module && filters.module !== "all") query = query.eq("related_module", filters.module);

  const { data, error } = await query;
  if (error) throw error;

  return (data ?? [])
    .filter((item) => !["resolved", "wont_fix"].includes(item.status))
    .map((item) => ({
      id: item.id,
      workspaceId: item.workspace_id,
      workspaceName: workspaceMap.get(item.workspace_id)?.workspaceName ?? item.workspace_id,
      businessType: workspaceMap.get(item.workspace_id)?.businessType ?? null,
      title: item.title,
      category: item.category as FeedbackCategory,
      importance: item.importance as FeedbackImportance,
      relatedModule: item.related_module,
      status: item.status as FeedbackStatus,
      followUpDate: item.follow_up_date,
      contactName: item.contact_name,
      createdAt: item.created_at,
    }))
    .sort((a, b) => {
      const importanceRank: Record<FeedbackImportance, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      if (importanceRank[a.importance] !== importanceRank[b.importance]) {
        return importanceRank[a.importance] - importanceRank[b.importance];
      }
      if ((a.followUpDate ?? "9999-12-31") !== (b.followUpDate ?? "9999-12-31")) {
        return (a.followUpDate ?? "9999-12-31").localeCompare(b.followUpDate ?? "9999-12-31");
      }
      return b.createdAt.localeCompare(a.createdAt);
    });
}
