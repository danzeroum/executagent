-- 0009 · Storage — private `artifacts` bucket.
-- Bytes are served via short-lived signed URLs minted by an edge function after
-- an ownership check. A direct-read RLS policy is also provided, keyed on the
-- {user_id}/... path prefix, so PostgREST/storage clients stay owner-scoped.
insert into storage.buckets (id, name, public)
values ('artifacts', 'artifacts', false)
on conflict (id) do nothing;

-- Owner may read objects under their own {user_id}/ prefix.
create policy artifacts_objects_select_own on storage.objects
  for select to authenticated
  using (
    bucket_id = 'artifacts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Writes are service_role only (skill-runner uploads). No client insert/update/delete policy.
