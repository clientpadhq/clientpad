import type { AIProvider, AIRequest, AIResponse } from "@/lib/ai/types";

class MistralProvider implements AIProvider {
  name = "mistral";

  async generate(input: AIRequest & { prompt: string; timeoutMs?: number }): Promise<AIResponse> {
    const key = process.env.MISTRAL_API_KEY;
    const model = process.env.MISTRAL_MODEL || "mistral-small-latest";
    if (!key) throw new Error("MISTRAL_API_KEY is missing");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 20000);

    try {
      const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.2,
          messages: [{ role: "user", content: input.prompt }],
        }),
        signal: controller.signal,
      });

      const json = await response.json();
      const outputText = json?.choices?.[0]?.message?.content;
      if (!response.ok || !outputText) {
        throw new Error(json?.message || "Mistral generation failed");
      }

      return {
        provider: this.name,
        model,
        promptVersion: "v1",
        outputText,
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || "mistral";
  if (provider === "mistral") return new MistralProvider();
  return new MistralProvider();
}
