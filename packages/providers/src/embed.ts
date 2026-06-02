// Lexical hashing embedder for the MVP router. This is a REAL deterministic
// transform (bag-of-tokens hashed into 1536 dims, L2-normalized) — NOT a neural
// semantic embedding. It is honest about that: good enough to route among a small
// set of skill descriptors now; swap for Voyage/OpenAI embeddings at scale.
import type { ModelProvider, ProviderKind, GenParams, GenResult, EmbedResult } from "@executagent/core";

const DIMS = 1536;

function tokenHash(token: string): number {
  let h = 2166136261;
  for (let i = 0; i < token.length; i++) {
    h ^= token.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) % DIMS;
}

export function lexicalEmbed(input: string): number[] {
  const v = new Array<number>(DIMS).fill(0);
  for (const tok of input.toLowerCase().split(/[^a-zà-ú0-9]+/i)) {
    if (tok.length < 2) continue;
    const idx = tokenHash(tok);
    v[idx] = (v[idx] ?? 0) + 1;
  }
  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

export class HashingEmbeddingProvider implements ModelProvider {
  readonly name = "lexical-hashing";
  supports(kind: ProviderKind): boolean {
    return kind === "embedding";
  }
  generate(_prompt: string, _params: GenParams): Promise<GenResult> {
    return Promise.reject(new Error("HashingEmbeddingProvider only supports embed()"));
  }
  async embed(input: string): Promise<EmbedResult> {
    return { vector: lexicalEmbed(input), model: this.name, usage: { inputTokens: input.length, latencyMs: 0 } };
  }
}
