-- 0007 · Routing embeddings (semantic routing via pgvector)
create table if not exists public.routing_embeddings (
  id         uuid primary key default gen_random_uuid(),
  skill_slug text not null references public.skills (slug) on delete cascade,
  kind       text not null default 'skill_descriptor', -- skill_descriptor | template
  content    text not null,
  embedding  vector(1536) not null,
  created_at timestamptz not null default now()
);

-- Approximate nearest-neighbor over cosine distance.
create index if not exists routing_embeddings_hnsw
  on public.routing_embeddings
  using hnsw (embedding vector_cosine_ops);
