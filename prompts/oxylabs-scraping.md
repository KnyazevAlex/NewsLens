# Oxylabs Manual Scraping Implementation Prompt

## Goal

Implement the manual Oxylabs scrape-to-insert pipeline for Biasly. The feature must fetch active source homepages and article detail pages through the Oxylabs Web Scraper API, extract and validate genuine news articles, deduplicate them, append valid rows to Supabase, and return/log a useful run summary. Do not implement Oxylabs Scheduler, Vercel Cron, or AI analysis in this change.

## Skills and guidance read

- `GPT.md`
- `AGENTS.md`
- `.agents/skills/supabase/SKILL.md`
- Next.js 16.2.12 local Route Handlers guide at `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`
- Current Oxylabs official Web Scraper API Realtime and Universal Source documentation:
  - `https://developers.oxylabs.io/scraper-apis/web-scraper-api/integration-methods/realtime`
  - `https://developers.oxylabs.io/scraping-solutions/web-scraper-api/targets/generic-target`

The project-referenced `.agents/skills/oxylabs-web-scraper/SKILL.md` is not present in this checkout. Use the explicit requirements in `GPT.md` and the official live Oxylabs documentation instead. The current documented synchronous request is `POST https://realtime.oxylabs.io/v1/queries`, using HTTP Basic authentication and `{ "source": "universal", "url": "..." }`; raw HTML is returned in `results[].content`.

## Existing code inspected

- `package.json` and `package-lock.json`
- `tsconfig.json` and `.gitignore`
- `supabase/schema.sql` and `supabase/seed.sql`
- `lib/supabase/types.ts`
- `lib/supabase/server.ts`
- `lib/supabase/queries/articles.ts`
- `lib/supabase/queries/logs.ts`
- `memory.md`
- Existing application routes and components; there is currently no `app/api` directory or scraping code.

## Decisions and assumptions

- This change is manual scraping only. Do not create or modify schedule APIs, cron configuration, `oxylabs_schedules`, or `oxylabs_schedule_runs` behavior.
- Default a scrape request to every active source and at most 5 inserted articles per source. Allow an optional list of source IDs and an optional per-source limit in the request body, validated and capped to prevent accidental unbounded API spend.
- Add `GET /api/sources` so an operator can discover active source IDs and names before selecting a subset. The route is read-only and returns no secrets.
- The repository seed contains only inactive `.invalid` demo sources. Never turn those sources on or invent production source URLs. Runtime source selection must come from Supabase.
- Use Oxylabs' synchronous Realtime integration for both homepages and article pages. Use the `universal` source and request raw HTML. Keep Oxylabs access in a server-only module.
- Use Cheerio for deterministic HTML parsing and Zod for the action request body. Install both as exact package versions and update the lockfile.
- Start with a conservative generic parser driven by semantic article containers, metadata, JSON-LD, and article DOM. Preserve `parser_strategy` on the source model as an extension point, but do not invent source-specific selectors without real configured source requirements.
- Process sources and detail pages sequentially. This favors predictable Oxylabs usage and makes the per-source insertion limit exact.
- No database schema change is required. Continue using the existing service-role-only server client and existing RLS/privileges.

## Files likely to change

- `package.json`
- `package-lock.json`
- `.gitignore`
- `.env.example` (new and explicitly allowed through `.gitignore`)
- `lib/security/admin-secret.ts` (new)
- `lib/oxylabs/client.ts` (new)
- `lib/scraping/types.ts` (new)
- `lib/scraping/url.ts` (new)
- `lib/scraping/parser.ts` (new)
- `lib/scraping/pipeline.ts` (new)
- `lib/supabase/queries/scraping.ts` (new)
- `app/api/sources/route.ts` (new)
- `app/api/scrape/route.ts` (new)
- `memory.md`

The implementation may consolidate small modules if that produces a clearer result, but it must preserve the layer boundaries above.

## Implementation requirements

### Environment and Oxylabs client

