"use server";

import { randomUUID } from "crypto";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { canAssignRole, requireWorkspace } from "@/lib/rbac/permissions";
import { logActivity } from "@/lib/db/activity";
import { applyPresetToWorkspace } from "@/lib/onboarding/apply-preset";
import { getWorkspacePresetById } from "@/lib/onboarding/presets";
import { setActiveWorkspaceForUser } from "@/lib/db/workspace";
import type { Role } from "@/types/database";

function parseRole(value: FormDataEntryValue | null): Role {
  const role = String(value ?? "staff").trim() as Role;
  if (role !== "owner" && role !== "admin" && role !== "staff") {
    return "staff";
  }
  return role;
}

type OnboardingStep = "business_profile" | "branding_payment" | "preset_selection" | "data_import";

function parseOnboardingStep(value: FormDataEntryValue | null): OnboardingStep {
  const step = String(value ?? "").trim();
  if (step === "business_profile" || step === "branding_payment" || step === "preset_selection" || step === "data_import") {
    return step;
  }
  return "business_profile";
}

async function ensureOnboardingState(workspaceId: string) {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("workspace_onboarding_state").upsert(
    {
      workspace_id: workspaceId,
      current_step: "business_profile",
      started_at: now,
      updated_at: now,
    },
    { onConflict: "workspace_id" },
  );

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }
}

export async function createWorkspaceAction(formData: FormData) {
  const user = await requireUser();
  const supabase = await createClient();

  const payload = {
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim() || null,
    business_type: String(formData.get("business_type") ?? "").trim() || null,
    default_currency: "NGN",
    created_by: user.id,
  };

  const { data: existing } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existing) redirect("/dashboard");

  const { data: workspace, error } = await supabase.from("workspaces").insert(payload).select("id").single();

  if (error || !workspace) {
    redirect(`/onboarding?error=${encodeURIComponent(error?.message ?? "Could not create workspace")}`);
  }

  const { error: memberError } = await supabase.from("workspace_members").insert({
    workspace_id: workspace.id,
    user_id: user.id,
    role: "owner",
  });

  if (memberError) {
    redirect(`/onboarding?error=${encodeURIComponent(memberError.message)}`);
  }

  const now = new Date().toISOString();
  const { error: onboardingStateError } = await supabase.from("workspace_onboarding_state").insert({
    workspace_id: workspace.id,
    current_step: "business_profile",
    started_at: now,
  });
  if (onboardingStateError) {
    redirect(`/onboarding?error=${encodeURIComponent(onboardingStateError.message)}`);
  }

  await setActiveWorkspaceForUser(user.id, workspace.id);

  const preset = getWorkspacePresetById(String(formData.get("preset_id") ?? "").trim());
  if (preset) {
    await applyPresetToWorkspace({
      supabase,
      workspaceId: workspace.id,
      actorUserId: user.id,
      preset,
      source: "onboarding",
    });
  }

  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "workspace",
    entityId: workspace.id,
    type: "workspace.created",
    description: "Workspace created",
  });

  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "workspace",
    entityId: workspace.id,
    type: "onboarding.started",
    description: "Workspace onboarding started",
  });

  redirect("/onboarding");
}

