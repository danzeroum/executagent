-- 0001 · Extensions
-- Postgres-native substrates that let the MVP avoid self-hosted infra:
--   vector  → semantic routing (replaces Qdrant)
--   pgmq    → async job queues (replaces Kafka)
--   pg_net  → async HTTP from the DB (function-to-function / cron dispatch, scale step)
--   pg_cron → scheduled cleanup / dispatcher (growth step)
--   pgcrypto→ gen_random_uuid + digest helpers
create extension if not exists vector;
create extension if not exists pgmq;
create extension if not exists pg_net;
create extension if not exists pg_cron;
create extension if not exists pgcrypto;

-- Shared trigger to maintain updated_at on row changes.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
