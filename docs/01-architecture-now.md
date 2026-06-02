# 01 · Architecture (what we build now)

Supabase-first. The orchestrator-worker + semantic-routing ideas from the reference
architecture are kept; the heavy infrastructure is deferred (see
[`02-scale-vision.md`](02-scale-vision.md)).

## Components

```
┌─────────────┐   HTTPS + JWT    ┌──────────────────────────────────────────┐
│ Studio (UI) │ ───────────────▶ │ Edge Functions (Deno)                     │
│  Vite/JS    │ ◀─ Realtime ──── │  create-task · semantic-router ·          │
└─────────────┘   (task_events)  │  skill-runner · validate · health         │
       ▲                          └───────────────┬──────────────────────────┘
       │ signed URLs                               │ uses
       │                          ┌────────────────▼───────────────┐
       │                          │ packages/providers (ModelProvider)│
       │                          │  claude · image · mock · stub    │
       │                          └────────────────┬───────────────┘
       │                                           │ managed APIs
┌──────┴───────────────────────────────────────────▼───────────────────────┐
│ Supabase Postgres                                                          │
│  tables: profiles, skills, tasks, artifacts, task_events, routing_embeddings│
│  pgmq (queues) · pgvector/hnsw (routing) · RLS (ownership) · Vault (secrets)│
│  Storage bucket `artifacts` (private, signed-URL access)                   │
└────────────────────────────────────────────────────────────────────────────┘
```

## Async flow without Kafka

The backbone is **pgmq** (a Postgres-native queue: retry + idempotency + observability) plus
function-to-function invocation, with **Realtime** as the UI progress channel:

1. `create-task` validates, inserts the `tasks` row (`user_id` from the verified JWT),
   emits `task_created`, enqueues `task_jobs`, and returns `{ task_id }` immediately. The
   client now watches Realtime — the rest is async from its perspective.
2. Each downstream function dequeues its job, does its single responsibility, emits an event,
   enqueues the next stage, and **archives its pgmq message only after success**.
3. Every function is **idempotent on `task_id` + stage**, so a retry never double-generates.

> Edge Functions have execution-time limits. Image generation is therefore chunked: the
> runner emits a `variation_ready` event **per variation** rather than waiting for all four,
> so the UI fills in progressively and no single invocation runs too long.

Pattern A (above) is what we build. A more decoupled `pg_cron`/`pg_net` dispatcher draining
pgmq is the documented growth step toward the Kafka scale-vision.

## Model tiering (hybrid)

`tier` S/M/L selects a model through the provider registry — e.g. text `S→Haiku, M→Sonnet,
L→Opus`; image tiers map to resolution/steps/model size. Today these are **managed APIs**;
the `ModelProvider` interface lets self-hosted vLLM/TensorRT be swapped in later without
touching any skill. See `packages/providers`.

## Observability

`packages/core/logger.ts` emits structured JSON (`ts, level, fn, task_id, trace_id, msg`).
The `trace_id` is generated in `create-task` and propagated through every `task_events`
payload, so a whole task is reconstructable from logs. `health` reports DB reachability,
pgmq queue depth, and provider reachability. (OpenTelemetry is scale-vision.)
