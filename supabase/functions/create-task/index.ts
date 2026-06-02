import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { adminClient, getUserId } from "../_shared/clients.ts";
import { logger } from "../_shared/log.ts";
import { invokeFunction } from "../_shared/invoke.ts";

const TIERS = new Set(["S", "M", "L"]);

function validate(body: Record<string, unknown>): { ok: true; value: { prompt: string; tier: string; skill_slug: string | null; preferences: Record<string, unknown> } } | { ok: false; message: string } {
  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (prompt.length < 10 || prompt.length > 8000) return { ok: false, message: "prompt must be 10–8000 chars" };
  const tier = typeof body.tier === "string" ? body.tier : "M";
  if (!TIERS.has(tier)) return { ok: false, message: "tier must be S, M or L" };
  const preferences = (body.preferences && typeof body.preferences === "object") ? body.preferences as Record<string, unknown> : {};
  const skill_slug = typeof body.skill_slug === "string" ? body.skill_slug : null;
  return { ok: true, value: { prompt, tier, skill_slug, preferences } };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: { code: "METHOD_NOT_ALLOWED", message: "POST only" } }, 405);

  const trace_id = crypto.randomUUID();
  const log = logger({ fn: "create-task", trace_id });

  const userId = await getUserId(req);
  if (!userId) return json({ error: { code: "UNAUTHORIZED", message: "Authentication required", request_id: trace_id } }, 401);

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return json({ error: { code: "VALIDATION_ERROR", message: "invalid JSON", request_id: trace_id } }, 400); }

  const v = validate(body);
  if (!v.ok) return json({ error: { code: "VALIDATION_ERROR", message: v.message, request_id: trace_id } }, 400);

  const supa = adminClient();

  // Basic per-user rate limit: max 10 tasks/hour (anti-abuse for GPU-ish work).
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await supa.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", since);
  if ((count ?? 0) >= 10) return json({ error: { code: "RATE_LIMITED", message: "Too many tasks this hour", request_id: trace_id } }, 429);

  const { data: task, error } = await supa.from("tasks").insert({
    user_id: userId, // from verified JWT, never from body
    prompt: v.value.prompt,
    tier: v.value.tier,
    skill_slug: v.value.skill_slug,
    preferences: v.value.preferences,
    status: "queued",
  }).select("id").single();

  if (error || !task) { log.error("insert failed", { error: error?.message }); return json({ error: { code: "INTERNAL", message: "could not create task", request_id: trace_id } }, 500); }

  await supa.from("task_events").insert({ task_id: task.id, user_id: userId, type: "task_created", payload: { trace_id } });
  await supa.rpc("enqueue_job", { queue_name: "task_jobs", msg: { task_id: task.id, trace_id } });

  // Drive the chain. We await (rather than fire-and-forget) because the edge
  // runtime drops post-response background work when the caller disconnects.
  // Stages are idempotent + emit Realtime events as they go, so the client's
  // subscription fills in live. For slow real generation, switch this to the
  // pgmq + pg_cron dispatcher (queues already exist) — see docs/02-scale-vision.md.
  log.info("task created", { task_id: task.id });
  await invokeFunction("semantic-router", { task_id: task.id, trace_id });

  return json({ task_id: task.id, status: "queued" }, 202);
});
