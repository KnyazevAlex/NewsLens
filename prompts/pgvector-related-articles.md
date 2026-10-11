# pgvector and Related Articles Implementation Prompt

## Goal

Implement section 20 of `GPT.md`: persist Gemini `gemini-embedding-2` embeddings on article analyses and show up to five cosine-similar analyzed articles on each eligible news detail page.

## Skills and documentation read

- `AGENTS.md`, `GPT.md` section 20, and `.agents/skills/supabase/SKILL.md`.
- Installed Supabase PostgreSQL best-practices guidance.
- Current official Supabase pgvector, vector-column, vector-index, semantic-search documentation, and changelog.

The `.agents/skills/ai-sdk` path named by `GPT.md` is absent. Existing pinned Vercel AI SDK patterns in `lib/ai/article-analysis.ts` are the implementation baseline.

## Existing code inspected

- `supabase/schema.sql`, `supabase/config.toml`, and `lib/supabase/types.ts`
- `lib/supabase/server.ts`, `lib/supabase/queries/analysis.ts`, and `lib/supabase/queries/articles.ts`
- `lib/analysis/pipeline.ts`, `lib/ai/article-analysis.ts`, and `lib/ai/types.ts`
- `app/api/analyze/route.ts`, `app/news/[id]/page.tsx`, `.env.example`, and `memory.md`

## Decisions and assumptions

- Use Gemini `gemini-embedding-2`, the current stable Gemini embedding model. Request its recommended 1536 output dimensions, so the nullable column is `extensions.vector(1536)`. Gemini normalizes reduced-dimension vectors, making cosine distance a suitable metric.
- Store vectors only on the existing one-to-one `article_analyses` row; never serialize them to the client.
- Section 20 explicitly requires an IVFFlat cosine index, so use `vector_cosine_ops` and direct `embedding <=> query_embedding` ordering.
- PostgREST cannot issue pgvector distance operations directly. Create a typed, server-only RPC named `get_related_articles`; query code calls it using the service-role client.
- The SQL RPC is `stable security invoker`, accepts current article ID plus a vector, joins analyses/articles/sources, excludes self and null embeddings, requires `articles.analyzed_at IS NOT NULL`, orders by cosine distance, caps at five, and has execute revoked from `PUBLIC`, `anon`, and `authenticated`, then granted only to `service_role`.
- The installed `ai@6` and `@ai-sdk/google@4` packages already support `google.embedding("gemini-embedding-2")`; use `embed` with the existing server-only `GEMINI_API_KEY`. Pass the provider's supported 1536 output-dimension option and verify the returned vector length before saving. No OpenAI dependency or `OPENAI_API_KEY` is needed.
- Generate a bounded normalized embedding payload from title, neutral summary, and raw article text. Every article uses the same model and source structure.
- Pending work means either no analysis row or an analysis row whose embedding is null. Full candidates receive Gemini analysis plus embedding. Existing analysis rows missing vectors receive an embedding-only backfill—never another Gemini call.
- For new analyses, update `analyzed_at` only after analysis persistence and embedding storage both succeed. Backfills preserve their historical timestamp.
- The server-rendered detail page calls `getRelatedArticles(articleId, embedding)`. It displays no section when there is no current embedding or no match.

## Files likely to change

- `supabase/schema.sql`
- Generated migration created with `supabase migration new pgvector_related_articles`
- `lib/supabase/types.ts`
- `lib/ai/article-analysis.ts`, `lib/ai/types.ts`, and `lib/analysis/pipeline.ts`
- `lib/supabase/queries/analysis.ts` and `lib/supabase/queries/articles.ts`
- `app/news/[id]/page.tsx`
- `.env.example`, `memory.md`
- `package.json` and `package-lock.json` only if `@ai-sdk/openai` is absent.

## Implementation requirements

### Database

- Enable `vector` idempotently in the `extensions` schema.
- Add nullable `embedding extensions.vector(1536)` on `public.article_analyses`.
- Create the required IVFFlat cosine index using an explicitly documented, modest list count suitable for the small current corpus.
- Add `public.get_related_articles(query_article_id uuid, query_embedding extensions.vector(1536))`, returning only related-card fields: article ID, title, image URL, published date, source name/logo, description, and cosine-derived similarity.
- Use `language sql stable security invoker`, fully qualify objects, use direct distance ordering, and lock execution to `service_role`.
- Keep current RLS and table grants intact. Update database types for the vector column and RPC.

### Embedding pipeline

- Add a server-only Gemini embedding helper with explicit `GEMINI_API_KEY` configuration validation.
- Keep inputs bounded; never log raw text, prompts, vectors, secret values, or provider response bodies.
- Save embeddings in the analysis persistence flow. Detect missing analysis versus missing embedding through left-join relationship state without joined-table `.eq()` filtering.
- Backfill embeddings without rerunning `analyzeArticle`; isolate failures so remaining articles still process.
- Extend safe log events and run summary counters to distinguish full analyses from embedding backfills.

### Related Articles UI

- Add a server-only `getRelatedArticles(articleId, embedding)` query that calls the RPC and maps typed card data.
- Expose only a boolean/current server-side embedding availability to determine rendering; never pass a vector into a Client Component.
- Render a responsive, subordinate “Related Articles” section of up to five linked cards with image (when available), source, date, and readable similarity.
- Omit the section entirely for missing embedding or no matches; UI stays read-only.

## Security requirements

- `GEMINI_API_KEY`, service-role credentials, raw article text, embeddings, prompts, and provider errors remain server-only.
- Preserve the existing admin-secret guard on `POST /api/analyze`.
- Do not relax RLS/table access or expose the RPC to browser roles.

## Acceptance criteria

- The schema/types represent nullable 1536-dimensional embeddings and the service-role-only related-articles RPC.
- New analyses persist both Gemini output and a Gemini embedding before marking the article analyzed.
- Existing analysis rows with null embeddings are backfilled without a Gemini call.
- Related results exclude self, exclude unanalyzed/unembedded articles, use cosine distance, and never exceed five.
- Eligible details pages show related articles; ineligible pages show no empty section.
- Existing scraping and saved-analysis display behavior remains intact.

## Checks to run

```powershell
npm run typecheck
npm run lint
npm run build
git diff --check
supabase migration list --local
```

Verify the applied SQL:

```sql
select extname, extversion from pg_extension where extname = 'vector';
select column_name, udt_name from information_schema.columns
where table_schema = 'public' and table_name = 'article_analyses' and column_name = 'embedding';
```

## Exact manual test steps

1. Ensure the existing server-only `GEMINI_API_KEY` in `.env.local` is valid for both Gemini generation and embeddings; never commit it.
2. Apply the generated migration to Supabase.
3. Start `npm run dev`, then send one protected request:

```powershell
curl.exe -X POST http://localhost:3000/api/analyze `
  -H "Content-Type: application/json" `
  -H "x-biasly-admin-secret: YOUR_LOCAL_ADMIN_SECRET" `
  -d '{"limit":1,"batchSize":1}'
```

4. Confirm the analysis row gets a non-null embedding and the new analysis marks `analyzed_at` only after both writes.
5. Set an existing analysis row’s embedding to null, call the endpoint again, and verify an embedding-only backfill occurs without Gemini regeneration.
6. Execute the RPC with an article embedding; verify self exclusion, max-five limit, analyzed-only filtering, and ascending cosine distance.
7. Visit an embedded `/news/<id>` and confirm related links/details. Visit an unembedded article and confirm the section is absent.
8. Run all checks and inspect browser/server consoles for errors.
