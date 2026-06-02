-- 0011 · pgmq queues + service-role enqueue wrapper + seed the first skill.
-- The MVP drives the stage chain via function-to-function invoke (Pattern A);
-- pgmq records each stage for audit/retry/observability and is the documented
-- backbone toward the decoupled dispatcher (scale-vision).

select pgmq.create('task_jobs');
select pgmq.create('skill_jobs');
select pgmq.create('validate_jobs');

-- Public, service-role-only wrapper so edge functions can enqueue without the
-- pgmq schema being exposed on the API surface.
create or replace function public.enqueue_job(queue_name text, msg jsonb)
returns bigint
language plpgsql
security definer
set search_path = public, pgmq
as $$
declare msg_id bigint;
begin
  select pgmq.send(queue_name, msg) into msg_id;
  return msg_id;
end;
$$;

revoke execute on function public.enqueue_job(text, jsonb) from anon, authenticated;

-- Seed the first skill. The router falls back to the single active skill when no
-- routing embeddings exist yet, so the slice works before embeddings are seeded.
insert into public.skills (slug, name, description, version, status, entrypoint, default_tier, manifest)
values (
  'visual-identity',
  'Visual Identity',
  'Generates 4 brand/visual identity variations (logomark + palette + type direction) from a natural-language brief. Use for templates identidade, poster, icones, ui.',
  '0.1.0',
  'active',
  'visual-identity',
  'M',
  '{"provider_kind":"image","inputs":["prompt","style","mood","template"],"outputs":"4 image artifacts + per-variation metadata"}'
)
on conflict (slug) do nothing;
