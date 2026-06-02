// Supabase browser client. Config is read at RUNTIME from window.__EXECUTAGENT_CONFIG__
// (injected by /config.js — generated from container env at startup) and falls back
// to Vite build-time env for local `pnpm dev`. `configured` is false when neither is
// present, so the UI shows a clearly-labeled DEMO mode.
import { createClient } from "@supabase/supabase-js";

const runtime = (typeof window !== "undefined" && window.__EXECUTAGENT_CONFIG__) || {};

const url = runtime.SUPABASE_URL || import.meta.env.VITE_SUPABASE_URL;
const anonKey = runtime.SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY;

export const configured = Boolean(url && anonKey);
export const SUPABASE_URL = url;
export const SUPABASE_ANON_KEY = anonKey;
export const supabase = configured ? createClient(url, anonKey) : null;
