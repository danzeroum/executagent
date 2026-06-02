// Function-to-function invocation (Pattern A). Fire the next stage with the
// service-role key and keep the current invocation alive until it's dispatched.
const URL = Deno.env.get("SUPABASE_URL")!;
// The internal stage functions (semantic-router/skill-runner/validate) are
// deployed with verify_jwt=false (the project's injected keys are the new
// non-JWT format, which verify_jwt rejects). They are gateway-internal and
// protected by status-idempotency guards; see docs/05-security.md. The gateway
// still needs an `apikey` to route, so we pass the anon/publishable key.
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;

export function invokeFunction(name: string, body: unknown): Promise<Response> {
  return fetch(`${URL}/functions/v1/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json", apikey: ANON },
    body: JSON.stringify(body),
  });
}

/** Keep the worker alive after responding (Supabase edge runtime). */
export function runAfterResponse(p: Promise<unknown>): void {
  // @ts-ignore EdgeRuntime is provided by the Supabase edge runtime
  if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
    // @ts-ignore
    EdgeRuntime.waitUntil(p);
  } else {
    void p;
  }
}
