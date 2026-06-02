// Claude API text provider. Tier → model; returns real token usage from the
// response (this drives the carbon estimate). Uses fetch only (Node 22 + Deno).
import type { ModelProvider, ProviderKind, GenParams, GenResult } from "@executagent/core";

export const TIER_TEXT_MODEL: Record<GenParams["tier"], string> = {
  S: "claude-haiku-4-5-20251001",
  M: "claude-sonnet-4-6",
  L: "claude-opus-4-8",
};

const API_URL = "https://api.anthropic.com/v1/messages";

export class ClaudeTextProvider implements ModelProvider {
  readonly name = "claude";
  constructor(private readonly apiKey: string) {}

  supports(kind: ProviderKind): boolean {
    return kind === "text";
  }

  async generate(prompt: string, params: GenParams): Promise<GenResult> {
    const model = TIER_TEXT_MODEL[params.tier];
    const start = performance.now();
    const res = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: params.maxTokens ?? 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!res.ok) {
      throw new Error(`Claude API ${res.status}: ${await res.text()}`);
    }
    const data = (await res.json()) as {
      content: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = data.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
    return {
      kind: "text",
      text,
      contentType: "text/plain",
      model,
      provider: this.name,
      usage: {
        inputTokens: data.usage?.input_tokens ?? 0,
        outputTokens: data.usage?.output_tokens ?? 0,
        latencyMs: Math.round(performance.now() - start),
      },
    };
  }
}
