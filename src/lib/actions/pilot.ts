"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { logActivity } from "@/lib/db/activity";
import {
  getPilotInsightsSnapshot,
  getWorkspacePilotProfile,
} from "@/lib/db/pilot";
import { getWeeklyReviewSnapshot } from "@/lib/db/review";
import type {
  CaseStudyStatus,
  CheckInConfidenceLevel,
  CustomerStage,
  FeedbackCategory,
  FeedbackImportance,
  FeedbackStatus,
  PilotStatus,
} from "@/types/database";

const pilotStatuses = new Set<PilotStatus>(["onboarding", "active_pilot", "needs_attention", "healthy", "expansion_opportunity", "at_risk", "completed"]);
const customerStages = new Set<CustomerStage>(["trial", "active_pilot", "successful_pilot", "churn_risk", "case_study_candidate"]);
const caseStudyStatuses = new Set<CaseStudyStatus>(["not_started", "collecting_evidence", "awaiting_permission", "ready_to_write", "published", "not_applicable"]);
const feedbackCategories = new Set<FeedbackCategory>([
  "pain_point",
  "missing_feature",
  "confusing_workflow",
  "bug_report",
  "positive_outcome",
  "time_saved",
  "customer_quote",
  "support_note",
]);
const feedbackImportanceValues = new Set<FeedbackImportance>(["low", "medium", "high", "critical"]);
const feedbackStatuses = new Set<FeedbackStatus>(["open", "planned", "in_progress", "monitoring", "resolved", "wont_fix"]);
const confidenceLevels = new Set<CheckInConfidenceLevel>(["low", "medium", "high"]);

function withInsightsQuery(params: Record<string, string | null | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const suffix = query.toString();
  return suffix ? `/insights?${suffix}` : "/insights";
}

function withPilotsQuery(params: Record<string, string | null | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) query.set(key, value);
  }
  const suffix = query.toString();
  return suffix ? `/pilots?${suffix}` : "/pilots";
}

function parsePilotStatus(value: FormDataEntryValue | null): PilotStatus {
  const parsed = String(value ?? "").trim() as PilotStatus;
  return pilotStatuses.has(parsed) ? parsed : "onboarding";
}

function parseCustomerStage(value: FormDataEntryValue | null): CustomerStage {
  const parsed = String(value ?? "").trim() as CustomerStage;
  return customerStages.has(parsed) ? parsed : "trial";
}

function parseCaseStudyStatus(value: FormDataEntryValue | null): CaseStudyStatus {
  const parsed = String(value ?? "").trim() as CaseStudyStatus;
  return caseStudyStatuses.has(parsed) ? parsed : "not_started";
}

function parseFeedbackCategory(value: FormDataEntryValue | null): FeedbackCategory {
  const parsed = String(value ?? "").trim() as FeedbackCategory;
  return feedbackCategories.has(parsed) ? parsed : "pain_point";
}

function parseFeedbackImportance(value: FormDataEntryValue | null): FeedbackImportance {
  const parsed = String(value ?? "").trim() as FeedbackImportance;
  return feedbackImportanceValues.has(parsed) ? parsed : "medium";
}

function parseFeedbackStatus(value: FormDataEntryValue | null): FeedbackStatus {
  const parsed = String(value ?? "").trim() as FeedbackStatus;
  return feedbackStatuses.has(parsed) ? parsed : "open";
}

function parseConfidence(value: FormDataEntryValue | null): CheckInConfidenceLevel {
  const parsed = String(value ?? "").trim() as CheckInConfidenceLevel;
  return confidenceLevels.has(parsed) ? parsed : "medium";
}

function parseCheckbox(value: FormDataEntryValue | null) {
  return value === "on" || value === "true";
}

function parseOptionalDate(value: FormDataEntryValue | null) {
  const parsed = String(value ?? "").trim();
  return parsed || null;
}

function parseOptionalText(value: FormDataEntryValue | null) {
  const parsed = String(value ?? "").trim();
  return parsed || null;
}

