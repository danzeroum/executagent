# 06 · Authoring a skill

Executagent skills follow the [Agent Skills](https://agentskills.io) open standard, the same
filesystem convention Claude Code uses: a skill is a **directory** with a `SKILL.md`
entrypoint and optional bundled resources, designed for **progressive disclosure** — cheap
metadata is always loaded, the body and resources load only when the skill runs.

## Anatomy

```
skills/<slug>/
├── SKILL.md                 # required: frontmatter (always loaded) + body (loaded on use)
├── runner.ts                # executable logic, imported by the skill-runner edge function
├── prompts/                 # prompt fragments loaded on use
│   └── *.md
└── resources/               # data the runner reads on use (presets, mappings)
    └── *.json
```

## `SKILL.md` frontmatter

```yaml
---
name: visual-identity
description: >
  Generates 4 brand/visual identity variations (logomark + palette + type direction)
  from a natural-language brief. Use for templates identidade, poster, icones, ui.
version: 0.1.0          # semver — bumped on behavior change
status: active          # active | deprecated
tier_default: M
provider_kind: image    # text | image | embedding — picks the provider
inputs: [prompt, style, mood, template]
outputs: 4 image artifacts + per-variation metadata
---
```

The frontmatter is parsed into `skills.manifest` (jsonb) at registration. `description` is
what the semantic router embeds to decide when this skill applies, so write it for routing,
not marketing. The **body** (markdown after the frontmatter) holds the instructions/strategy
and is loaded only when the skill executes — keep heavy reference material there, not in
frontmatter.

## `runner.ts` contract

```ts
import type { SkillContext, SkillResult } from "@executagent/core";

export async function run(ctx: SkillContext): Promise<SkillResult>;
```

`ctx` provides the verified `user_id`, `task_id`, `trace_id`, the resolved `ModelProvider`,
the prompt + preferences, and helpers to `storeArtifact()` (upload + hash + sign + insert row)
and `emit()` (write a `task_events` row). The runner:

1. Reads its `resources/` and `prompts/` (progressive disclosure — only now).
2. Builds the final provider prompt from the user input + bundled fragments.
3. Calls `ctx.provider.generate()` per variation, calling `ctx.storeArtifact()` and
   `ctx.emit('variation_ready', …)` after each — **never wait for all variations** before
   emitting, to respect Edge Function time limits.
4. Returns the artifact ids.

## Rules

- **No God modules.** If `runner.ts` grows past a few hundred lines, split logic into the
  skill's own modules or shared `packages/core` helpers.
- **No fabricated metrics.** The runner records real provider `usage`; the `validate` function
  turns it into labeled estimates. See [`05-security.md`](05-security.md).
- **Provider-agnostic.** Call only through the `ModelProvider` interface — never a vendor SDK
  directly — so the self-hosted swap costs nothing.