export async function saveOnboardingStepAction(formData: FormData) {
  const { workspace, user, role } = await requireWorkspace("admin");
  if (role !== "owner" && role !== "admin") redirect("/dashboard");

  await ensureOnboardingState(workspace.id);

  const step = parseOnboardingStep(formData.get("step"));
  const now = new Date().toISOString();
  const supabase = await createClient();

  const businessType = String(formData.get("business_type") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const defaultCurrency = String(formData.get("default_currency") ?? "").trim();
  const selectedPreset = String(formData.get("selected_preset") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const defaultInvoiceTerms = String(formData.get("default_invoice_terms") ?? "").trim();

  if (step === "business_profile") {
    const name = String(formData.get("name") ?? "").trim();
    if (!name) redirect("/onboarding?error=Business name is required");

    const { error: workspaceError } = await supabase
      .from("workspaces")
      .update({
        name,
        phone: phone || null,
        business_type: businessType || null,
        updated_at: now,
      })
      .eq("id", workspace.id);
    if (workspaceError) redirect(`/onboarding?error=${encodeURIComponent(workspaceError.message)}`);

    const { error: stateError } = await supabase
      .from("workspace_onboarding_state")
      .update({
        current_step: "branding_payment",
        business_profile_completed: true,
        started_at: now,
      })
      .eq("workspace_id", workspace.id);
    if (stateError) redirect(`/onboarding?error=${encodeURIComponent(stateError.message)}`);
  }

  if (step === "branding_payment") {
    const { error: workspaceError } = await supabase
      .from("workspaces")
      .update({
        phone: phone || workspace.phone || null,
        business_type: businessType || workspace.business_type || null,
        default_currency: defaultCurrency || workspace.default_currency || "NGN",
        updated_at: now,
      })
      .eq("id", workspace.id);
    if (workspaceError) redirect(`/onboarding?error=${encodeURIComponent(workspaceError.message)}`);

    const { error: brandingError } = await supabase.from("workspace_branding_settings").upsert({
      workspace_id: workspace.id,
      email: email || null,
      address: address || null,
      default_invoice_terms: defaultInvoiceTerms || null,
      updated_at: now,
    });
    if (brandingError) redirect(`/onboarding?error=${encodeURIComponent(brandingError.message)}`);

    const { error: stateError } = await supabase
      .from("workspace_onboarding_state")
      .update({
        current_step: "preset_selection",
        branding_payment_completed: true,
      })
      .eq("workspace_id", workspace.id);
    if (stateError) redirect(`/onboarding?error=${encodeURIComponent(stateError.message)}`);
  }

  if (step === "preset_selection") {
    if (selectedPreset) {
      const preset = getWorkspacePresetById(selectedPreset);
      if (preset) {
        await applyPresetToWorkspace({
          supabase,
          workspaceId: workspace.id,
          actorUserId: user.id,
          preset,
          source: "onboarding",
        });
      }
    }

    const { error: stateError } = await supabase
      .from("workspace_onboarding_state")
      .update({
        current_step: "data_import",
        preset_selected: Boolean(selectedPreset),
        selected_preset: selectedPreset || null,
      })
      .eq("workspace_id", workspace.id);
    if (stateError) redirect(`/onboarding?error=${encodeURIComponent(stateError.message)}`);
  }

  if (step === "data_import") {
    const importCompleted = String(formData.get("data_import_completed") ?? "false") === "true";
    const { error: stateError } = await supabase
      .from("workspace_onboarding_state")
      .update({
        current_step: "completed",
        data_import_completed: importCompleted,
        completed_at: now,
      })
      .eq("workspace_id", workspace.id);
    if (stateError) redirect(`/onboarding?error=${encodeURIComponent(stateError.message)}`);

    await logActivity({
      workspaceId: workspace.id,
      actorUserId: user.id,
      entityType: "workspace",
      entityId: workspace.id,
      type: "onboarding.completed",
      description: "Workspace onboarding completed",
    });
  }

  redirect("/onboarding");
}

export async function skipOnboardingStepAction(formData: FormData) {
  const { workspace, role } = await requireWorkspace("admin");
  if (role !== "owner" && role !== "admin") redirect("/dashboard");

  await ensureOnboardingState(workspace.id);
  const step = parseOnboardingStep(formData.get("step"));
  const now = new Date().toISOString();
  const supabase = await createClient();

  if (step === "data_import") {
    const { error } = await supabase
      .from("workspace_onboarding_state")
      .update({
        current_step: "completed",
        data_import_completed: false,
        completed_at: now,
        last_skipped_at: now,
      })
      .eq("workspace_id", workspace.id);
    if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  } else {
    const { error } = await supabase
      .from("workspace_onboarding_state")
      .update({ last_skipped_at: now })
      .eq("workspace_id", workspace.id);
    if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/onboarding");
}

export async function resumeOnboardingLaterAction() {
  const { workspace, role } = await requireWorkspace("admin");
  if (role !== "owner" && role !== "admin") redirect("/dashboard");

  await ensureOnboardingState(workspace.id);
  redirect("/dashboard");
}

export async function applyWorkspacePresetAction(formData: FormData) {
  const { workspace, user, role } = await requireWorkspace("staff");
  if (role === "staff") throw new Error("Staff cannot apply workspace presets.");
  const supabase = await createClient();

  const preset = getWorkspacePresetById(String(formData.get("preset_id") ?? "").trim());
  if (!preset) redirect("/settings?error=Select a valid preset");

  await applyPresetToWorkspace({
    supabase,
    workspaceId: workspace.id,
    actorUserId: user.id,
    preset,
    source: "settings",
  });

  redirect("/settings?success=Preset applied");
}

export async function updateWorkspaceAction(formData: FormData) {
  const { workspace } = await requireWorkspace("admin");
  const supabase = await createClient();

  const { error } = await supabase
    .from("workspaces")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      phone: String(formData.get("phone") ?? "").trim() || null,
      business_type: String(formData.get("business_type") ?? "").trim() || null,
      default_currency: "NGN",
      updated_at: new Date().toISOString(),
    })
    .eq("id", workspace.id);

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/settings?success=Workspace updated");
}

export async function updateBrandingSettingsAction(formData: FormData) {
  const { workspace, user, role } = await requireWorkspace("staff");
  if (role === "staff") throw new Error("Staff cannot update branding settings.");

  const supabase = await createClient();
  const payload = {
    workspace_id: workspace.id,
    email: String(formData.get("email") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    website_or_social: String(formData.get("website_or_social") ?? "").trim() || null,
    logo_url: String(formData.get("logo_url") ?? "").trim() || null,
    default_footer_text: String(formData.get("default_footer_text") ?? "").trim() || null,
    default_quote_terms: String(formData.get("default_quote_terms") ?? "").trim() || null,
    default_invoice_terms: String(formData.get("default_invoice_terms") ?? "").trim() || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("workspace_branding_settings").upsert(payload);
  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);

  await logActivity({
    workspaceId: workspace.id,
    actorUserId: user.id,
    entityType: "workspace",
    entityId: workspace.id,
    type: "branding.updated",
    description: "Workspace branding settings updated",
  });

  redirect("/settings?success=Branding settings updated");
}

export async function inviteMemberAction(formData: FormData) {
  const { workspace, user, role } = await requireWorkspace("admin");
  const supabase = await createClient();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const inviteRole = parseRole(formData.get("role"));

  if (!email) redirect("/settings?error=Email is required");
  if (!canAssignRole(role, inviteRole)) {
    redirect("/settings?error=Only owners can invite users as owner");
  }

  const { error } = await supabase.from("workspace_invites").insert({
    workspace_id: workspace.id,
    email,
    role: inviteRole,
    status: "pending",
    invited_by: user.id,
    token: randomUUID(),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/settings?success=Invite created");
}

export async function revokeInviteAction(formData: FormData) {
  const { workspace, role } = await requireWorkspace("admin");
  const supabase = await createClient();

  const inviteId = String(formData.get("invite_id") ?? "").trim();
  if (!inviteId) redirect("/settings?error=Invite is required");

  const { data: invite, error: inviteError } = await supabase
    .from("workspace_invites")
    .select("id, role, status")
    .eq("workspace_id", workspace.id)
    .eq("id", inviteId)
    .maybeSingle();

  if (inviteError) redirect(`/settings?error=${encodeURIComponent(inviteError.message)}`);
  if (!invite) redirect("/settings?error=Invite not found");
  if (invite.role === "owner" && role !== "owner") {
    redirect("/settings?error=Only owners can revoke owner invites");
  }

  const { error } = await supabase
    .from("workspace_invites")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("workspace_id", workspace.id)
    .eq("id", inviteId)
    .eq("status", "pending");

  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);

  redirect("/settings?success=Invite revoked");
}

export async function updateMemberRoleAction(formData: FormData) {
  const { workspace, user, role } = await requireWorkspace("admin");
  const supabase = await createClient();

  const memberUserId = String(formData.get("member_user_id") ?? "").trim();
  const nextRole = parseRole(formData.get("role"));

  if (!memberUserId) redirect("/settings?error=Member is required");
  if (!canAssignRole(role, nextRole)) {
    redirect("/settings?error=Only owners can promote members to owner");
  }

  const { data: member, error: memberError } = await supabase
    .from("workspace_members")
    .select("user_id, role")
    .eq("workspace_id", workspace.id)
    .eq("user_id", memberUserId)
    .maybeSingle();

  if (memberError) redirect(`/settings?error=${encodeURIComponent(memberError.message)}`);
  if (!member) redirect("/settings?error=Member not found");

  if (role === "admin" && member.role === "owner") {
    redirect("/settings?error=Admins cannot update owner roles");
  }

  if (member.role === "owner" && nextRole !== "owner") {
    if (role !== "owner") redirect("/settings?error=Only owners can demote an owner");
    if (member.user_id === user.id) {
      redirect("/settings?error=Use transfer ownership to hand over owner access");
    }

    const { count, error: ownerCountError } = await supabase
      .from("workspace_members")
      .select("user_id", { count: "exact", head: true })
      .eq("workspace_id", workspace.id)
      .eq("role", "owner");

    if (ownerCountError) redirect(`/settings?error=${encodeURIComponent(ownerCountError.message)}`);
    if ((count ?? 0) <= 1) {
      redirect("/settings?error=Workspace must keep at least one owner");
    }
  }

  const { error } = await supabase
    .from("workspace_members")
    .update({ role: nextRole })
    .eq("workspace_id", workspace.id)
    .eq("user_id", memberUserId);

  if (error) redirect(`/settings?error=${encodeURIComponent(error.message)}`);

  redirect("/settings?success=Member role updated");
}

export async function transferOwnershipAction(formData: FormData) {
  const { workspace, user } = await requireWorkspace("owner");
  const supabase = await createClient();

  const newOwnerUserId = String(formData.get("new_owner_user_id") ?? "").trim();
  if (!newOwnerUserId) redirect("/settings?error=Select a member to transfer ownership");
  if (newOwnerUserId === user.id) redirect("/settings?error=You are already the owner");

  const { data: member, error: memberError } = await supabase
    .from("workspace_members")
    .select("user_id, role")
    .eq("workspace_id", workspace.id)
    .eq("user_id", newOwnerUserId)
    .maybeSingle();

  if (memberError) redirect(`/settings?error=${encodeURIComponent(memberError.message)}`);
  if (!member) redirect("/settings?error=Selected member is not in this workspace");

  const { error: promoteError } = await supabase
    .from("workspace_members")
    .update({ role: "owner" })
    .eq("workspace_id", workspace.id)
    .eq("user_id", newOwnerUserId);
  if (promoteError) redirect(`/settings?error=${encodeURIComponent(promoteError.message)}`);

  const { error: demoteError } = await supabase
    .from("workspace_members")
    .update({ role: "admin" })
    .eq("workspace_id", workspace.id)
    .eq("user_id", user.id);

  if (demoteError) redirect(`/settings?error=${encodeURIComponent(demoteError.message)}`);

  redirect("/settings?success=Ownership transferred");
}

export async function switchActiveWorkspaceAction(formData: FormData) {
  const user = await requireUser();
  const workspaceId = String(formData.get("workspace_id") ?? "").trim();
  const redirectTo = String(formData.get("redirect_to") ?? "/dashboard").trim() || "/dashboard";
  if (!workspaceId) redirect(`/dashboard?error=${encodeURIComponent("Workspace is required")}`);
  await setActiveWorkspaceForUser(user.id, workspaceId);
  redirect(redirectTo.startsWith("/") ? redirectTo : "/dashboard");
}
