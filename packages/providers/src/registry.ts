// The single place provider selection happens. Maps a provider kind + runtime
// config to a concrete ModelProvider. Secrets arrive via config (from env/Vault),
// never hardcoded. Falls back to MockProvider when keys are absent or forced.
import type { ModelProvider, ProviderKind } from "@executagent/core";
import { MockProvider } from "./mockProvider.ts";
import { ClaudeTextProvider, TIER_TEXT_MODEL } from "./claudeTextProvider.ts";
import { DeepSeekTextProvider } from "./deepseekTextProvider.ts";
import { ImageProvider } from "./imageProvider.ts";
import { HashingEmbeddingProvider } from "./embed.ts";

export { TIER_TEXT_MODEL };
export { TIER_IMAGE_PARAMS } from "./imageProvider.ts";

export interface ProviderConfig {
  anthropicApiKey?: string;
  deepseekApiKey?: string;
  imageApiKey?: string;
  imageApiUrl?: string;
  imageModel?: string;
  /** Force deterministic mock (CI/e2e/offline). */
  forceMock?: boolean;
}

export function resolveProvider(kind: ProviderKind, cfg: ProviderConfig): ModelProvider {
  if (cfg.forceMock) return new MockProvider();

  switch (kind) {
    case "text":
      if (cfg.anthropicApiKey) return new ClaudeTextProvider(cfg.anthropicApiKey);
      if (cfg.deepseekApiKey)  return new DeepSeekTextProvider(cfg.deepseekApiKey);
      return new MockProvider();
    case "image":
      return cfg.imageApiKey && cfg.imageApiUrl
        ? new ImageProvider({ apiKey: cfg.imageApiKey, apiUrl: cfg.imageApiUrl, ...(cfg.imageModel ? { model: cfg.imageModel } : {}) })
        : new MockProvider();
    case "embedding":
      // Lexical hashing embedder for MVP routing; swap for a neural embeddings API at scale.
      return new HashingEmbeddingProvider();
    default:
      return new MockProvider();
  }
}

/** Read provider config from a generic env bag (works for Deno.env / process.env). */
export function configFromEnv(env: Record<string, string | undefined>): ProviderConfig {
  const cfg: ProviderConfig = {};
  if (env.ANTHROPIC_API_KEY) cfg.anthropicApiKey = env.ANTHROPIC_API_KEY;
  if (env.DEEPSEEK_API_KEY) cfg.deepseekApiKey = env.DEEPSEEK_API_KEY;
  if (env.IMAGE_API_KEY) cfg.imageApiKey = env.IMAGE_API_KEY;
  if (env.IMAGE_API_URL) cfg.imageApiUrl = env.IMAGE_API_URL;
  if (env.IMAGE_MODEL) cfg.imageModel = env.IMAGE_MODEL;
  if (env.PROVIDER_FORCE_MOCK === "true") cfg.forceMock = true;
  return cfg;
}
