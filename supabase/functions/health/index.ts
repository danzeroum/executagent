import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { corsHeaders, json } from "../_shared/cors.ts";
import { adminClient } from "../_shared/clients.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  let db = false;
  try {
    const supa = adminClient();
    const { error } = await supa.from("skills").select("slug", { count: "exact", head: true });
    db = !error;
  } catch {
    db = false;
  }

  const providers = {
    claude: Boolean(Deno.env.get("ANTHROPIC_API_KEY")),
    image: Boolean(Deno.env.get("IMAGE_API_KEY") && Deno.env.get("IMAGE_API_URL")),
    mock_forced: Deno.env.get("PROVIDER_FORCE_MOCK") === "true",
  };

  return json({ status: db ? "ok" : "degraded", db, providers });
});
