// Subscribe to a task's append-only event stream (the Studio timeline source).
// Falls back to polling if a Realtime message is dropped (see docs/03-api.md).
import { supabase } from "./supabaseClient.js";

export function subscribeTaskEvents(taskId, onEvent) {
  const channel = supabase
    .channel(`task:${taskId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "task_events", filter: `task_id=eq.${taskId}` },
      (payload) => onEvent(payload.new),
    )
    .subscribe();
  return () => supabase.removeChannel(channel);
}

/** Polling fallback: returns all events for a task, ordered. */
export async function pollTaskEvents(taskId) {
  const { data } = await supabase
    .from("task_events")
    .select("*")
    .eq("task_id", taskId)
    .order("id");
  return data ?? [];
}
