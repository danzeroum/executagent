// @executagent/providers — model-provider abstraction.
export const PROVIDERS_VERSION = "0.1.0";

export * from "./types.ts";
export * from "./registry.ts";
export { MockProvider } from "./mockProvider.ts";
export { ClaudeTextProvider, TIER_TEXT_MODEL } from "./claudeTextProvider.ts";
export { DeepSeekTextProvider, TIER_DEEPSEEK_MODEL } from "./deepseekTextProvider.ts";
export { ImageProvider, TIER_IMAGE_PARAMS } from "./imageProvider.ts";
export { SelfHostedProvider } from "./selfHostedStub.ts";
export { HashingEmbeddingProvider, lexicalEmbed } from "./embed.ts";
