# 04 · Data model

All tables live in Postgres (Supabase). Migrations are under `supabase/migrations/`, one
concern per file. Every business table has **RLS enabled** (see [`05-security.md`](05-security.md)).

## Enums

- `task_status`: `queued | routing | generating | validating | completed | failed | cancelled`
- `tier`: `S | M | L`
- `skill_status`: `active | deprecated`

## Tables

### `profiles` — mirrors `auth.users`
| column | type | notes |
| --- | --- | --- |
| `id` | uuid PK | → `auth.users(id)` |
| `display_name` | text | LGPD-sensitive |
| `role` | text default `'USER'` | RBAC: `USER` / `PM` / `ADMIN` / `REVIEWER` |
| `created_at` / `updated_at` | timestamptz | |

### `skills` — registry (the "agents" resource)
`id`, `slug` (unique, e.g. `visual-identity`), `name`, `description`, `version` (semver),
`status` (`skill_status`), `entrypoint` (runner id), `default_tier` (`tier`),
`manifest jsonb` (parsed `SKILL.md` frontmatter), `created_at`.

### `tasks` — central resource
| column | type | notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `user_id` | uuid NOT NULL → `auth.users` | **ownership = the IDOR control** |
| `status` | `task_status` default `queued` | |
| `tier` | `tier` | |
| `skill_slug` | text → `skills(slug)` | set by router |
| `prompt` | text NOT NULL | **LGPD-sensitive** (free text may contain PII) |
| `preferences` | jsonb | template, style/mood chips, pins, `parent_artifact_id` (refine) |
| `routing` | jsonb | chosen skill, score, candidate scores |
| `error` | text | failure reason |
| `deleted_at` | timestamptz | **soft-delete** |
| `created_at` / `updated_at` | timestamptz | |

Index: `(user_id, created_at desc) where deleted_at is null`.

### `artifacts` — outputs (4 per creative task)
| column | type | notes |
| --- | --- | --- |
| `id` | uuid PK | |
| `task_id` | uuid → `tasks` | |
| `user_id` | uuid | denormalized for fast RLS |
| `variation_index` | int | 0–3 |
| `storage_path` | text | key in private `artifacts` bucket: `{user_id}/{task_id}/v{index}.png` |
| `content_type` | text | |
| `sha256` | text NOT NULL | **integrity** |
| `signature` | text NOT NULL | **HMAC** signed with key from Vault |
| `quality_score` | numeric | with `quality_score_method` in `metadata` — never random |
| `metadata` | jsonb | model, provider, steps, latency_ms ("técnico" mode); pii + originality results |
| `environmental_report` | jsonb | `{ energy_kwh, co2_g, method, basis }` — estimate **labeled with method** |
| `created_at` | timestamptz | |

### `task_events` — audit log + Studio timeline (append-only)
`id` (bigint identity PK), `task_id`, `user_id`, `type` (see [`03-api.md`](03-api.md)),
`payload jsonb` (includes `trace_id`), `created_at`. This is the single source of truth for
the UI timeline, consumed via Realtime.

### `routing_embeddings` — semantic routing (pgvector)
`id`, `skill_slug` → `skills`, `kind` (`skill_descriptor | template`), `content` text,
`embedding vector(1536)`, `created_at`. HNSW index: `using hnsw (embedding vector_cosine_ops)`.

## Queues (pgmq)

`task_jobs`, `skill_jobs`, `validate_jobs` — created in `0010_queue_and_triggers.sql`. Each
holds `{ task_id }` (+ stage metadata). Consumed and archived by the corresponding function.

## LGPD-sensitive columns

`profiles.display_name`, `tasks.prompt`, artifact bytes (may contain regenerated PII), and any
`metadata` echoing the prompt. Retention/erasure lifecycle is in [`05-security.md`](05-security.md).
