import { describe, it, expect } from "vitest";
import { taskCreateSchema } from "./schemas.ts";

describe("taskCreateSchema", () => {
  it("accepts a valid brief and defaults tier to M", () => {
    const r = taskCreateSchema.parse({
      prompt: "identidade visual para uma fintech brasileira",
      preferences: { template: "identidade", style: ["minimal suíço"] },
    });
    expect(r.tier).toBe("M");
    expect(r.preferences.template).toBe("identidade");
  });

  it("rejects a too-short prompt", () => {
    expect(() => taskCreateSchema.parse({ prompt: "short" })).toThrow();
  });

  it("rejects unknown top-level fields (strict)", () => {
    expect(() => taskCreateSchema.parse({ prompt: "a valid long enough prompt", evil: true })).toThrow();
  });

  it("rejects an invalid tier", () => {
    expect(() => taskCreateSchema.parse({ prompt: "a valid long enough prompt", tier: "XL" })).toThrow();
  });
});
