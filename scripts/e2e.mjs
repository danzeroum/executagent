// End-to-end smoke test for the vertical slice. Seeds a task, kicks the chain,
// and asserts a real, honest delivery. Run against a Supabase stack (local CLI
// or hosted) with the migrations + functions applied. Uses the mock provider by
// default (set ANTHROPIC/IMAGE keys to exercise real generation).
//
//   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... SUPABASE_ANON_KEY=... node scripts/e2e.mjs
//
// This mirrors the live verification performed during the build (single kick to
// semantic-router -> status=completed, 4 signed artifacts, labeled metrics).
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANON = process.env.SUPABASE_ANON_KEY;
if (!URL || !SERVICE || !ANON) {
  console.error("Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY");
  process.exit(2);
}

const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });
const fail = (m) => { console.error("FAIL:", m); process.exit(1); };

// Seed a user + queued task (service role bypasses RLS).
const userId = crypto.randomUUID();
await admin.from("tasks"); // ensure client ready
const { data: u } = await admin.auth.admin.createUser({ email: `e2e-${userId}@test.local`, email_confirm: true });
const uid = u?.user?.id ?? userId;
const { data: task, error: te } = await admin.from("tasks").insert({
  user_id: uid, status: "queued", tier: "M", prompt: "identidade visual para uma fintech brasileira",
  preferences: { template: "identidade", style: ["minimal"], mood: ["Confiável"] },
}).select("id").single();
if (te) fail("seed task: " + te.message);

// Kick the chain.
const res = await fetch(`${URL}/functions/v1/semantic-router`, {
  method: "POST",
  headers: { "content-type": "application/json", apikey: ANON },
  body: JSON.stringify({ task_id: task.id, trace_id: "e2e-script" }),
});
if (!res.ok) fail(`router kick ${res.status}`);

// Poll until delivered (max ~30s).
let status = "queued";
for (let i = 0; i < 30; i++) {
  await new Promise((r) => setTimeout(r, 1000));
  const { data } = await admin.from("tasks").select("status").eq("id", task.id).single();
  status = data?.status;
  if (status === "completed" || status === "failed") break;
}
if (status !== "completed") fail(`task did not complete (status=${status})`);

// Assert honest, real artifacts.
const { data: artifacts } = await admin.from("artifacts").select("*").eq("task_id", task.id);
if (!artifacts || artifacts.length !== 4) fail(`expected 4 artifacts, got ${artifacts?.length}`);
for (const a of artifacts) {
  if (!a.sha256 || a.sha256.length !== 64) fail("missing sha256");
  if (!a.signature) fail("missing signature");
  if (!a.environmental_report?.method) fail("environmental_report missing method (honesty rule)");
  if (!a.metadata?.quality_score_method) fail("quality_score_method missing (honesty rule)");
}

// Cleanup.
await admin.from("tasks").delete().eq("id", task.id);
await admin.auth.admin.deleteUser(uid).catch(() => {});
console.log("OK: e2e delivered 4 signed artifacts with labeled metrics");
