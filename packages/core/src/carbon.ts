// Energy / carbon ESTIMATE derived from REAL provider usage counts.
// This is the honest-metrics rule in code: the output is always labeled an
// estimate and carries the factors used in `basis`. We never emit a measured-
// looking kWh that was guessed.
//
// Factors are order-of-magnitude public estimates and are meant to be tuned per
// model/region. They are intentionally explicit and cited in `basis`, not hidden.

export interface UsageCounts {
  inputTokens?: number;
  outputTokens?: number;
  images?: number;
}

export interface CarbonFactors {
  /** kWh per 1k tokens (input+output) for text inference. */
  kwhPer1kTokens: number;
  /** kWh per generated image. */
  kwhPerImage: number;
  /** grid carbon intensity, gCO2e per kWh. */
  gridIntensityGPerKwh: number;
}

export const DEFAULT_FACTORS: CarbonFactors = {
  // Public order-of-magnitude estimates; override per model/provider/region.
  kwhPer1kTokens: 0.0003,
  kwhPerImage: 0.002,
  gridIntensityGPerKwh: 475, // global avg ~475 gCO2e/kWh
};

export interface EnvironmentalReport {
  energy_kwh: number;
  co2_g: number;
  method: "model-factor-estimate";
  basis: {
    factors: CarbonFactors;
    usage: UsageCounts;
    note: string;
  };
}

export function estimateFootprint(usage: UsageCounts, factors: CarbonFactors = DEFAULT_FACTORS): EnvironmentalReport {
  const tokens = (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0);
  const images = usage.images ?? 0;
  const energy_kwh = (tokens / 1000) * factors.kwhPer1kTokens + images * factors.kwhPerImage;
  const co2_g = energy_kwh * factors.gridIntensityGPerKwh;
  return {
    energy_kwh: round(energy_kwh, 6),
    co2_g: round(co2_g, 4),
    method: "model-factor-estimate",
    basis: {
      factors,
      usage,
      note: "Estimate from measured token/image counts × documented factors. Not a metered measurement.",
    },
  };
}

function round(n: number, dp: number): number {
  const f = 10 ** dp;
  return Math.round(n * f) / f;
}
