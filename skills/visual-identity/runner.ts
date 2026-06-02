// visual-identity skill runner. Self-contained (structural Ctx + local JSON) so
// the exact file deploys into the skill-runner edge function. Matches the
// @executagent/core SkillContext contract.
import presets from "./presets.json" with { type: "json" };

type Tier = "S" | "M" | "L";

interface GenResult {
  kind: "text" | "image";
  bytes?: Uint8Array;
  text?: string;
  contentType: string;
  model: string;
  provider: string;
  usage: { inputTokens?: number; outputTokens?: number; images?: number; latencyMs: number };
}

interface Ctx {
  taskId: string;
  tier: Tier;
  prompt: string;
  preferences: Record<string, unknown>;
  provider: { generate(prompt: string, params: Record<string, unknown>): Promise<GenResult> };
  logger: { info(m: string, e?: Record<string, unknown>): void };
  storeArtifact(variationIndex: number, result: GenResult): Promise<{ id: string }>;
  emit(type: string, payload?: Record<string, unknown>): Promise<void>;
}

const VARIATIONS = 4;

function buildPrompt(ctx: Ctx, axisIndex: number): string {
  const prefs = ctx.preferences ?? {};
  const template = typeof prefs.template === "string" ? prefs.template : "identidade";
  const styles = Array.isArray(prefs.style) ? (prefs.style as string[]) : [];
  const moods = Array.isArray(prefs.mood) ? (prefs.mood as string[]) : [];
  const axis = presets.variationAxes[axisIndex % presets.variationAxes.length];
  const hint = (presets.templateHints as Record<string, string>)[template] ?? "";
  return [
    presets.base,
    hint,
    `Brief: ${ctx.prompt}`,
    styles.length ? `Style: ${styles.join(", ")}.` : "",
    moods.length ? `Mood: ${moods.join(", ")}.` : "",
    `Direction: ${axis}.`,
  ].filter(Boolean).join(" ");
}

export async function run(ctx: Ctx): Promise<{ artifactIds: string[] }> {
  const artifactIds: string[] = [];
  for (let i = 0; i < VARIATIONS; i++) {
    const prompt = buildPrompt(ctx, i);
    ctx.logger.info("generating variation", { variation: i });
    const result = await ctx.provider.generate(prompt, {
      tier: ctx.tier,
      variationIndex: i,
      seed: hashSeed(ctx.taskId, i),
      template: typeof ctx.preferences?.template === "string" ? ctx.preferences.template : "identidade",
      style: ctx.preferences?.style,
      mood: ctx.preferences?.mood,
    });
    const stored = await ctx.storeArtifact(i, result);
    artifactIds.push(stored.id);
    await ctx.emit("variation_ready", { variation_index: i, artifact_id: stored.id, model: result.model, provider: result.provider });
  }
  return { artifactIds };
}

function hashSeed(taskId: string, i: number): number {
  let h = 2166136261;
  const s = `${taskId}:${i}`;
  for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 2147483647;
}
