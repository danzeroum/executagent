-- 0010 · Security hardening (addresses database linter warnings)
-- - Pin search_path on the trigger function (function_search_path_mutable).
-- - Stop exposing SECURITY DEFINER helpers via the public RPC surface.

-- Pin search_path. now() is a builtin, so an empty search_path is safe here.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- handle_new_user only ever runs as an auth.users trigger; it must not be
-- callable via /rest/v1/rpc by API roles.
revoke execute on function public.handle_new_user() from anon, authenticated;

-- is_staff is consulted by RLS policies (so `authenticated` must keep EXECUTE),
-- but anon has no session and should not reach it over RPC.
revoke execute on function public.is_staff() from anon;

-- Accepted/deferred (documented in docs/05-security.md):
--   * routing_embeddings: RLS enabled with no policy is intentional — server-side
--     (service_role) access only.
--   * vector / pg_net installed in `public`: relocating an in-use extension type
--     is risky post-hoc; tracked as scale-vision hardening.
