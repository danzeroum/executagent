import { describe, it, expect } from "vitest";
import { resolveProvider, configFromEnv, TIER_TEXT_MODEL } from "./registry.ts";
import { MockProvider } from "./mockProvider.ts";
import { ClaudeTextProvider } from "./claudeTextProvider.ts";

describe("registry", () => {
  it("maps text tiers to distinct Claude models S<M<L", () => {
    expect(TIER_TEXT_MODEL.S).not.toBe(TIER_TEXT_MODEL.M);
    expect(TIER_TEXT_MODEL.M).not.toBe(TIER_TEXT_MODEL.L);
    expect(TIER_TEXT_MODEL.L).toMatch(/opus/);
    expect(TIER_TEXT_MODEL.S).toMatch(/haiku/);
  });

  it("falls back to mock when no keys present", () => {
    expect(resolveProvider("text", {})).toBeInstanceOf(MockProvider);
    expect(resolveProvider("image", {})).toBeInstanceOf(MockProvider);
  });

  it("uses Claude when an anthropic key is configured", () => {
    expect(resolveProvider("text", { anthropicApiKey: "sk-test" })).toBeInstanceOf(ClaudeTextProvider);
  });

  it("forceMock overrides real keys", () => {
    expect(resolveProvider("text", { anthropicApiKey: "sk-test", forceMock: true })).toBeInstanceOf(MockProvider);
  });

  it("reads config from an env bag", () => {
    const cfg = configFromEnv({ ANTHROPIC_API_KEY: "k", PROVIDER_FORCE_MOCK: "true" });
    expect(cfg.anthropicApiKey).toBe("k");
    expect(cfg.forceMock).toBe(true);
  });
});
