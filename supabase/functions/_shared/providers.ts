// Deno runtime mirror of @executagent/providers (logic unit-tested there).
// Self-contained (no bare specifiers) so it deploys with the edge functions.
// The Node package remains canonical/tested; this mirror exists only because
// edge functions run in Deno. Unify via JSR publish at scale (docs/02).

export type Tier = "S" | "M" | "L";
export type ProviderKind = "text" | "image" | "embedding";

export interface GenParams {
  tier: Tier;
  variationIndex?: number;
  seed?: number;
  style?: string[];
  mood?: string[];
  template?: string;
  maxTokens?: number;
}
export interface Usage {
  inputTokens?: number;
  outputTokens?: number;
  images?: number;
  latencyMs: number;
}
export interface GenResult {
  kind: "text" | "image";
  bytes?: Uint8Array;
  text?: string;
  contentType: string;
  model: string;
  provider: string;
  usage: Usage;
}
export interface EmbedResult { vector: number[]; model: string; usage: Usage; }
export interface ModelProvider {
  readonly name: string;
  supports(kind: ProviderKind): boolean;
  generate(prompt: string, params: GenParams): Promise<GenResult>;
  embed?(input: string): Promise<EmbedResult>;
}

export const TIER_TEXT_MODEL: Record<Tier, string> = {
  S: "claude-haiku-4-5-20251001",
  M: "claude-sonnet-4-6",
  L: "claude-opus-4-8",
};
export const TIER_IMAGE_PARAMS: Record<Tier, { size: number; steps: number }> = {
  S: { size: 512, steps: 20 },
  M: { size: 768, steps: 30 },
  L: { size: 1024, steps: 45 },
};

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
const ACCENTS = ["#a3e635", "#34d399", "#22d3ee", "#f0abfc", "#fb923c"];

export class MockProvider implements ModelProvider {
  readonly name = "mock";
  supports(): boolean { return true; }
  async generate(prompt: string, params: GenParams): Promise<GenResult> {
    const start = performance.now();
    const seed = (params.seed ?? hashString(prompt)) ^ (params.variationIndex ?? 0);
    const r = mulberry32(seed >>> 0);
    const acc = ACCENTS[Math.floor(r() * ACCENTS.length)];
    const cx = 60 + Math.floor(r() * 80), cy = 40 + Math.floor(r() * 70), rad = 16 + Math.floor(r() * 28);
    const bars = Array.from({ length: 4 }, (_, i) =>
      `<rect x="22" y="${100 + i * 10}" width="${30 + Math.floor(r() * 60)}" height="5" fill="#cbd5e1" opacity="${0.4 + i * 0.1}"/>`).join("");
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice"><rect width="200" height="150" fill="#101316"/><circle cx="${cx}" cy="${cy}" r="${rad}" fill="${acc}"/>${bars}<text x="22" y="24" fill="#475569" font-family="monospace" font-size="8">DEMO · v${params.variationIndex ?? 0}</text></svg>`;
    return {
      kind: "image",
      bytes: new TextEncoder().encode(svg),
      contentType: "image/svg+xml",
      model: `mock-image-${params.tier}`,
      provider: this.name,
      usage: { images: 1, latencyMs: Math.round(performance.now() - start) },
    };
  }
  async embed(input: string): Promise<EmbedResult> {
    const r = mulberry32(hashString(input));
    return { vector: Array.from({ length: 1536 }, () => r() * 2 - 1), model: "mock-embed", usage: { inputTokens: input.length, latencyMs: 0 } };
  }
}

