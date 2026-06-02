-- pgTAP · RLS ownership / IDOR regression test.
-- Run with `supabase test db` (CI) or pg_prove against a database with the
-- migrations applied. Proves a user can never read another user's rows and
-- that soft-deleted rows disappear from their owner.
begin;
select plan(5);

-- ── Setup (runs as the migration/superuser role, bypassing RLS) ──────────────
insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at)
values
  ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'usera@test.local', crypt('x', gen_salt('bf')), now(), now(), now()),
  ('00000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'userb@test.local', crypt('x', gen_salt('bf')), now(), now(), now());

insert into public.tasks (id, user_id, prompt, tier)
values
  ('11111111-1111-1111-1111-11111111111a', '00000000-0000-0000-0000-00000000000a', 'task owned by user A', 'M'),
  ('11111111-1111-1111-1111-11111111111b', '00000000-0000-0000-0000-00000000000b', 'task owned by user B', 'M');

insert into public.artifacts (task_id, user_id, variation_index, storage_path, sha256, signature)
values ('11111111-1111-1111-1111-11111111111a', '00000000-0000-0000-0000-00000000000a', 0, 'a/x/v0.png', 'deadbeef', 'sig');

-- ── Become user B under RLS ──────────────────────────────────────────────────
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
set local role authenticated;

select is(
  (select count(*)::int from public.tasks),
  1,
  'user B sees exactly one task (their own)'
);

select is(
  (select count(*)::int from public.tasks where id = '11111111-1111-1111-1111-11111111111a'),
  0,
  'user B cannot read user A''s task (IDOR blocked → generic 404)'
);

select is(
  (select count(*)::int from public.artifacts where task_id = '11111111-1111-1111-1111-11111111111a'),
  0,
  'user B cannot read user A''s artifact'
);

-- ── Soft-delete hides a row from its owner ───────────────────────────────────
reset role;
update public.tasks set deleted_at = now() where id = '11111111-1111-1111-1111-11111111111b';
select set_config('request.jwt.claims', json_build_object('sub','00000000-0000-0000-0000-00000000000b','role','authenticated')::text, true);
set local role authenticated;

select is(
  (select count(*)::int from public.tasks where id = '11111111-1111-1111-1111-11111111111b'),
  0,
  'soft-deleted task is hidden from its owner'
);

-- ── routing_embeddings has no client policy → invisible to authenticated ─────
select is(
  (select count(*)::int from public.routing_embeddings),
  0,
  'authenticated users cannot read routing_embeddings (service_role only)'
);

reset role;
select * from finish();
rollback;
