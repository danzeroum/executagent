-- 0006 · Task events (append-only audit log + Studio timeline source)
create table if not exists public.task_events (
  id         bigint generated always as identity primary key,
  task_id    uuid not null references public.tasks (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  type       text not null,        -- task_created | routing_done | variation_ready | validation_done | delivered | failed
  payload    jsonb not null default '{}', -- includes trace_id
  created_at timestamptz not null default now()
);

create index if not exists task_events_task_idx on public.task_events (task_id, id);

-- Studio subscribes to this table via Realtime, filtered by task_id.
alter publication supabase_realtime add table public.task_events;