- Document `OXY_WSA_USERNAME`, `OXY_WSA_PASSWORD`, and `BIASLY_ADMIN_SECRET` in `.env.example`, along with the existing server/client configuration keys without real values.
- Fail clearly when required server environment variables are absent. Never log credentials, Basic auth headers, service-role keys, or the admin secret.
- Implement a typed server-only Oxylabs client using the built-in `fetch` API, HTTP Basic auth, `Content-Type: application/json`, `cache: "no-store"`, and an explicit timeout suitable for the synchronous Realtime API.
- Treat non-2xx HTTP responses, malformed JSON, missing `results`, missing HTML content, and unsuccessful target status codes as typed/sanitized failures. Include target/source context in server logs without exposing credentials or full page contents.

### Source selection and API contracts

- `GET /api/sources` returns active sources from Supabase in a stable order, with only the fields an operator needs to select them.
- `POST /api/scrape` is the only scrape action route. It must require a valid `x-biasly-admin-secret` header and return `401` for a missing or invalid value.
- Accept an optional JSON body shaped like `{ "sourceIds": ["uuid"], "limitPerSource": 5 }`. An empty or omitted `sourceIds` means all active sources. Omitted `limitPerSource` means 5. Validate UUIDs, positive integers, and a conservative maximum (20 per source).
- A selected ID that is missing or inactive must not be scraped. Report unmatched selections in a clear `400` response rather than silently broadening to all sources.
- Keep the route handler thin: authentication, body validation, pipeline invocation, and safe JSON response/error mapping only.

### Homepage candidate extraction

- Fetch only each stored `sources.listing_url` as the homepage entry point. Do not crawl section/listing pages.
- Extract links from visible semantic story-card contexts (`article` and credible story/card containers), not from every anchor on the page. Ignore hidden elements, nav, menus, footer, and unrelated recommendation or utility blocks as far as static HTML permits.
- Resolve relative URLs against the stored homepage, strip fragments, normalize default ports and trailing-slash differences, and allow only HTTP(S) URLs.
- Keep candidates on the source's hostname (allowing ordinary `www` equivalence). Reject credential-bearing URLs, the homepage itself, file/download URLs, and paths matching the non-article reject list in `GPT.md`.
- Apply a conservative article-likeness test using date paths, article/story/news path markers, IDs, and sufficiently specific slugs. If uncertain, reject before spending an Oxylabs detail request.
- Deduplicate normalized candidates in memory and impose a bounded candidate budget per source so one homepage cannot trigger unlimited paid requests.

### Supabase dedupe and append-only writes

- Query existing `articles.original_url` and `articles.canonical_url` before detail scraping.
- Chunk every `.in()` URL existence filter to no more than 15 URLs, as required by `GPT.md`.
- After parsing a detail page, re-check both original and canonical URL before insert to handle canonical collisions and concurrent runs.
- Insert articles append-only. Do not update, delete, reset, or upsert article rows. Treat unique-constraint races as duplicates; surface other insert failures as article failures.
- Store the source reference, original and canonical URLs, title, description, required image URL, required published timestamp, cleaned raw text, categories, author, and scrape timestamp. Leave `analyzed_at` null.

### Detail parsing and content gate

- Parse JSON-LD (`NewsArticle`/`Article` variants), Open Graph/article metadata, `<link rel="canonical">`, semantic `<article>` markup, and common article-body attributes in a documented priority order.
- Extract one article-specific title, canonical URL, description, image URL, published date, author, categories, and body paragraphs. Resolve relative canonical/image URLs.
- Remove scripts, styles, templates, forms, SVG, ads, navigation, social/share UI, newsletter/subscription blocks, related-content modules, most-viewed modules, and repeated boilerplate before extracting text.
- Normalize whitespace and remove duplicate/low-information lines. Saved `raw_text` must be readable article prose separated into paragraphs, not a full-page text dump.
- Enforce the exact content gate from `GPT.md`: source reference, article-specific HTTP(S) URL and title, valid published date, valid image URL, clear single-subject article content, and either at least 3 meaningful paragraphs or at least 900 meaningful cleaned characters. One large paragraph may be split conservatively on article DOM blocks or sentence boundaries.
- Reject canonical URLs and titles that resolve to generic, category, section, topic, tag, author, search, show/program/podcast, live, game, product/review/shopping, corporate/support, newsletter/subscription, or video-only pages without full article prose.
- Use explicit rejection-reason identifiers so summary counts are actionable.

### Logging and summary

