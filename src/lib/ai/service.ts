import { createClient } from "@/lib/supabase/server";
import { buildPrompt, PROMPT_VERSION } from "@/lib/ai/prompts";
import { getAIProvider } from "@/lib/ai/providers";
import type { AIGenerationType } from "@/lib/ai/types";
import { getWorkspaceAISettings } from "@/lib/db/ai";

export async function runAIGeneration(params: {
  workspaceId: string;
  userId: string;
  generationType: AIGenerationType;
  entityType?: string;
  entityId?: string;
  context: Record<string, unknown>;
}) {
  const supabase = await createClient();
  const settings = await getWorkspaceAISettings(params.workspaceId);

  const aiEnabled = settings?.ai_enabled ?? true;
  if (!aiEnabled) {
    const { data } = await supabase
      .from("ai_generations")
      .insert({
        workspace_id: params.workspaceId,
        created_by: params.userId,
        entity_type: params.entityType ?? null,
        entity_id: params.entityId ?? null,
        generation_type: params.generationType,
        provider: process.env.AI_PROVIDER || "mistral",
        model: process.env.MISTRAL_MODEL || "mistral-small-latest",
        prompt_version: PROMPT_VERSION,
        prompt_input_summary: { ai_enabled: false },
        status: "unavailable",
        error_message: "AI is disabled for this workspace",
      })
      .select("*")
      .single();
    return data;
  }

  const prompt = buildPrompt(params.generationType, params.context);
  const provider = getAIProvider();

  try {
    const result = await provider.generate({ generationType: params.generationType, context: params.context, prompt });
    const { data } = await supabase
      .from("ai_generations")
      .insert({
        workspace_id: params.workspaceId,
        created_by: params.userId,
        entity_type: params.entityType ?? null,
        entity_id: params.entityId ?? null,
        generation_type: params.generationType,
        provider: result.provider,
        model: result.model,
        prompt_version: result.promptVersion,
        prompt_input_summary: summarizeContext(params.context),
        output_text: result.outputText,
        structured_output_json: result.structuredOutput ?? null,
        status: "success",
      })
      .select("*")
      .single();

    return data;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown AI error";
    const { data } = await supabase
      .from("ai_generations")
      .insert({
        workspace_id: params.workspaceId,
        created_by: params.userId,
        entity_type: params.entityType ?? null,
        entity_id: params.entityId ?? null,
        generation_type: params.generationType,
        provider: process.env.AI_PROVIDER || "mistral",
        model: process.env.MISTRAL_MODEL || "mistral-small-latest",
        prompt_version: PROMPT_VERSION,
        prompt_input_summary: summarizeContext(params.context),
        status: "error",
        error_message: message,
      })
      .select("*")
      .single();
    return data;
  }
}

function summarizeContext(context: Record<string, unknown>) {
  const summary: Record<string, unknown> = {};
  Object.entries(context).forEach(([key, value]) => {
    if (typeof value === "string") summary[key] = value.slice(0, 200);
    else if (typeof value === "number" || typeof value === "boolean") summary[key] = value;
    else if (Array.isArray(value)) summary[key] = `array(${value.length})`;
    else if (value && typeof value === "object") summary[key] = "object";
    else summary[key] = null;
  });
  return summary;
}
