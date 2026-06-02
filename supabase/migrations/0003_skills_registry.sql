-- 0003 · Skills registry (the "agents" resource) + shared enums
do $$ begin
  create type public.tier as enum ('S', 'M', 'L');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.skill_status as enum ('active', 'deprecated');
exception when duplicate_object then null; end $$;

create table if not exists public.skills (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique,          -- e.g. 'visual-identity'
  name         text not null,
  description  text not null,                 -- embedded by the router; write for routing
  version      text not null default '0.1.0', -- semver
  status       public.skill_status not null default 'active',
  entrypoint   text not null,                 -- runner id loaded by skill-runner
  default_tier public.tier not null default 'M',
  manifest     jsonb not null default '{}',   -- parsed SKILL.md frontmatter
  created_at   timestamptz not null default now()
);
