-- 0008 · Row-Level Security — the ownership / IDOR control.
-- Enable RLS everywhere, then grant the minimum. Edge Functions use the
-- service_role key (which bypasses RLS) and always set user_id from the
-- verified JWT — never from request input.

-- Staff (ADMIN/REVIEWER) read helper. SECURITY DEFINER avoids RLS recursion
-- when policies on other tables consult the caller's role.
create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('ADMIN', 'REVIEWER')
  );
$$;

alter table public.profiles           enable row level security;
alter table public.skills             enable row level security;
alter table public.tasks              enable row level security;
alter table public.artifacts          enable row level security;
alter table public.task_events        enable row level security;
alter table public.routing_embeddings enable row level security;

-- profiles: owner reads/updates own; staff read all.
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());
create policy profiles_select_staff on public.profiles
  for select using (public.is_staff());
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- skills: readable catalog for any signed-in user. Writes are service_role only.
create policy skills_select_authenticated on public.skills
  for select to authenticated using (true);

-- tasks: owner sees only their non-deleted tasks; staff read all.
-- Creation goes through the create-task function (service_role); clients may
-- soft-delete / cancel via UPDATE on their own rows.
create policy tasks_select_own on public.tasks
  for select using (user_id = auth.uid() and deleted_at is null);
create policy tasks_select_staff on public.tasks
  for select using (public.is_staff());
create policy tasks_update_own on public.tasks
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- artifacts: owner reads own. Writes are service_role (skill-runner/validate).
create policy artifacts_select_own on public.artifacts
  for select using (user_id = auth.uid());
create policy artifacts_select_staff on public.artifacts
  for select using (public.is_staff());

-- task_events: owner reads own (this is what Studio subscribes to).
create policy task_events_select_own on public.task_events
  for select using (user_id = auth.uid());
create policy task_events_select_staff on public.task_events
  for select using (public.is_staff());

-- routing_embeddings: no client policy → service_role only (router runs server-side).
