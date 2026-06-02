import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/clients.ts";
import { logger } from "../_shared/log.ts";
import { invokeFunction } from "../_shared/invoke.ts";
import { resolveProvider } from "../_shared/providers.ts";
import { sha256Hex, signHmacHex } from "../_shared/hash.ts";
// Assembled at deploy time from skills/visual-identity/ (see supabase/functions/README.md).
import { run as runVisualIdentity } from "./skill/runner.ts";

const RUNNERS: Record<string, typeof runVisualIdentity> = { "visual-identity": runVisualIdentity };

const EXT: Record<string, string> = { "image/svg+xml": "svg", "image/png": "png", "image/jpeg": "jpg", "text/plain": "txt" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const { task_id, trace_id } = await req.json();
  const log = logger({ fn: "skill-runner", trace_id, task_id });
  const supa = adminClient();

  const { data: task } = await supa.from("tasks").select("*").eq("id", task_id).single();
  if (!task) return json({ error: "task not found" }, 404);
  if (task.status !== "generating") { log.info("skip (not generating)", { status: task.status }); return json({ ok: true, skipped: true }); }

  const { count } = await supa.from("artifacts").select("id", { count: "exact", head: true }).eq("task_id", task_id);
  if ((count ?? 0) >= 4) { log.info("skip (artifacts exist)"); return json({ ok: true, skipped: true }); }

  const runner = RUNNERS[task.skill_slug ?? ""];
  if (!runner) return json({ error: `no runner for ${task.skill_slug}` }, 500);

  const provider = resolveProvider("image", Deno.env.toObject());
  const signingKey = Deno.env.get("ARTIFACT_SIGNING_KEY") ?? "dev-signing-key-set-ARTIFACT_SIGNING_KEY-in-prod";
  if (!Deno.env.get("ARTIFACT_SIGNING_KEY")) log.warn("ARTIFACT_SIGNING_KEY not set — using dev fallback");

  const ctx = {
    taskId: task_id as string,
    tier: task.tier as "S" | "M" | "L",
    prompt: task.prompt as string,
    preferences: (task.preferences ?? {}) as Record<string, unknown>,
    provider,
    logger: log,
    async storeArtifact(variationIndex: number, result: { bytes?: Uint8Array; contentType: string; model: string; provider: string; usage: Record<string, unknown> }) {
      const bytes = result.bytes ?? new TextEncoder().encode(result["text" as keyof typeof result] as string ?? "");
      const ext = EXT[result.contentType] ?? "bin";
      const path = `${task.user_id}/${task_id}/v${variationIndex}.${ext}`;
      const up = await supa.storage.from("artifacts").upload(path, bytes, { contentType: result.contentType, upsert: true });
      if (up.error) throw new Error(`storage upload failed: ${up.error.message}`);
      const sha256 = await sha256Hex(bytes);
      const signature = await signHmacHex(bytes, signingKey);
      const { data: row, error } = await supa.from("artifacts").insert({
        task_id, user_id: task.user_id, variation_index: variationIndex,
        storage_path: path, content_type: result.contentType, sha256, signature,
        metadata: { model: result.model, provider: result.provider, usage: result.usage },
      }).select("id").single();
      if (error || !row) throw new Error(`artifact insert failed: ${error?.message}`);
      return { id: row.id as string };
    },
    async emit(type: string, payload: Record<string, unknown> = {}) {
      await supa.from("task_events").insert({ task_id, user_id: task.user_id, type, payload: { trace_id, ...payload } });
    },
  };

  try {
    await ctx.emit("generation_started", { skill_slug: task.skill_slug });
    const result = await runner(ctx as unknown as Parameters<typeof runner>[0]);
    await supa.from("tasks").update({ status: "validating" }).eq("id", task_id);
    await supa.rpc("enqueue_job", { queue_name: "validate_jobs", msg: { task_id, trace_id } });
    await invokeFunction("validate", { task_id, trace_id });
    log.info("generated", { artifacts: result.artifactIds.length });
    return json({ ok: true, artifacts: result.artifactIds.length });
  } catch (e) {
    log.error("generation failed", { error: String(e) });
    await supa.from("tasks").update({ status: "failed", error: String(e) }).eq("id", task_id);
    await supa.from("task_events").insert({ task_id, user_id: task.user_id, type: "failed", payload: { trace_id, error: String(e) } });
    return json({ error: String(e) }, 500);
  }
});
