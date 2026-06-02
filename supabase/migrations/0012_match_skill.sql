-- 0012 · Semantic routing query. Accepts the embedding as a text literal
-- ('[v1,v2,...]') and casts to vector inside, so it's robust over PostgREST RPC.
-- Returns empty when no routing embeddings are seeded → the router falls back to
-- the single active skill.
create or replace function public.match_skill(query_embedding text, match_count int default 1)
returns table(skill_slug text, score double precision)
language sql
stable
security definer
set search_path = public
as $$
  select re.skill_slug, 1 - (re.embedding <=> query_embedding::vector) as score
  from public.routing_embeddings re
  order by re.embedding <=> query_embedding::vector
  limit match_count;
$$;

revoke execute on function public.match_skill(text, int) from anon, authenticated;
