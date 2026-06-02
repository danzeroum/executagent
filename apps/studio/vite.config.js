import { defineConfig } from "vite";

// Studio dev server. Reads VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY from the root .env.
export default defineConfig({
  root: ".",
  envDir: "../..",
  server: { port: 5173 },
  build: { outDir: "dist" },
});
