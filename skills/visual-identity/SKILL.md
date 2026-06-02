---
name: visual-identity
description: >
  Generates 4 brand/visual identity variations (logomark + palette + type
  direction) from a natural-language brief. Use for templates identidade,
  poster, icones, ui.
version: 0.1.0
status: active
tier_default: M
provider_kind: image
inputs: [prompt, style, mood, template]
outputs: 4 image artifacts + per-variation metadata
---

## Strategy

Produce **four meaningfully different directions** from one brief, not four
near-duplicates. Each variation fixes the user's intent (template + style + mood)
but shifts one **variation axis** (see `presets.json`) and uses a distinct seed, so
the user is choosing across a space of possibilities — the "Descobrir" principle.

## Runtime contract

`runner.ts` exports `run(ctx)` against the `SkillContext` shape
(`@executagent/core` `SkillContext`; mirrored structurally so the file is
self-contained for the Deno edge runtime). For each of the 4 variations it:

1. Builds the image prompt from the brief + `presets.json` fragments + the axis.
2. Calls `ctx.provider.generate(prompt, { tier, seed, variationIndex, ... })`.
3. `ctx.storeArtifact(i, result)` — uploads bytes, hashes + signs, inserts the row.
4. `ctx.emit("variation_ready", …)` immediately (never waits for all four —
   respects Edge Function time limits and fills the UI progressively).

It records real provider `usage` on each artifact; the `validate` stage turns that
into the labeled carbon estimate. The runner never fabricates metrics.