export class ClaudeTextProvider implements ModelProvider {
  readonly name = "claude";
  constructor(private apiKey: string) {}
  supports(kind: ProviderKind): boolean { return kind === "text"; }
  async generate(prompt: string, params: GenParams): Promise<GenResult> {
    const model = TIER_TEXT_MODEL[params.tier];
    const start = performance.now();
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": this.apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: params.maxTokens ?? 1024, messages: [{ role: "user", content: prompt }] }),
    });
    if (!res.ok) throw new Error(`Claude API ${res.status}: ${await res.text()}`);
    const data = await res.json() as { content: Array<{ type: string; text?: string }>; usage?: { input_tokens?: number; output_tokens?: number } };
    const text = data.content.filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
    return { kind: "text", text, contentType: "text/plain", model, provider: this.name, usage: { inputTokens: data.usage?.input_tokens ?? 0, outputTokens: data.usage?.output_tokens ?? 0, latencyMs: Math.round(performance.now() - start) } };
  }
}

export class ImageProvider implements ModelProvider {
  readonly name = "image";
  constructor(private cfg: { apiKey: string; apiUrl: string; model?: string }) {}
  supports(kind: ProviderKind): boolean { return kind === "image"; }
  async generate(prompt: string, params: GenParams): Promise<GenResult> {
    const tp = TIER_IMAGE_PARAMS[params.tier];
    const start = performance.now();
    const res = await fetch(this.cfg.apiUrl, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.cfg.apiKey}` },
      body: JSON.stringify({ model: this.cfg.model ?? "image-default", prompt, width: tp.size, height: tp.size, steps: tp.steps, seed: params.seed }),
    });
    if (!res.ok) throw new Error(`Image API ${res.status}: ${await res.text()}`);
    const ct = res.headers.get("content-type") ?? "";
    let bytes: Uint8Array; let contentType = "image/png";
    if (ct.includes("application/json")) {
      const data = await res.json() as { image_base64?: string; content_type?: string };
      if (!data.image_base64) throw new Error("Image API returned no image_base64");
      const bin = atob(data.image_base64); bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      if (data.content_type) contentType = data.content_type;
    } else { bytes = new Uint8Array(await res.arrayBuffer()); if (ct) contentType = ct; }
    return { kind: "image", bytes, contentType, model: this.cfg.model ?? "image-default", provider: this.name, usage: { images: 1, latencyMs: Math.round(performance.now() - start) } };
  }
}

const DIMS = 1536;
export function lexicalEmbed(input: string): number[] {
  const v = new Array<number>(DIMS).fill(0);
  for (const tok of input.toLowerCase().split(/[^a-zà-ú0-9]+/i)) {
    if (tok.length < 2) continue;
    let h = 2166136261;
    for (let i = 0; i < tok.length; i++) { h ^= tok.charCodeAt(i); h = Math.imul(h, 16777619); }
    const idx = (h >>> 0) % DIMS;
    v[idx] = (v[idx] ?? 0) + 1;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}
export class HashingEmbeddingProvider implements ModelProvider {
  readonly name = "lexical-hashing";
  supports(kind: ProviderKind): boolean { return kind === "embedding"; }
  generate(): Promise<GenResult> { return Promise.reject(new Error("embed only")); }
  async embed(input: string): Promise<EmbedResult> {
    return { vector: lexicalEmbed(input), model: this.name, usage: { inputTokens: input.length, latencyMs: 0 } };
  }
}

export function resolveProvider(kind: ProviderKind, env: Record<string, string | undefined>): ModelProvider {
  if (env.PROVIDER_FORCE_MOCK === "true") return new MockProvider();
  switch (kind) {
    case "text":
      return env.ANTHROPIC_API_KEY ? new ClaudeTextProvider(env.ANTHROPIC_API_KEY) : new MockProvider();
    case "image":
      return env.IMAGE_API_KEY && env.IMAGE_API_URL
        ? new ImageProvider({ apiKey: env.IMAGE_API_KEY, apiUrl: env.IMAGE_API_URL, ...(env.IMAGE_MODEL ? { model: env.IMAGE_MODEL } : {}) })
        : new MockProvider();
    case "embedding":
      return new HashingEmbeddingProvider();
    default:
      return new MockProvider();
  }
}
