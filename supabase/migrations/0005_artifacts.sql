-- 0005 · Artifacts (skill outputs; 4 per creative task)
create table if not exists public.artifacts (
  id                   uuid primary key default gen_random_uuid(),
  task_id              uuid not null references public.tasks (id) on delete cascade,
  user_id              uuid not null references auth.users (id) on delete cascade, -- denormalized for RLS
  variation_index      int not null,
  storage_path         text not null,        -- {user_id}/{task_id}/v{index}.png in private bucket
  content_type         text not null default 'image/png',
  sha256               text not null,        -- integrity
  signature            text not null,        -- HMAC, key from Vault
  quality_score        numeric,              -- see quality_score_method in metadata; never random
  metadata             jsonb not null default '{}', -- model/provider/steps/latency, pii, originality
  environmental_report jsonb,                -- { energy_kwh, co2_g, method, basis } — labeled estimate
  created_at           timestamptz not null default now(),
  unique (task_id, variation_index)
);

create index if not exists artifacts_task_idx on public.artifacts (task_id);
create index if not exists artifacts_user_idx on public.artifacts (user_id);
