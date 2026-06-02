// Deterministic provider for CI/e2e and offline dev. Same (prompt, seed) →
// identical bytes, so tests are stable and cost nothing. For the image kind it
// emits a small deterministic SVG (renders in the browser, no PNG encoder needed).
import type { ModelProvider, ProviderKind, GenParams, GenResult, EmbedResult } from "@executagent/core";

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
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const ACCENTS = ["#a3e635", "#34d399", "#22d3ee", "#f0abfc", "#fb923c"];

function deterministicSvg(prompt: string, params: GenParams): string {
  const seed = (params.seed ?? hashString(prompt)) ^ (params.variationIndex ?? 0);
  const r = mulberry32(seed >>> 0);
  const acc = ACCENTS[Math.floor(r() * ACCENTS.length)];
  const cx = 60 + Math.floor(r() * 80);
  const cy = 40 + Math.floor(r() * 70);
  const rad = 16 + Math.floor(r() * 28);
  const bars = Array.from({ length: 4 }, (_, i) => {
    const w = 30 + Math.floor(r() * 60);
    return `<rect x="22" y="${100 + i * 10}" width="${w}" height="5" fill="#cbd5e1" opacity="${0.4 + i * 0.1}"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" preserveAspectRatio="xMidYMid slice">
  <rect width="200" height="150" fill="#101316"/>
  <circle cx="${cx}" cy="${cy}" r="${rad}" fill="${acc}"/>
  ${bars}
  <text x="22" y="24" fill="#475569" font-family="monospace" font-size="8">DEMO · v${params.variationIndex ?? 0}</text>
</svg>`;
}

export class MockProvider implements ModelProvider {
  readonly name = "mock";
  supports(_kind: ProviderKind): boolean {
    return true;
  }

  async generate(prompt: string, params: GenParams): Promise<GenResult> {
    const start = performance.now();
    if (params.template !== undefined || params.tier) {
      // image path
      const svg = deterministicSvg(prompt, params);
      return {
        kind: "image",
        bytes: new TextEncoder().encode(svg),
        contentType: "image/svg+xml",
        model: `mock-image-${params.tier}`,
        provider: this.name,
        usage: { images: 1, latencyMs: Math.round(performance.now() - start) },
      };
    }
    const text = `MOCK[${params.tier}] ${prompt}`;
    return {
      kind: "text",
      text,
      contentType: "text/plain",
      model: `mock-text-${params.tier}`,
      provider: this.name,
      usage: { inputTokens: prompt.length, outputTokens: text.length, latencyMs: Math.round(performance.now() - start) },
    };
  }

  async embed(input: string): Promise<EmbedResult> {
    const r = mulberry32(hashString(input));
    return {
      vector: Array.from({ length: 1536 }, () => r() * 2 - 1),
      model: "mock-embed",
      usage: { inputTokens: input.length, latencyMs: 0 },
    };
  }
}
