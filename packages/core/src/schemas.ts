// Request validation (zod). Used by the create-task edge function so malformed
// input is rejected at the boundary with structured errors.
import { z } from "zod";

export const TIERS = ["S", "M", "L"] as const;
export type Tier = (typeof TIERS)[number];

export const TEMPLATES = ["identidade", "ui", "poster", "icones"] as const;

export const pinSchema = z.object({
  x: z.number(),
  y: z.number(),
  note: z.string().max(500).optional(),
});

export const preferencesSchema = z
  .object({
    template: z.enum(TEMPLATES).optional(),
    style: z.array(z.string().max(60)).max(12).optional(),
    mood: z.array(z.string().max(60)).max(12).optional(),
    parent_artifact_id: z.string().uuid().optional(),
    pins: z.array(pinSchema).max(50).optional(),
  })
  .strict();

export const taskCreateSchema = z
  .object({
    prompt: z.string().min(10).max(8000),
    skill_slug: z.string().max(80).optional(),
    tier: z.enum(TIERS).default("M"),
    preferences: preferencesSchema.default({}),
  })
  .strict();

export type TaskCreateInput = z.infer<typeof taskCreateSchema>;
