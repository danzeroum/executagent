// The model-provider contract. Lives in core so both `packages/providers`
// (implementations) and skills depend on it without a circular import.
// This interface is what decouples skills from managed-vs-self-hosted execution.
import type { Tier } from "./schemas.ts";

export type { Tier };
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

/** Real, measured counts from the provider response — these drive carbon. */
export interface Usage {
  inputTokens?: number;
  outputTokens?: number;
  images?: number;
  latencyMs: number;
}

export interface GenResult {
  kind: "text" | "image";
  bytes?: Uint8Array; // for image
  text?: string; // for text/code
  contentType: string;
  model: string;
  provider: string;
  usage: Usage;
}

export interface EmbedResult {
  vector: number[];
  model: string;
  usage: Usage;
}

export interface ModelProvider {
  readonly name: string;
  supports(kind: ProviderKind): boolean;
  generate(prompt: string, params: GenParams): Promise<GenResult>;
  embed?(input: string): Promise<EmbedResult>;
}
