"use server";

import { redirect } from "next/navigation";
import { requireWorkspace } from "@/lib/rbac/permissions";
import { runAIGeneration } from "@/lib/ai/service";
import { createClient } from "@/lib/supabase/server";
import type { AIGenerationType } from "@/lib/ai/types";

export async function generateAIDraftAction(formData: FormData) {
  const { workspace, user } = await requireWorkspace("staff");

  const generationType = String(formData.get("generation_type") ?? "") as AIGenerationType;
  const entityType = String(formData.get("entity_type") ?? "").trim() || undefined;
  const entityId = String(formData.get("entity_id") ?? "").trim() || undefined;
  const returnPath = String(formData.get("return_path") ?? "/dashboard");

  const contextInput = String(formData.get("context_json") ?? "{}");
  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(contextInput);
  } catch {
    parsed = { raw: contextInput };
  }

  const generation = await runAIGeneration({
    workspaceId: workspace.id,
    userId: user.id,
    generationType,
    entityType,
    entityId,
    context: parsed,
  });

  const status = generation?.status ? `&ai_status=${encodeURIComponent(generation.status)}` : "";
  const message = generation?.error_message ? `&ai_message=${encodeURIComponent(generation.error_message)}` : "";
  redirect(`${returnPath}?ai_refreshed=1${status}${message}`);
}

export async function generateWeeklyDigestAction() {
  const { workspace, user } = await requireWorkspace("staff");
  const supabase = await createClient();

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [leads, deals, invoices, jobs] = await Promise.all([
    supabase.from("leads").select("id").eq("workspace_id", workspace.id).gte("created_at", sevenDaysAgo),
    supabase.from("deals").select("id,updated_at,stage:pipeline_stages(name)").eq("workspace_id", workspace.id),
    supabase.from("invoices").select("id,status,balance_amount,due_date").eq("workspace_id", workspace.id),
    supabase.from("jobs").select("id,status,due_date").eq("workspace_id", workspace.id),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const stalledDeals = (deals.data ?? []).filter((d: { updated_at: string }) => new Date(d.updated_at) < new Date(Date.now() - 10 * 24 * 60 * 60 * 1000));
  const overdueInvoices = (invoices.data ?? []).filter((i: { due_date: string | null; balance_amount: number | null; status: string }) => i.due_date && i.due_date < today && Number(i.balance_amount || 0) > 0 && i.status !== "paid" && i.status !== "cancelled");
  const pendingJobs = (jobs.data ?? []).filter((j: { status: string }) => !["completed", "cancelled"].includes(j.status));

  const generation = await runAIGeneration({
    workspaceId: workspace.id,
    userId: user.id,
    generationType: "weekly_digest",
    context: {
      new_leads_count: leads.data?.length ?? 0,
      stalled_deals_count: stalledDeals.length,
      overdue_invoices_count: overdueInvoices.length,
      pending_jobs_count: pendingJobs.length,
      bottlenecks: {
        stalled_deals: stalledDeals.length,
        overdue_invoices: overdueInvoices.length,
        pending_jobs: pendingJobs.length,
      },
    },
  });

  const status = generation?.status ? `&ai_status=${encodeURIComponent(generation.status)}` : "";
  const message = generation?.error_message ? `&ai_message=${encodeURIComponent(generation.error_message)}` : "";
  redirect(`/dashboard?ai_refreshed=1${status}${message}`);
}

export async function updateAISettingsAction(formData: FormData) {
  const { workspace, role } = await requireWorkspace("staff");
  if (role === "staff") throw new Error("Staff cannot change AI settings");

  const supabase = await createClient();
  const payload = {
    workspace_id: workspace.id,
    ai_enabled: formData.get("ai_enabled") === "on",
    default_provider: String(formData.get("default_provider") ?? "mistral"),
    default_model: String(formData.get("default_model") ?? "").trim() || null,
    monthly_cap: Number(formData.get("monthly_cap") ?? 0) || null,
  };

  const { error } = await supabase.from("workspace_ai_settings").upsert(payload);
  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  redirect("/settings?success=AI settings updated");
}
