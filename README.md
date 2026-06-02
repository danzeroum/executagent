# Executagent

Structured task execution via AI **skills**. Users describe a task (free text or a
template); a semantic router picks a skill and model **tier (S/M/L)**; the skill produces
deliverables; a validation pipeline checks them; results stream back with **honest**
quality and environmental metrics.

> The product is **Executagent** (one word). Earlier `ExecuAgent` / `ExecutAgent` spellings
> are wrong and must not appear in code, package names, env vars, or docs.

## Why this shape

This MVP is deliberately **thin, real, and honest**, learning from a reference audit of a
prior agent platform whose failure modes were: 0% test coverage, monolithic "God modules",
zero cache/observability, and — worst — **an LLM presenting fabricated data as if it were
measured**. Our hard rules:

- **No fabricated metrics.** Every number shown is measured, or labeled an estimate with its method.
- **Tests from day one** (unit + integration + e2e), with a coverage gate that never returns to zero.
- **Small composable skills**, each a directory with a `SKILL.md` (the
  [Agent Skills](https://agentskills.io) open standard), not monoliths.
- **Observability baked in**: structured JSON logs + a `trace_id` through the whole flow, `/health`.

## Architecture (MVP)

Supabase-first. The heavy enterprise stack from the original plans is documented as a future
**scale vision** (`docs/02-scale-vision.md`), not built now:

| MVP (built now) | Scale vision (later) |
| --- | --- |
| pgmq (Postgres queue) | Kafka |
| pgvector (hnsw) | Qdrant |
| Supabase Auth/JWT + `profiles.role` RBAC | Keycloak |
| Supabase Realtime | dedicated WebSocket service |
| Edge Functions (Deno) | K8s microservices |
| Managed model APIs behind a provider interface | self-hosted vLLM/TensorRT |
| structured logs + trace_id | OpenTelemetry |

See [`docs/`](docs/) for the full architecture, data model, API, and security notes.

## Layout

```
apps/studio/        Studio UI (3-column Explorar / Descobrir / Diálogo workspace)
packages/providers/ model-provider abstraction (Claude text, image, mock, self-hosted stub)
packages/core/      shared libs: logger, errors, hash, carbon, pii, schemas
packages/config/    shared tsconfig
supabase/           migrations, edge functions, db tests
skills/             SKILL.md-based skills (first: visual-identity)
docs/               architecture, data model, api, security, skills authoring
```

## Develop

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm dev:studio   # Vite dev server for the Studio UI
```

Copy `.env.example` to `.env` and fill in Supabase + provider keys. Secrets are never
committed. DB schema and Edge Functions are managed via Supabase migrations under
`supabase/`.
