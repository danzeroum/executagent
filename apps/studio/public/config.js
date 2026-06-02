// Runtime config placeholder. In production the Docker entrypoint overwrites this
// file from container env (SUPABASE_URL / SUPABASE_ANON_KEY). Left empty here so
// local `pnpm dev` falls back to Vite's VITE_* env (or DEMO mode).
window.__EXECUTAGENT_CONFIG__ = {
  SUPABASE_URL: "",
  SUPABASE_ANON_KEY: "",
};
