import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WorkspaceWhatsAppConfig } from "@/types/database";

export async function getWorkspaceWhatsAppSettings(workspaceId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_whatsapp_config")
    .select("*")
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) throw error;
  return data as WorkspaceWhatsAppConfig | null;
}

export async function upsertWorkspaceWhatsAppSettings(
  workspaceId: string,
  config: {
    phone_number_id?: string;
    business_account_id?: string;
    enabled?: boolean;
    default_template_language?: string;
    metadata?: Record<string, unknown>;
  }
) {
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data, error } = await supabase
    .from("workspace_whatsapp_config")
    .upsert(
      {
        workspace_id: workspaceId,
        phone_number_id: config.phone_number_id ?? null,
        business_account_id: config.business_account_id ?? null,
        enabled: config.enabled ?? false,
        default_template_language: config.default_template_language ?? "en_US",
        metadata: config.metadata ?? {},
        updated_at: nowIso,
      },
      { onConflict: "workspace_id" }
    )
    .select()
    .single();

  if (error) throw error;
  return data as WorkspaceWhatsAppConfig;
}