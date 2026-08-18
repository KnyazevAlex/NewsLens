# Supabase Persistence Implementation

## Goal

Implement the initial Supabase persistence layer for Biasly so Supabase becomes the source of truth for news content, analyses, operational logs, and scheduler state. Replace homepage and news-details mock-data reads with typed server-side Supabase queries while preserving Clerk authentication and the existing visual design. Seed the new database with demo content derived from the application's existing mock records so the first page load is populated.

This phase establishes database persistence only. It does not implement scraping, Oxylabs Scheduler API calls, AI generation, embeddings, pgvector related-article search, or Supabase Auth.

## Skills read

- Project skill: `.agents/skills/supabase/SKILL.md`
- Installed Supabase skill: `C:/Users/Jxkso/.codex/plugins/cache/openai-curated-remote/supabase/1.0.0/skills/supabase/SKILL.md`
- Current Supabase changelog, including breaking-change entries relevant as of 2026-08-17
- Current Supabase Data API security, RLS, JavaScript client initialization, and API key guidance
- Next.js 16.2 local documentation for Server/Client Components, data fetching, error handling, dynamic routes, and environment variables

## Existing code inspected

- `GPT.md`
- `AGENTS.md`
- `package.json` and `package-lock.json`
- `app/page.tsx`
- `app/news/[id]/page.tsx`
- `app/data/data/mock-news.ts`
- `app/customComponents/news-grid.tsx`
- `app/customComponents/bias-widget.tsx`
- `app/customComponents/latest-logs.tsx`
- `app/layout.tsx`
- `proxy.ts`
- `memory.md`
- `tsconfig.json`

## Decisions and assumptions

- Keep Clerk as the sole authentication provider. Do not add Supabase Auth or Supabase session cookies.
- Use a server-only Supabase client backed by `SUPABASE_SERVICE_ROLE_KEY` for trusted application reads and future pipeline writes. Never import that client into Client Components.
- Use the environment variable names already present in the project without reading, creating, editing, renaming, or documenting any `.env*` file.
- Create `supabase/schema.sql` as the checked-in source of truth because this repository has no existing Supabase CLI project, `config.toml`, declarative schema directory, or migration history.
- Create all six core tables from `GPT.md`: `sources`, `articles`, `article_analyses`, `logs`, `oxylabs_schedules`, and `oxylabs_schedule_runs`.
- Exclude the `embedding vector(1536)` column and related-article RPC/index in this phase, as `GPT.md` explicitly defers pgvector until AI analysis works.
- Enable RLS on every public table. Revoke access from `anon` and `authenticated`; grant the service role only the privileges needed by the server-side app. No permissive public policies are required because the browser will not query the Data API directly.
- Use UUID primary keys, foreign keys, explicit constraints, timestamps, and indexes. Enforce unique article URLs, one analysis per article, valid score ranges, valid enum-like labels, and framing percentages that sum to 100.
- Preserve existing UI structure. Convert `app/page.tsx` back to a Server Component for database reads and pass serializable display models into the animated Client Components.
- The homepage should show recent persisted articles, optional analysis, latest persisted logs, and aggregate bias data derived from stored analyses. Empty databases receive purposeful empty states, never mock fallbacks.
- The protected details route keeps `await auth.protect()`, looks up the requested UUID, calls `notFound()` for a missing record, and renders stored article/analysis fields. The Related Articles section remains hidden until pgvector is implemented.
- Database errors should retain useful server-side context and fail through Next.js error handling; they must not silently substitute mock content.
- Add an idempotent `supabase/seed.sql` derived from the current in-repository mock content. Seeded source rows must be inactive demo sources so later scraping cannot accidentally treat placeholder configuration as production input.
- Because the mock records do not contain genuine source listing URLs or original article URLs, use clearly non-routable `.invalid` demo URLs for required URL columns. Do not invent or imply real production source configuration.
- Give seed rows deterministic UUIDs and use `ON CONFLICT` behavior so the seed can be rerun without duplicates.
- Seed six sources and the six homepage article cards currently represented in `news-grid.tsx`. Seed richer article text and analysis where the existing mock detail data supports it. Normalize any legacy mock framing percentages that do not sum to 100 so seeded rows satisfy database constraints, and do not fabricate missing AI analysis for records that lack it.
- Do not overwrite unrelated working-tree changes. Adapt the currently modified page/auth files in place.

## Files likely to change

- Create `supabase/schema.sql`
- Create `supabase/seed.sql`
- Create `lib/supabase/types.ts`
- Create `lib/supabase/server.ts`
- Create `lib/supabase/queries/articles.ts`
- Create `lib/supabase/queries/logs.ts`
- Modify `app/page.tsx`
- Modify `app/news/[id]/page.tsx`
- Modify `app/customComponents/news-grid.tsx`
- Modify `app/customComponents/bias-widget.tsx`
- Modify `app/customComponents/latest-logs.tsx`
- Modify `memory.md` after implementation and validation
- Remove `app/data/data/mock-news.ts` only if no imports remain; otherwise leave it untouched and unused

## Implementation requirements

### Database schema

- Add `sources` with name, listing URL, optional parser strategy/logo URL, active state, and timestamps.
- Add append-only `articles` linked to sources with original URL, optional canonical URL, title, required image URL, required published timestamp, raw article text, optional metadata fields needed by the current UI, scrape timestamp, analyzed timestamp, and timestamps.
- Add one-to-one `article_analyses` with summary, sentiment score/label, bias score/label, left/center/right percentages, confidence, framing notes, loaded terms, disclaimer, model, and timestamps.
- Add `logs` with level, event, message, structured metadata, optional source/article references, and creation timestamp.
- Add `oxylabs_schedules` and `oxylabs_schedule_runs` with the identifiers, statuses, summary/error payloads, timestamps, and source relationships needed by later scheduler work.
- Add check constraints for score ranges and allowed labels. Require left + center + right = 100 for completed analyses.
- Add indexes for recent articles/logs, source lookups, analysis labels, pending analysis support, and scheduler lookups.
- Enable RLS on every table and use explicit grants/revokes consistent with a service-role-only server data layer.
- Make schema application idempotent where practical so it can be safely reviewed and rerun during initial setup.

