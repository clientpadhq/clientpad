import type { AIProvider, AIRequest, AIResponse } from "@/lib/ai/types";

class MistralProvider implements AIProvider {
  name = "mistral";

  async generate(input: AIRequest & { prompt: string; timeoutMs?: number }): Promise<AIResponse> {
    const key = process.env.MISTRAL_API_KEY;
    const model = process.env.MISTRAL_MODEL || "mistral-small-latest";
    if (!key) throw new Error("AI unavailable: MISTRAL_API_KEY is missing");

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

      const json = await response.json().catch(() => ({}));
      const outputText = json?.choices?.[0]?.message?.content;
      if (!response.ok || !outputText) {
        const reason = json?.message || json?.error || `HTTP ${response.status}`;
        throw new Error(`Mistral generation failed: ${reason}`);
      }

      return {
        provider: this.name,
        model,
        promptVersion: "v1",
        outputText,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("AI request timed out. Please retry with shorter context.");
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function getAIProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER || "mistral";
  if (provider === "mistral") return new MistralProvider();
  throw new Error(`AI provider '${provider}' is not supported. Set AI_PROVIDER=mistral.`);
}
