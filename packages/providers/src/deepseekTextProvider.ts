import type { ModelProvider, ProviderKind, GenParams, GenResult } from "@executagent/core";

export const TIER_DEEPSEEK_MODEL: Record<GenParams["tier"], string> = {
  S: "deepseek-chat",
  M: "deepseek-chat",
  L: "deepseek-chat",
};

const API_URL = "https://api.deepseek.com/v1/chat/completions";

export class DeepSeekTextProvider implements ModelProvider {
  readonly name = "deepseek";
  constructor(private readonly apiKey: string) {}

  supports(kind: ProviderKind): boolean {
    return kind === "text";
  }

  async generate(prompt: string, params: GenParams): Promise<GenResult> {
    const model = TIER_DEEPSEEK_MODEL[params.tier];
    const start = performance.now();
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: params.maxTokens ?? 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      throw new Error(`DeepSeek API ${res.status}: ${await res.text()}`);
    }
    const data = await res.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = data.choices[0]?.message?.content ?? "";
    return {
      kind: "text",
      text,
      contentType: "text/plain",
      model,
      provider: this.name,
      usage: {
        inputTokens: data.usage?.prompt_tokens ?? 0,
        outputTokens: data.usage?.completion_tokens ?? 0,
        latencyMs: Math.round(performance.now() - start),
      },
    };
  }
}
