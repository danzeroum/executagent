// Session bootstrap. For the MVP demo we use anonymous sign-in (enable it in
// Supabase Auth settings); RLS still applies via auth.uid(). Swap for
// email/OAuth sign-in for real accounts.
import { supabase } from "./supabaseClient.js";

export async function ensureSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session.user;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    console.warn("[executagent] anonymous sign-in unavailable:", error.message);
    return null;
  }
  return data.user;
}
