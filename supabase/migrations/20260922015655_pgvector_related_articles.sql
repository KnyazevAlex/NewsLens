create extension if not exists vector with schema extensions;

alter table public.article_analyses
  add column if not exists embedding extensions.vector(1536);

-- IVFFlat lists are tuned for the current small corpus; revisit this value as article volume grows.
create index if not exists article_analyses_embedding_cosine_idx
  on public.article_analyses using ivfflat (embedding extensions.vector_cosine_ops) with (lists = 10);

create or replace function public.get_related_articles(
  query_article_id uuid,
  query_embedding extensions.vector(1536)
)
returns table (
  article_id uuid,
  title text,
  description text,
  image_url text,
  published_at timestamptz,
  source_name text,
  source_logo_url text,
  similarity double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    article.id,
    article.title,
    article.description,
    article.image_url,
    article.published_at,
    source.name,
    source.logo_url,
    1 - (analysis.embedding <=> query_embedding) as similarity
  from public.article_analyses as analysis
  join public.articles as article on article.id = analysis.article_id
  join public.sources as source on source.id = article.source_id
  where analysis.article_id <> query_article_id
    and analysis.embedding is not null
    and article.analyzed_at is not null
  order by analysis.embedding <=> query_embedding asc
  limit 5;
$$;

revoke all on function public.get_related_articles(uuid, extensions.vector) from public, anon, authenticated;
grant execute on function public.get_related_articles(uuid, extensions.vector) to service_role;
