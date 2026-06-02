import { describe, it, expect } from "vitest";
import { estimateFootprint, DEFAULT_FACTORS } from "./carbon.ts";

describe("estimateFootprint", () => {
  it("computes energy/co2 from token counts against documented factors", () => {
    // 2000 tokens → 2 * kwhPer1kTokens
    const r = estimateFootprint({ inputTokens: 1500, outputTokens: 500 });
    expect(r.energy_kwh).toBeCloseTo(2 * DEFAULT_FACTORS.kwhPer1kTokens, 9);
    expect(r.co2_g).toBeCloseTo(r.energy_kwh * DEFAULT_FACTORS.gridIntensityGPerKwh, 6);
  });

  it("adds per-image energy", () => {
    const r = estimateFootprint({ images: 4 });
    expect(r.energy_kwh).toBeCloseTo(4 * DEFAULT_FACTORS.kwhPerImage, 9);
  });

  it("always labels the result as an estimate with its basis (honesty rule)", () => {
    const r = estimateFootprint({ images: 1 });
    expect(r.method).toBe("model-factor-estimate");
    expect(r.basis.factors).toEqual(DEFAULT_FACTORS);
    expect(r.basis.note).toMatch(/not a metered measurement/i);
  });

  it("is zero for empty usage", () => {
    const r = estimateFootprint({});
    expect(r.energy_kwh).toBe(0);
    expect(r.co2_g).toBe(0);
  });
});
