import { describe, it, expect } from "vitest";
import { MockProvider } from "./mockProvider.ts";
import { SelfHostedProvider } from "./selfHostedStub.ts";
import { lexicalEmbed } from "./embed.ts";

describe("MockProvider", () => {
  const p = new MockProvider();

  it("is deterministic for the same prompt+seed+variation", async () => {
    const a = await p.generate("fintech brand", { tier: "M", template: "identidade", seed: 42, variationIndex: 1 });
    const b = await p.generate("fintech brand", { tier: "M", template: "identidade", seed: 42, variationIndex: 1 });
    expect(a.bytes).toEqual(b.bytes);
    expect(a.kind).toBe("image");
    expect(a.contentType).toBe("image/svg+xml");
  });

  it("produces different bytes for different variations", async () => {
    const v0 = await p.generate("brand", { tier: "M", template: "identidade", seed: 7, variationIndex: 0 });
    const v1 = await p.generate("brand", { tier: "M", template: "identidade", seed: 7, variationIndex: 1 });
    expect(v0.bytes).not.toEqual(v1.bytes);
  });

  it("reports image usage", async () => {
    const r = await p.generate("brand", { tier: "S", template: "icones" });
    expect(r.usage.images).toBe(1);
  });
});

describe("SelfHostedProvider", () => {
  it("rejects with NotImplemented (documented swap point)", async () => {
    await expect(new SelfHostedProvider().generate("x", { tier: "M" })).rejects.toThrow(/NotImplemented/);
  });
});

describe("lexicalEmbed", () => {
  it("returns a 1536-dim deterministic unit-ish vector", () => {
    const a = lexicalEmbed("identidade visual fintech");
    const b = lexicalEmbed("identidade visual fintech");
    expect(a).toHaveLength(1536);
    expect(a).toEqual(b);
    const norm = Math.sqrt(a.reduce((s, x) => s + x * x, 0));
    expect(norm).toBeCloseTo(1, 5);
  });
});
