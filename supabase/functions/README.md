# Edge Functions

Deno functions deployed to the `executagent` Supabase project.

| Function | verify_jwt | Role |
| --- | --- | --- |
| `create-task` | **true** | Public entry. Authenticates the caller (real user JWT), validates, inserts the task, kicks the chain. |
| `semantic-router` | false | Internal. Embeds + routes to a skill, then invokes `skill-runner`. |
| `skill-runner` | false | Internal. Runs the skill (4 variations), stores + hashes + signs artifacts, invokes `validate`. |
| `validate` | false | Internal. PII redaction, originality, carbon; marks the task delivered. |
| `health` | false | Public, unauthenticated liveness/readiness. |

## Why the internal functions are `verify_jwt=false`

This project's injected keys (`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`) are the new
**non-JWT** key format, which the gateway's `verify_jwt` rejects — so function-to-function
calls cannot pass a JWT check. The stage functions are therefore **gateway-internal**
(`verify_jwt=false`) and protected instead by **status-idempotency guards**: each runs only
when the task is in its expected status (`queued`/`generating`/`validating`) and no-ops
otherwise. They never return task data to the caller. `create-task` remains JWT-authenticated
as the real public entry. `invokeFunction` passes the anon/publishable key as `apikey` (needed
for gateway routing). See `docs/05-security.md`.

## The chain (Pattern A)

`create-task → semantic-router → skill-runner → validate`, each awaiting the next (the edge
runtime drops post-response background work, so we do not fire-and-forget). pgmq records each
stage for audit/retry. For slow real generation, move to the decoupled pgmq + pg_cron
dispatcher (`docs/02-scale-vision.md`); the client already tolerates it via Realtime/polling.

## skill-runner assembly

`skill-runner` bundles the skill at deploy time: `skills/visual-identity/{runner.ts,presets.json}`
are shipped as `skill/runner.ts` + `skill/presets.json`. `skills/visual-identity/` stays the
canonical authoring home (Agent Skills convention).

## Deploy

Via the Supabase MCP `deploy_edge_function` (no local Deno here), or the Supabase CLI:
`supabase functions deploy <name>`. `_shared/*` mirrors the unit-tested pure logic from
`packages/core`; keep them in sync (unify via JSR at scale).