### Seed data

- Add a separate, reviewable `supabase/seed.sql` that inserts the existing demo sources and articles after the schema is applied.
- Insert deterministic source and article UUIDs so seeded article links remain stable across reruns.
- Mark every seeded source inactive and identify its parser strategy as demo data.
- Use `.invalid` listing/original/canonical URLs where the current mock data has no genuine URL, ensuring these values can never be mistaken for scrapeable production endpoints.
- Reuse the existing titles, descriptions, article text, categories, regions, images, publication metadata, and available bias values instead of creating a new fictional dataset.
- Seed valid `article_analyses` only where the existing detailed mocks provide adequate analysis fields. Adjust invalid legacy percentage totals to a valid 100-point distribution while preserving the displayed dominant framing.
- Seed a small set of demo `logs` so the Latest Logs widget is populated on first load.
- Use upserts or conflict-safe inserts so rerunning the seed does not duplicate or overwrite unrelated user-created rows.

### Typed Supabase layer

- Define generated-style `Database`, row, insert, update, JSON, relationship, and convenient joined-result types without `any`.
- Create one server-only client factory using `createClient<Database>()`, strict environment validation, disabled session persistence/refresh, and the service-role key.
- Keep all query modules server-only.
- Implement typed queries for recent articles with source and optional analysis, article details by ID, recent logs, and bias aggregate inputs.
- Map raw PostgREST join shapes to stable serializable UI models in the query layer rather than coupling components to generated database row shapes.
- Avoid joined-table filters and apply any such filtering in TypeScript, per the project Supabase rule.

### UI integration

- Fetch homepage datasets concurrently on the server.
- Change `NewsGrid`, `BiasWidget`, and `LatestLogs` to accept typed data props and retain their existing animations/styles.
- Add clear empty states for zero articles, analyses, or logs.
- Format timestamps consistently and compute read time from stored article text when needed.
- Render safe text only. Treat source/article URLs as data, not HTML.
- Replace details-page mock lookup with the typed Supabase query and preserve Clerk protection.
- Render the complete stored analysis: summary, sentiment, AI-estimated framing label, percentages, confidence, framing notes, loaded terms, and disclaimer.
- Clearly label political framing as AI-estimated.
- Hide unavailable optional sections instead of inventing values.

### Documentation

- Do not touch `.env.local`, `.env.example`, or any other environment file. All required keys are already configured.
- Record implemented files, features, and architectural rationale in `memory.md` after the work is complete.

## Security requirements

- Never expose `SUPABASE_SERVICE_ROLE_KEY` in a `NEXT_PUBLIC_*` variable, Client Component, rendered prop, log, error message, or committed file.
- Add `import "server-only"` to privileged client/query modules.
- Enable RLS for every table in the exposed `public` schema even though service role bypasses RLS.
- Revoke `anon` and `authenticated` table access for this server-only phase; do not add blanket read/write policies.
- Avoid `SECURITY DEFINER` functions and public RPCs.
- Do not make authorization decisions from Supabase user metadata. Clerk remains responsible for route authentication.
- Preserve append-only article behavior at the schema/query layer; this phase adds no article update/delete UI.

## Acceptance criteria

- The repository contains a complete reviewable initial schema for all six required tables.
- The repository contains an idempotent seed script derived from the existing mock content, and a freshly seeded database produces a populated homepage.
- Supabase client setup is typed, server-only, and validates configuration without leaking secrets.
- Homepage and details pages no longer import or read mock news data.
- Homepage renders persisted articles, bias aggregates, and logs or clear empty states.
- `/news/[id]` remains Clerk-protected, renders a persisted article and its optional analysis, and returns 404 for unknown IDs.
- Every exposed table has RLS enabled and no client role receives unintended access.
- No Supabase Auth code is added.
- No pgvector/embedding implementation is added prematurely.
- No environment file is changed.
- TypeScript and lint checks pass, and the production build passes unless blocked solely by unavailable external credentials/network.

## Checks to run

1. `npm run typecheck` if a typecheck script is added; otherwise `npx tsc --noEmit`.
2. `npm run lint`.
3. `npm run build`.
4. Inspect `git diff --check` and `git diff --stat`.
5. After the user applies `supabase/schema.sql` to the configured project, run a real read-only query against each core table through the server client and report the result.
6. Review RLS/grants in the Supabase dashboard or with SQL catalog queries before considering database setup complete.

## Exact manual test steps expected after implementation

1. Open Supabase Dashboard, select the configured project, open SQL Editor, paste `supabase/schema.sql`, and run it.
2. In SQL Editor, paste `supabase/seed.sql` and run it twice; confirm the second run creates no duplicates.
3. Confirm the six tables exist, RLS is enabled on each, demo sources are inactive, and seeded rows are present.
4. Run `npm run dev` from the project root.
5. Visit `/` and verify the seeded articles, bias values, and logs appear immediately from Supabase.
6. Sign in with Clerk, open a seeded `/news/<article-uuid>` link, and verify the stored article and available analysis render.
7. Open `/news/00000000-0000-0000-0000-000000000000` while signed in and verify the route returns the Next.js not-found UI.