function parseTeamSize(value: FormDataEntryValue | null) {
  const parsed = Number(String(value ?? "").trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

async function replaceCheckInLinks(params: { workspaceId: string; checkInNoteId: string; feedbackIds: string[] }) {
  const supabase = await createClient();
  await supabase.from("workspace_check_in_feedback_links").delete().eq("workspace_id", params.workspaceId).eq("check_in_note_id", params.checkInNoteId);

  if (!params.feedbackIds.length) return;

  const { data: validFeedback, error: feedbackError } = await supabase
    .from("workspace_feedback_items")
    .select("id")
    .eq("workspace_id", params.workspaceId)
    .in("id", params.feedbackIds);
  if (feedbackError) throw feedbackError;

  const validIds = new Set((validFeedback ?? []).map((item) => item.id));
  const rows = params.feedbackIds
    .filter((id) => validIds.has(id))
    .map((feedbackId) => ({
      workspace_id: params.workspaceId,
      check_in_note_id: params.checkInNoteId,
      feedback_item_id: feedbackId,
    }));

  if (!rows.length) return;
  const { error } = await supabase.from("workspace_check_in_feedback_links").insert(rows);
  if (error) throw error;
}

export async function updatePilotProfileAction(formData: FormData) {
  const { workspace, user } = await requireWorkspace("admin");
  const supabase = await createClient();
  const currentProfile = await getWorkspacePilotProfile(workspace.id);
  const nextPilotStatus = parsePilotStatus(formData.get("pilot_status"));
  const nextCaseStudyStatus = parseCaseStudyStatus(formData.get("case_study_status"));

  const payload = {
    workspace_id: workspace.id,
    pilot_status: nextPilotStatus,
    customer_stage: parseCustomerStage(formData.get("customer_stage")),
    team_size_estimate: parseTeamSize(formData.get("team_size_estimate")),
    baseline_process_notes: parseOptionalText(formData.get("baseline_process_notes")),
    measurable_outcome_notes: parseOptionalText(formData.get("measurable_outcome_notes")),
    testimonial_quote: parseOptionalText(formData.get("testimonial_quote")),
    permission_to_use_name: parseCheckbox(formData.get("permission_to_use_name")),
    permission_to_use_logo: parseCheckbox(formData.get("permission_to_use_logo")),
    case_study_status: nextCaseStudyStatus,
    next_follow_up_date: parseOptionalDate(formData.get("next_follow_up_date")),
    follow_up_focus_note: parseOptionalText(formData.get("follow_up_focus_note")),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("workspace_pilot_profiles").upsert(payload, { onConflict: "workspace_id" });
  if (error) redirect(withInsightsQuery({ error: error.message }));

  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "pilot_profile",
    entityId: workspace.id,
    type: "pilot_profile.updated",
    description: "Pilot profile updated",
  });

  if (currentProfile?.pilot_status !== nextPilotStatus) {
    await logActivity({
      workspaceId: workspace.id,
      actorUserId: user.id,
      entityType: "pilot_profile",
      entityId: workspace.id,
      type: "pilot_status.changed",
      description: `Pilot status changed to ${nextPilotStatus}`,
      metadata: { previous_status: currentProfile?.pilot_status ?? null, next_status: nextPilotStatus },
    });
  }

  if (
    currentProfile?.case_study_status !== nextCaseStudyStatus ||
    currentProfile?.permission_to_use_name !== payload.permission_to_use_name ||
    currentProfile?.permission_to_use_logo !== payload.permission_to_use_logo ||
    currentProfile?.testimonial_quote !== payload.testimonial_quote
  ) {
    await logActivity({
      workspaceId: workspace.id,
      actorUserId: user.id,
      entityType: "pilot_profile",
      entityId: workspace.id,
      type: "case_study.updated",
      description: "Case-study readiness fields updated",
      metadata: { case_study_status: nextCaseStudyStatus },
    });
  }

  if (
    currentProfile?.next_follow_up_date !== payload.next_follow_up_date ||
    currentProfile?.follow_up_focus_note !== payload.follow_up_focus_note
  ) {
    await logActivity({
      workspaceId: workspace.id,
      actorUserId: user.id,
      entityType: "pilot_profile",
      entityId: workspace.id,
      type: "pilot_follow_up.updated",
      description: "Pilot follow-up cadence updated",
      metadata: {
        next_follow_up_date: payload.next_follow_up_date,
      },
    });
  }

  redirect(withInsightsQuery({ success: "Pilot profile updated" }));
}

export async function updatePilotFollowUpAction(formData: FormData) {
  const { user } = await requireWorkspace("admin");
  const supabase = await createClient();

  const workspaceId = String(formData.get("workspace_id") ?? "").trim();
  if (!workspaceId) redirect(withPilotsQuery({ error: "Workspace is required" }));

  const { data: profile, error: profileError } = await supabase
    .from("workspace_pilot_profiles")
    .select("workspace_id,next_follow_up_date,follow_up_focus_note")
    .eq("workspace_id", workspaceId)
    .maybeSingle();
  if (profileError) redirect(withPilotsQuery({ error: profileError.message }));
  if (!profile) redirect(withPilotsQuery({ error: "Pilot profile not found" }));

  const nextFollowUpDate = parseOptionalDate(formData.get("next_follow_up_date"));
  const followUpFocusNote = parseOptionalText(formData.get("follow_up_focus_note"));

  const { error } = await supabase
    .from("workspace_pilot_profiles")
    .update({
      next_follow_up_date: nextFollowUpDate,
      follow_up_focus_note: followUpFocusNote,
      updated_at: new Date().toISOString(),
    })
    .eq("workspace_id", workspaceId);
  if (error) redirect(withPilotsQuery({ error: error.message }));

  await logActivity({
    workspaceId,
    actorUserId: user.id,
    entityType: "pilot_profile",
    entityId: workspaceId,
    type: "pilot_follow_up.updated",
    description: "Pilot follow-up cadence updated",
    metadata: {
      previous_next_follow_up_date: profile.next_follow_up_date,
      next_follow_up_date: nextFollowUpDate,
    },
  });

  redirect(withPilotsQuery({ success: "Pilot follow-up updated" }));
}

export async function createFeedbackItemAction(formData: FormData) {
  const { workspace, user } = await requireWorkspace("admin");
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const noteBody = String(formData.get("note_body") ?? "").trim();
  if (!title || !noteBody) redirect(withInsightsQuery({ error: "Feedback title and note are required" }));

  const { data: feedback, error } = await supabase
    .from("workspace_feedback_items")
    .insert({
      workspace_id: workspace.id,
      title,
      category: parseFeedbackCategory(formData.get("category")),
      note_body: noteBody,
      importance: parseFeedbackImportance(formData.get("importance")),
      related_module: parseOptionalText(formData.get("related_module")),
      status: parseFeedbackStatus(formData.get("status")),
      follow_up_date: parseOptionalDate(formData.get("follow_up_date")),
      contact_name: parseOptionalText(formData.get("contact_name")),
      evidence_entity_type: parseOptionalText(formData.get("evidence_entity_type")),
      evidence_entity_id: parseOptionalText(formData.get("evidence_entity_id")),
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();

  if (error || !feedback) redirect(withInsightsQuery({ error: error?.message ?? "Could not save feedback item" }));

  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "pilot_feedback",
    entityId: feedback.id,
    type: "feedback.created",
    description: `Feedback logged: ${title}`,
  });

  redirect(withInsightsQuery({ success: "Feedback item saved" }));
}

export async function updateFeedbackItemAction(formData: FormData) {
  const { workspace, user } = await requireWorkspace("admin");
  const supabase = await createClient();

  const feedbackId = String(formData.get("feedback_id") ?? "").trim();
  if (!feedbackId) redirect(withInsightsQuery({ error: "Feedback item is required" }));

  const { data: current, error: currentError } = await supabase
    .from("workspace_feedback_items")
    .select("id,title,status")
    .eq("workspace_id", workspace.id)
    .eq("id", feedbackId)
    .maybeSingle();
  if (currentError) redirect(withInsightsQuery({ error: currentError.message }));
  if (!current) redirect(withInsightsQuery({ error: "Feedback item not found" }));

  const nextStatus = parseFeedbackStatus(formData.get("status"));
  const payload = {
    title: String(formData.get("title") ?? current.title).trim(),
    category: parseFeedbackCategory(formData.get("category")),
    note_body: String(formData.get("note_body") ?? "").trim(),
    importance: parseFeedbackImportance(formData.get("importance")),
    related_module: parseOptionalText(formData.get("related_module")),
    status: nextStatus,
    follow_up_date: parseOptionalDate(formData.get("follow_up_date")),
    contact_name: parseOptionalText(formData.get("contact_name")),
    evidence_entity_type: parseOptionalText(formData.get("evidence_entity_type")),
    evidence_entity_id: parseOptionalText(formData.get("evidence_entity_id")),
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  if (!payload.title || !payload.note_body) redirect(withInsightsQuery({ error: "Feedback title and note are required" }));

  const { error } = await supabase.from("workspace_feedback_items").update(payload).eq("workspace_id", workspace.id).eq("id", feedbackId);
  if (error) redirect(withInsightsQuery({ error: error.message }));

  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "pilot_feedback",
    entityId: feedbackId,
    type: "feedback.updated",
    description: `Feedback updated: ${payload.title}`,
  });

  if (current.status !== nextStatus) {
    await logActivity({
      workspaceId: workspace.id,
      actorUserId: user.id,
      entityType: "pilot_feedback",
      entityId: feedbackId,
      type: "feedback.status_changed",
      description: `Feedback status changed to ${nextStatus}`,
      metadata: { previous_status: current.status, next_status: nextStatus },
    });
  }

  redirect(withInsightsQuery({ success: "Feedback item updated" }));
}

