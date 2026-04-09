export type AIGenerationType =
  | "lead_summary"
  | "follow_up_draft"
  | "quote_text_draft"
  | "payment_reminder_draft"
  | "weekly_digest"
  | "next_step_suggestion";

export type AIRequest = {
  generationType: AIGenerationType;
  context: Record<string, unknown>;
  tone?: string;
};

export type AIResponse = {
  provider: string;
  model: string;
  promptVersion: string;
  outputText: string;
  structuredOutput?: Record<string, unknown>;
};

export interface AIProvider {
  name: string;
  generate(input: AIRequest & { prompt: string; timeoutMs?: number }): Promise<AIResponse>;
}
