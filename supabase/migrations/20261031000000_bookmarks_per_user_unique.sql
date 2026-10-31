-- Keep the dashboard-created bookmarks table and its rows, while making the
-- uniqueness boundary per Clerk user and stable article URL.
create table if not exists public.bookmarks (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  url text not null,
  title text not null,
  created_at timestamptz not null default now()
);

-- Remove a global URL-only unique constraint, if one exists. It prevents a
-- second user from saving an article that another user already bookmarked.
do $$
declare
  constraint_name text;
  index_name text;
begin
  for constraint_name in
    select constraint_record.conname
    from pg_constraint as constraint_record
    where constraint_record.conrelid = 'public.bookmarks'::regclass
      and constraint_record.contype = 'u'
      and (
        select array_agg(attribute_record.attname order by key_column.ordinality)
        from unnest(constraint_record.conkey) with ordinality as key_column(attnum, ordinality)
        join pg_attribute as attribute_record
          on attribute_record.attrelid = constraint_record.conrelid
         and attribute_record.attnum = key_column.attnum
      ) = array['url']::name[]
  loop
    execute format('alter table public.bookmarks drop constraint %I', constraint_name);
  end loop;

  for index_name in
    select index_record.indexrelid::regclass::text
    from pg_index as index_record
    join pg_attribute as attribute_record
      on attribute_record.attrelid = index_record.indrelid
     and attribute_record.attnum = index_record.indkey[0]
    where index_record.indrelid = 'public.bookmarks'::regclass
      and index_record.indisunique
      and not index_record.indisprimary
      and index_record.indnkeyatts = 1
      and attribute_record.attname = 'url'
      and not exists (
        select 1
        from pg_constraint as constraint_record
        where constraint_record.conindid = index_record.indexrelid
      )
  loop
    execute format('drop index %s', index_name);
  end loop;
end;
$$;

-- Older application versions stored local absolute detail URLs. Keep the same
-- article route but remove the machine-specific host before deduplicating.
update public.bookmarks
set url = regexp_replace(url, '^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?', '')
where url ~ '^https?://(localhost|127\.0\.0\.1)(:[0-9]+)?/news/';

-- Retain the oldest row when historical data already has same-user duplicates.
with duplicate_bookmarks as (
  select
    id,
    row_number() over (
      partition by user_id, url
      order by created_at asc, id asc
    ) as duplicate_number
  from public.bookmarks
)
delete from public.bookmarks as bookmark
using duplicate_bookmarks
where bookmark.id = duplicate_bookmarks.id
  and duplicate_bookmarks.duplicate_number > 1;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.bookmarks'::regclass
      and conname = 'bookmarks_user_id_url_key'
  ) then
    alter table public.bookmarks
      add constraint bookmarks_user_id_url_key unique (user_id, url);
  end if;
end;
$$;

alter table public.bookmarks enable row level security;

-- Keep local Supabase databases aligned with the already-confirmed dashboard
-- policy, without replacing any existing policy.
do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'bookmarks'
      and policyname = 'Everyone owns their own bookmarks'
  ) then
    create policy "Everyone owns their own bookmarks"
      on public.bookmarks
      as permissive
      for all
      to authenticated
      using ((select auth.jwt() ->> 'sub') = user_id)
      with check ((select auth.jwt() ->> 'sub') = user_id);
  end if;
end;
$$;