export async function createCheckInNoteAction(formData: FormData) {
  const { workspace, user } = await requireWorkspace("admin");
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  if (!title) redirect(withInsightsQuery({ error: "Check-in title is required" }));

  const [weeklyReview, weeklyInsights] = await Promise.all([
    getWeeklyReviewSnapshot(workspace.id),
    getPilotInsightsSnapshot(workspace.id, "7d"),
  ]);

  const { data: note, error } = await supabase
    .from("workspace_check_in_notes")
    .insert({
      workspace_id: workspace.id,
      title,
      note_date: parseOptionalDate(formData.get("note_date")) ?? new Date().toISOString().slice(0, 10),
      customer_summary: parseOptionalText(formData.get("customer_summary")),
      blockers: parseOptionalText(formData.get("blockers")),
      wins: parseOptionalText(formData.get("wins")),
      requested_changes: parseOptionalText(formData.get("requested_changes")),
      next_actions: parseOptionalText(formData.get("next_actions")),
      confidence_level: parseConfidence(formData.get("confidence_level")),
      evidence_snapshot: {
        generated_at: weeklyReview.generatedAt,
        review_window: weeklyReview.windowLabel,
        top_attention: weeklyReview.topAttention,
        weekly_metrics: weeklyReview.metrics,
        insights_window: weeklyInsights.windowLabel,
        insights_metrics: weeklyInsights.metrics,
      },
      created_by: user.id,
      updated_by: user.id,
    })
    .select("id")
    .single();

  if (error || !note) redirect(withInsightsQuery({ error: error?.message ?? "Could not save check-in note" }));

  const linkedFeedbackIds = formData
    .getAll("linked_feedback_ids")
    .map((value) => String(value).trim())
    .filter(Boolean);
  await replaceCheckInLinks({ workspaceId: workspace.id, checkInNoteId: note.id, feedbackIds: linkedFeedbackIds });

  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "check_in_note",
    entityId: note.id,
    type: "check_in.created",
    description: `Weekly check-in logged: ${title}`,
  });

  redirect(withInsightsQuery({ success: "Check-in note saved" }));
}

