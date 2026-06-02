-- 0004 · Tasks (central resource)
do $$ begin
  create type public.task_status as enum
    ('queued', 'routing', 'generating', 'validating', 'completed', 'failed', 'cancelled');
exception when duplicate_object then null; end $$;

create table if not exists public.tasks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade, -- ownership = IDOR control
  status      public.task_status not null default 'queued',
  tier        public.tier not null default 'M',
  skill_slug  text references public.skills (slug),  -- set by router
  prompt      text not null,                         -- LGPD-sensitive
  preferences jsonb not null default '{}',           -- template, style/mood, pins, parent_artifact_id
  routing     jsonb,                                 -- chosen skill, score, candidates
  error       text,
  deleted_at  timestamptz,                           -- soft-delete
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists tasks_user_created_idx
  on public.tasks (user_id, created_at desc)
  where deleted_at is null;

create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();
