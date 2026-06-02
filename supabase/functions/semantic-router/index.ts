import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/clients.ts";
import { logger } from "../_shared/log.ts";
import { invokeFunction } from "../_shared/invoke.ts";
import { HashingEmbeddingProvider } from "../_shared/providers.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const { task_id, trace_id } = await req.json();
  const log = logger({ fn: "semantic-router", trace_id, task_id });
  const supa = adminClient();

  const { data: task } = await supa.from("tasks").select("*").eq("id", task_id).single();
  if (!task) return json({ error: "task not found" }, 404);
  if (task.status !== "queued") { log.info("skip (not queued)", { status: task.status }); return json({ ok: true, skipped: true }); }

  // Real routing path. Embed the prompt and find the nearest skill descriptor.
  // With one skill (and no seeded embeddings yet) this falls back to the single
  // active skill — still the real code path, no fabrication.
  let chosen = task.skill_slug as string | null;
  let routing: Record<string, unknown> = { method: "embedding-nearest" };
  try {
    const emb = await new HashingEmbeddingProvider().embed(task.prompt);
    const literal = `[${emb.vector.join(",")}]`;
    const { data: matches } = await supa.rpc("match_skill", { query_embedding: literal, match_count: 1 });
    if (Array.isArray(matches) && matches.length > 0) {
      chosen = matches[0].skill_slug;
      routing = { method: "embedding-nearest", score: matches[0].score, candidates: matches };
    }
  } catch (e) {
    log.warn("embedding route failed, falling back", { error: String(e) });
  }
  if (!chosen) {
    const { data: skill } = await supa.from("skills").select("slug").eq("status", "active").limit(1).single();
    chosen = skill?.slug ?? null;
    routing = { method: "single-active-fallback", note: "no routing embeddings yet" };
  }
  if (!chosen) return json({ error: "no active skill" }, 500);

  await supa.from("tasks").update({ skill_slug: chosen, routing, status: "generating" }).eq("id", task_id);
  await supa.from("task_events").insert({ task_id, user_id: task.user_id, type: "routing_done", payload: { trace_id, skill_slug: chosen, routing } });
  await supa.rpc("enqueue_job", { queue_name: "skill_jobs", msg: { task_id, trace_id } });

  log.info("routed", { skill_slug: chosen });
  await invokeFunction("skill-runner", { task_id, trace_id });
  return json({ ok: true, skill_slug: chosen });
});
