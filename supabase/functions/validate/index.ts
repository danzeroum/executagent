import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/clients.ts";
import { logger } from "../_shared/log.ts";
import { redactPii } from "../_shared/pii.ts";
import { estimateFootprint } from "../_shared/carbon.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const { task_id, trace_id } = await req.json();
  const log = logger({ fn: "validate", trace_id, task_id });
  const supa = adminClient();

  const { data: task } = await supa.from("tasks").select("*").eq("id", task_id).single();
  if (!task) return json({ error: "task not found" }, 404);
  if (task.status !== "validating") { log.info("skip (not validating)", { status: task.status }); return json({ ok: true, skipped: true }); }

  await supa.from("task_events").insert({ task_id, user_id: task.user_id, type: "validation_started", payload: { trace_id } });

  const { data: artifacts } = await supa.from("artifacts").select("*").eq("task_id", task_id).order("variation_index");
  const list = artifacts ?? [];

  // Originality — REAL but honestly scoped: exact-duplicate check within this batch only.
  const shaCounts = new Map<string, number>();
  for (const a of list) shaCounts.set(a.sha256, (shaCounts.get(a.sha256) ?? 0) + 1);

  // PII — REAL: redact the prompt echo; record findings on each artifact.
  const piiOnPrompt = redactPii(task.prompt as string);

  for (const a of list) {
    const usage = (a.metadata?.usage ?? {}) as { inputTokens?: number; outputTokens?: number; images?: number };
    const env = estimateFootprint(usage);

    const isDuplicate = (shaCounts.get(a.sha256) ?? 0) > 1;
    const originality = {
      method: "intra-batch-sha",
      checked_against: "this batch only",
      duplicate: isDuplicate,
      note: "External-corpus originality check is deferred (see docs/05-security.md).",
    };

    // Quality score from REAL signals (never random): start at 1, penalize duplicate / PII.
    let quality = 1.0;
    if (isDuplicate) quality -= 0.3;
    if (piiOnPrompt.hadPii) quality -= 0.1;
    quality = Math.max(0, Math.round(quality * 100) / 100);

    await supa.from("artifacts").update({
      environmental_report: env,
      quality_score: quality,
      metadata: {
        ...a.metadata,
        quality_score_method: "composite(duplicate,pii) on real signals",
        originality,
        pii: { on_prompt: piiOnPrompt.findings, redacted_prompt_available: piiOnPrompt.hadPii },
      },
    }).eq("id", a.id);
  }

  await supa.from("task_events").insert({ task_id, user_id: task.user_id, type: "validation_done", payload: { trace_id, artifacts: list.length, pii_found: piiOnPrompt.hadPii } });
  await supa.from("tasks").update({ status: "completed" }).eq("id", task_id);
  await supa.from("task_events").insert({ task_id, user_id: task.user_id, type: "delivered", payload: { trace_id } });

  log.info("validated + delivered", { artifacts: list.length });
  return json({ ok: true, artifacts: list.length });
});
