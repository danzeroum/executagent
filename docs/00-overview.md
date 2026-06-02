# 00 · Overview

Executagent lets users describe a task — in natural language or via a guided template — and
have specialized AI **skills** produce deliverables (starting with creative/visual identity),
with semantic routing, model tiering, automated validation, and honest environmental
transparency.

This document set is the **integration** of four source plans into one buildable direction:

| Source plan | Where it lives now |
| --- | --- |
| Process mapping (PRO-AGT-001) | The task lifecycle / state machine → [`04-data-model.md`](04-data-model.md) (`task_events`) and the Studio timeline. |
| Reference architecture | [`01-architecture-now.md`](01-architecture-now.md) (built) + [`02-scale-vision.md`](02-scale-vision.md) (deferred). |
| API architecture | [`03-api.md`](03-api.md) + [`openapi.yaml`](openapi.yaml). |
| Security analysis | [`05-security.md`](05-security.md). |

## The task lifecycle (TO-BE, simplified for the MVP)

```
brief (wizard/template + tier)
  → create-task        status: queued      event: task_created
  → semantic-router    status: routing     event: routing_done      (embedding → nearest skill)
  → skill-runner       status: generating  event: variation_ready ×4 (one per artifact)
  → validate           status: validating  event: validation_done   (PII redaction, originality, carbon)
  → delivered          status: completed   event: delivered
  ↺ refine (Diálogo) → new child task → new version
```

Each transition writes an append-only row to `task_events`; the Studio UI renders its
timeline and variation cards by subscribing to those rows over Supabase Realtime.

## Principles (non-negotiable)

1. **Honest metrics.** Quality, originality, energy and carbon are computed from real signals
   or explicitly labeled estimates carrying their `method`/`basis`. We never display a
   fabricated number as if measured. (This is the central lesson from the reference audit.)
2. **Composable skills.** A skill is a directory with a `SKILL.md` following the
   [Agent Skills](https://agentskills.io) standard — progressive disclosure, bundled
   resources, no God modules. See [`06-skills-authoring.md`](06-skills-authoring.md).
3. **Security is foundational.** Row-Level Security enforces ownership (the IDOR control)
   before any business logic is written. See [`05-security.md`](05-security.md).
4. **Observability + tests from day one.** Structured logs with a `trace_id` end-to-end, a
   `/health` endpoint, and three test levels behind a coverage gate that never returns to 0.

## Status

This is the MVP vertical slice: **one** skill (`visual-identity`) proven end-to-end. Code and
science skills are added later by reusing the same provider interface, `SKILL.md` convention,
and validation pipeline.
