// Typed-ish wrappers over the edge functions + PostgREST reads (RLS-scoped).
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from "./supabaseClient.js";

function fnUrl(name) {
  return `${SUPABASE_URL}/functions/v1/${name}`;
}

/** POST /create-task — returns { task_id, status }. */
export async function createTask(brief) {
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(fnUrl("create-task"), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session?.access_token ?? SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify(brief),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error?.message ?? res.statusText);
  return body;
}

/** Artifacts for a task (RLS: only the owner's rows). */
export async function listArtifacts(taskId) {
  const { data, error } = await supabase
    .from("artifacts")
    .select("*")
    .eq("task_id", taskId)
    .order("variation_index");
  if (error) throw error;
  return data ?? [];
}

/** Short-lived signed URL for a private artifact object. */
export async function signedUrl(storagePath) {
  const { data, error } = await supabase.storage.from("artifacts").createSignedUrl(storagePath, 3600);
  if (error) return null;
  return data?.signedUrl ?? null;
}
