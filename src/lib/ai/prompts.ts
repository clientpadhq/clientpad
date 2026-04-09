import type { AIGenerationType } from "@/lib/ai/types";

export const PROMPT_VERSION = "v1";

const baseGuardrail = `You are ClientPad AI Copilot for Nigerian service businesses.\n- Use only provided context.\n- Do not invent missing facts.\n- Be concise and practical.\n- Output draft/suggestion only. Never imply actions are automatically sent.`;

export function buildPrompt(type: AIGenerationType, context: Record<string, unknown>) {
  const c = JSON.stringify(context, null, 2);

  switch (type) {
    case "lead_summary":
      return `${baseGuardrail}\nReturn JSON with keys: customer_need, service_interest, urgency, budget_signals, next_action, risks_or_ambiguity.\nContext:\n${c}`;
    case "follow_up_draft":
      return `${baseGuardrail}\nWrite a concise WhatsApp-ready follow-up draft. Keep polite and actionable.\nContext:\n${c}`;
    case "quote_text_draft":
      return `${baseGuardrail}\nDraft professional quote text for service description/scope/terms wording only.\nContext:\n${c}`;
    case "payment_reminder_draft":
      return `${baseGuardrail}\nDraft a polite but firm payment reminder message for overdue/unpaid invoice.\nContext:\n${c}`;
    case "weekly_digest":
      return `${baseGuardrail}\nCreate a weekly operational digest with sections: highlights, bottlenecks, priority_actions.\nContext:\n${c}`;
    case "next_step_suggestion":
      return `${baseGuardrail}\nProvide 3 next-step suggestions as short bullets for this record.\nContext:\n${c}`;
  }
}
