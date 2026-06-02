// Supabase browser client. `configured` is false when env vars are absent, so the
// UI can fall back to a clearly-labeled DEMO mode for offline development.
import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configured = Boolean(url && anonKey);
export const SUPABASE_URL = url;
export const SUPABASE_ANON_KEY = anonKey;
export const supabase = configured ? createClient(url, anonKey) : null;
