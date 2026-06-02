// Skill execution contract. A skill's runner.ts exports `run(ctx)`; the
// skill-runner edge function builds the context (verified identity, resolved
// provider, storage/event helpers) and invokes it.
import type { Logger } from "./logger.ts";
import type { ModelProvider, GenResult } from "./provider.ts";
import type { Tier } from "./schemas.ts";

export interface StoredArtifact {
  id: string;
  variationIndex: number;
  storagePath: string;
  sha256: string;
}

export interface SkillContext {
  userId: string;
  taskId: string;
  traceId: string;
  tier: Tier;
  prompt: string;
  preferences: Record<string, unknown>;
  provider: ModelProvider;
  logger: Logger;
  /** Upload bytes + hash + sign + insert an artifacts row. Returns the stored ref. */
  storeArtifact(variationIndex: number, result: GenResult): Promise<StoredArtifact>;
  /** Append a task_events row (carries trace_id). */
  emit(type: string, payload?: Record<string, unknown>): Promise<void>;
}

export interface SkillResult {
  artifactIds: string[];
}

export type SkillRunner = (ctx: SkillContext) => Promise<SkillResult>;
