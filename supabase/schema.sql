-- Biasly initial persistence schema.
-- Run this file in the Supabase SQL Editor before supabase/seed.sql.

create extension if not exists pgcrypto;
create extension if not exists vector with schema extensions;

create table if not exists public.sources (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  listing_url text not null unique,
  parser_strategy text,
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sources_name_not_blank check (btrim(name) <> ''),
  constraint sources_listing_url_not_blank check (btrim(listing_url) <> '')
);

create table if not exists public.articles (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.sources(id) on delete restrict,
  original_url text not null unique,
  canonical_url text unique,
  title text not null,
  description text,
  image_url text not null,
  published_at timestamptz not null,
  raw_text text not null,
  categories text[] not null default '{}',
  region text,
  author text,
  scraped_at timestamptz not null default now(),
  analyzed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint articles_original_url_not_blank check (btrim(original_url) <> ''),
  constraint articles_title_not_blank check (btrim(title) <> ''),
  constraint articles_image_url_not_blank check (btrim(image_url) <> ''),
  constraint articles_raw_text_not_blank check (btrim(raw_text) <> '')
);

create table if not exists public.article_analyses (
  id uuid primary key default gen_random_uuid(),
  article_id uuid not null unique references public.articles(id) on delete cascade,
  summary text not null,
  sentiment_score numeric(4, 3) not null,
  sentiment_label text not null,
  bias_score numeric(4, 3) not null,
  bias_label text not null,
  left_percentage smallint not null,
  center_percentage smallint not null,
  right_percentage smallint not null,
  confidence numeric(4, 3) not null,
  framing_notes text[] not null default '{}',
  loaded_terms text[] not null default '{}',
  disclaimer text not null,
  model text not null,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint article_analyses_summary_not_blank check (btrim(summary) <> ''),
  constraint article_analyses_sentiment_score_range check (sentiment_score between -1 and 1),
  constraint article_analyses_sentiment_label_allowed check (sentiment_label in ('positive', 'neutral', 'negative')),
  constraint article_analyses_bias_score_range check (bias_score between -1 and 1),
  constraint article_analyses_bias_label_allowed check (bias_label in ('left', 'center', 'right', 'mixed', 'unclear')),
  constraint article_analyses_left_percentage_range check (left_percentage between 0 and 100),
  constraint article_analyses_center_percentage_range check (center_percentage between 0 and 100),
  constraint article_analyses_right_percentage_range check (right_percentage between 0 and 100),
  constraint article_analyses_percentages_total check (left_percentage + center_percentage + right_percentage = 100),
  constraint article_analyses_confidence_range check (confidence between 0 and 1),
  constraint article_analyses_disclaimer_not_blank check (btrim(disclaimer) <> ''),
  constraint article_analyses_model_not_blank check (btrim(model) <> '')
);

create table if not exists public.logs (
  id uuid primary key default gen_random_uuid(),
  level text not null default 'info',
  event text not null,
  message text not null,
  metadata jsonb not null default '{}'::jsonb,
  source_id uuid references public.sources(id) on delete set null,
  article_id uuid references public.articles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint logs_level_allowed check (level in ('debug', 'info', 'warning', 'error', 'success')),
  constraint logs_event_not_blank check (btrim(event) <> ''),
  constraint logs_message_not_blank check (btrim(message) <> '')
);

create table if not exists public.oxylabs_schedules (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null unique references public.sources(id) on delete cascade,
  oxylabs_schedule_id text unique,
  status text not null default 'pending',
  is_active boolean not null default true,
  schedule_expression text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint oxylabs_schedules_status_allowed check (status in ('pending', 'active', 'paused', 'error', 'deleted'))
);

create table if not exists public.oxylabs_schedule_runs (
  id uuid primary key default gen_random_uuid(),
  schedule_id uuid not null references public.oxylabs_schedules(id) on delete cascade,
  oxylabs_run_id text unique,
  result_status text not null default 'pending',
  summary jsonb not null default '{}'::jsonb,
  error_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  constraint oxylabs_schedule_runs_status_allowed check (result_status in ('pending', 'running', 'done', 'failed', 'cancelled')),
  constraint oxylabs_schedule_runs_time_order check (completed_at is null or started_at is null or completed_at >= started_at)
);

create index if not exists articles_source_id_idx on public.articles (source_id);
create index if not exists articles_published_at_idx on public.articles (published_at desc);
create index if not exists articles_pending_analysis_idx on public.articles (published_at desc) where analyzed_at is null;
create index if not exists article_analyses_bias_label_idx on public.article_analyses (bias_label);
-- IVFFlat lists are tuned for the current small corpus; revisit this value as article volume grows.
create index if not exists article_analyses_embedding_cosine_idx
  on public.article_analyses using ivfflat (embedding extensions.vector_cosine_ops) with (lists = 10);
create index if not exists logs_source_id_idx on public.logs (source_id);
create index if not exists logs_article_id_idx on public.logs (article_id);
create index if not exists logs_created_at_idx on public.logs (created_at desc);
create index if not exists sources_active_idx on public.sources (name) where is_active;
create index if not exists oxylabs_schedules_active_idx on public.oxylabs_schedules (source_id) where is_active;
create index if not exists oxylabs_schedule_runs_schedule_id_created_at_idx
  on public.oxylabs_schedule_runs (schedule_id, created_at desc);

alter table public.sources enable row level security;
alter table public.articles enable row level security;
alter table public.article_analyses enable row level security;
alter table public.logs enable row level security;
alter table public.oxylabs_schedules enable row level security;
alter table public.oxylabs_schedule_runs enable row level security;

revoke all on table public.sources from anon, authenticated;
revoke all on table public.articles from anon, authenticated;
revoke all on table public.article_analyses from anon, authenticated;
revoke all on table public.logs from anon, authenticated;
revoke all on table public.oxylabs_schedules from anon, authenticated;
revoke all on table public.oxylabs_schedule_runs from anon, authenticated;

grant usage on schema public to service_role;
grant select, insert, update on table public.sources to service_role;
grant select, insert, update on table public.articles to service_role;
grant select, insert, update on table public.article_analyses to service_role;
grant select, insert on table public.logs to service_role;
grant select, insert, update on table public.oxylabs_schedules to service_role;
grant select, insert, update on table public.oxylabs_schedule_runs to service_role;

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
