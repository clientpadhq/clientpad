"use server";

import { redirect } from "next/navigation";
import { upsertWorkspaceWhatsAppSettings } from "@/lib/db/whatsapp";
import { requireWorkspace } from "@/lib/rbac/permissions";

export async function updateWhatsAppSettingsAction(formData: FormData) {
  const context = await requireWorkspace();

  const enabled = formData.get("enabled") === "on";
  const phone_number_id = String(formData.get("phone_number_id") ?? "").trim() || null;
  const business_account_id = String(formData.get("business_account_id") ?? "").trim() || null;
  const default_template_language = String(formData.get("default_template_language") ?? "en_US").trim() || "en_US";

  try {
    await upsertWorkspaceWhatsAppSettings(context.workspace.id, {
      phone_number_id,
      business_account_id,
      enabled,
      default_template_language,
    });
  } catch (error) {
    redirect(`/settings?error=${encodeURIComponent(error instanceof Error ? error.message : "Failed to save WhatsApp settings")}`);
  }

  redirect("/settings?success=WhatsApp+settings+saved");
}