- Log concise progress to the server console: run start, selected sources, per-source start, homepage fetched, candidates found/rejected, duplicates skipped, detail pages scraped, inserts, validation rejections, source errors, and run completion/failure.
- Persist corresponding operational entries in the existing `logs` table where useful. A logging insert failure should be reported to the console but must not abort the scrape pipeline.
- Return one typed summary with: status, sources checked, candidates found, candidates rejected, duplicates skipped, detail pages scraped, articles inserted, articles rejected, articles failed, total duration, and rejection reasons grouped by count. Include per-source summaries only if compact and useful.
- Define deterministic status semantics (`success`, `partial`, `failed`) and use an appropriate HTTP status for request/auth/config errors. A completed run with individual article/source failures may return a `partial` summary without leaking stack traces.

## Security requirements

- Keep Oxylabs credentials, Supabase service-role credentials, and `BIASLY_ADMIN_SECRET` server-only. Do not prefix them with `NEXT_PUBLIC_` or pass them to React components.
- Compare the admin header safely and reject unauthorized requests before parsing the body or accessing Supabase/Oxylabs.
- Only scrape stored active homepage URLs and candidate URLs derived from those pages on the same source hostname. This is both a cost control and an SSRF boundary.
- Bound body size through the small JSON contract, source count, per-source insert count, candidate count, response size assumptions, and request timeouts.
- Return sanitized client errors; detailed provider/database errors stay in server logs.
- Preserve the current RLS and least-privilege model. No browser-side Supabase writes and no new public table permissions.

## Acceptance criteria

- With valid environment variables and at least one real active source, an authorized `POST /api/scrape` fetches the stored homepage through Oxylabs, filters homepage story links, fetches eligible detail pages through Oxylabs, inserts only articles passing the content gate, and returns the required summary.
- Missing/wrong `x-biasly-admin-secret` returns `401` and causes no provider or database work.
- Omitting the request body scrapes all active sources with a limit of 5 insertions per source.
- Explicit source selection never falls back to all sources when IDs are invalid, inactive, or unmatched.
- Existing original/canonical URLs are skipped using URL queries chunked to 15 or fewer values.
- Re-running the same source is append-only and does not duplicate or modify existing articles.
- Invalid listing/category pages, missing-date/image pages, and boilerplate-heavy pages are rejected with counted reasons.
- No scheduler, scheduled-result, cron, or analysis route/configuration is added.
- `npm run typecheck`, `npm run lint`, and `npm run build` pass.
- `memory.md` records the completed feature, files changed, and the reasoning behind the implementation.

## Checks to run

From the project root:

```powershell
npm run typecheck
npm run lint
npm run build
```

If `typecheck` is still absent from `package.json`, add the standard `"typecheck": "tsc --noEmit"` script as part of implementation before running the checks.

## Exact manual test steps expected after implementation

1. Add real values for `OXY_WSA_USERNAME`, `OXY_WSA_PASSWORD`, and `BIASLY_ADMIN_SECRET` to `.env.local`.
2. Confirm Supabase has at least one real active source with a production `listing_url`; leave demo `.invalid` sources inactive.
3. Start the app and watch its terminal for scrape progress:

```powershell
npm run dev
```

4. List selectable sources:

```powershell
curl.exe http://localhost:3000/api/sources
```

5. Scrape all active sources with the default limit:

```powershell
curl.exe -X POST http://localhost:3000/api/scrape -H "Content-Type: application/json" -H "x-biasly-admin-secret: YOUR_LOCAL_ADMIN_SECRET" -d "{}"
```

6. Scrape selected sources with an explicit limit:

```powershell
curl.exe -X POST http://localhost:3000/api/scrape -H "Content-Type: application/json" -H "x-biasly-admin-secret: YOUR_LOCAL_ADMIN_SECRET" -d '{"sourceIds":["ACTIVE_SOURCE_UUID"],"limitPerSource":2}'
```

7. Verify auth rejection:

```powershell
curl.exe -i -X POST http://localhost:3000/api/scrape -H "Content-Type: application/json" -d "{}"
```

8. Run the same authorized scrape a second time and confirm existing URLs increase `duplicatesSkipped` rather than creating duplicate rows.
9. Inspect `articles` and `logs` in Supabase to confirm append-only inserts, cleaned article text, required metadata, and operational log entries.
