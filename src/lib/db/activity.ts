import { createClient } from "@/lib/supabase/server";
import type { ActivityType } from "@/types/database";

export async function logActivity(params: {
  workspaceId: string;
  actorUserId?: string | null;
  entityType:
    | "workspace"
    | "lead"
    | "client"
    | "deal"
    | "quote"
    | "invoice"
    | "payment"
    | "job"
    | "task"
    | "reminder"
    | "pipeline_stage"
    | "pilot_profile"
    | "pilot_feedback"
    | "check_in_note";
  entityId: string;
  type: ActivityType;
  description: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = await createClient();

  const { error } = await supabase.from("activities").insert({
    workspace_id: params.workspaceId,
    actor_user_id: params.actorUserId ?? null,
    entity_type: params.entityType,
    entity_id: params.entityId,
    activity_type: params.type,
    description: params.description,
    metadata: params.metadata ?? null,
  });

  if (error) throw error;
}