export async function updateCheckInNoteAction(formData: FormData) {
  const { workspace, user } = await requireWorkspace("admin");
  const supabase = await createClient();

  const noteId = String(formData.get("check_in_note_id") ?? "").trim();
  if (!noteId) redirect(withInsightsQuery({ error: "Check-in note is required" }));

  const { data: current, error: currentError } = await supabase
    .from("workspace_check_in_notes")
    .select("id,title")
    .eq("workspace_id", workspace.id)
    .eq("id", noteId)
    .maybeSingle();
  if (currentError) redirect(withInsightsQuery({ error: currentError.message }));
  if (!current) redirect(withInsightsQuery({ error: "Check-in note not found" }));

  const [weeklyReview, weeklyInsights] = await Promise.all([
    getWeeklyReviewSnapshot(workspace.id),
    getPilotInsightsSnapshot(workspace.id, "7d"),
  ]);

  const payload = {
    title: String(formData.get("title") ?? current.title).trim(),
    note_date: parseOptionalDate(formData.get("note_date")) ?? new Date().toISOString().slice(0, 10),
    customer_summary: parseOptionalText(formData.get("customer_summary")),
    blockers: parseOptionalText(formData.get("blockers")),
    wins: parseOptionalText(formData.get("wins")),
    requested_changes: parseOptionalText(formData.get("requested_changes")),
    next_actions: parseOptionalText(formData.get("next_actions")),
    confidence_level: parseConfidence(formData.get("confidence_level")),
    evidence_snapshot: {
      generated_at: weeklyReview.generatedAt,
      review_window: weeklyReview.windowLabel,
      top_attention: weeklyReview.topAttention,
      weekly_metrics: weeklyReview.metrics,
      insights_window: weeklyInsights.windowLabel,
      insights_metrics: weeklyInsights.metrics,
    },
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  };

  if (!payload.title) redirect(withInsightsQuery({ error: "Check-in title is required" }));

  const { error } = await supabase.from("workspace_check_in_notes").update(payload).eq("workspace_id", workspace.id).eq("id", noteId);
  if (error) redirect(withInsightsQuery({ error: error.message }));

  const linkedFeedbackIds = formData
    .getAll("linked_feedback_ids")
    .map((value) => String(value).trim())
    .filter(Boolean);
  await replaceCheckInLinks({ workspaceId: workspace.id, checkInNoteId: noteId, feedbackIds: linkedFeedbackIds });

  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "check_in_note",
    entityId: noteId,
    type: "check_in.updated",
    description: `Weekly check-in updated: ${payload.title}`,
  });

  redirect(withInsightsQuery({ success: "Check-in note updated" }));
}
