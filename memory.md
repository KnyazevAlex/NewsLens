## [8/8/2026] - Implemented NewsLens Core Design System

*   **Files Changed:** `app/globals.css`, `app/layout.tsx`
*   **Features Added:** 
    *   Configured Tailwind CSS v4 `@theme` block with complete NewsLens color palette (Primary, Semantic, Bias Rating, Neutrals).
    *   Replaced default Next.js Geist font with **Inter** via `next/font/google`.
    *   Updated application metadata (Title/Description) to match product specs.
*   **Approach & Why:** Utilized Tailwind v4's native CSS variable injection instead of a `tailwind.config.ts` file to minimize configuration overhead. Standardized the 8px spacing and typography scales using Tailwind's default utility classes which naturally align perfectly with the `Core Design.jpg` specs (e.g., `text-2xl` = 24px, `rounded-md` = 8px).

## Implemented NewsLens Component System & Design Gallery

* **Files Created/Changed:**
  * `components/bias-badge.tsx`
  * `components/bias-rating.tsx`
  * `components/news-card.tsx`
  * `app/design-system/page.tsx`
* **Features Added:**
  * Added `shadcn/ui` core primitives via Base UI.
  * Implemented `BiasBadge` for left/neutral/right/mixed framing tags.
  * Implemented linear `BiasRatingIndicator` mapping normalized bias positions (-100 to 100).
  * Built primary list view `NewsCard` component with source metadata, category tags, and inline bias ratings.
  * Created `/design-system` mock gallery page displaying buttons, inputs, controls, badges, and icon sets matching Core Design.jpg.
* **Approach & Why:** Leveraged standard Lucide React icons and customized CVA badges to match exact color tokens. Built modular components to keep layout code clean and re-usable across homepage news feeds.

## Theme Bug Fix & Animation Implementation

* **Files Created/Changed:**
  * `app/globals.css`
  * `app/design-system/page.tsx`
* **Features Added:**
  * Fixed text legibility issues by removing the `@media (prefers-color-scheme: dark)` query to enforce the intended light theme design.
  * Installed `motion` package.
  * Converted design system page layout elements to `motion.section` and added staggered spring animations for page load.

  ## Assembled NewsLens Homepage Layout

* **Files Created/Changed:**
  * `app/page.tsx`
* **Features Added:**
  * Constructed the full dashboard layout matching `Home Page_2.png`.
  * Integrated a static left sidebar with navigation, user profile, and plan usage widgets.
  * Built a sticky top header with a search input and user controls.
  * Assembled the central news feed grid utilizing `motion/react` for staggered entrance animations.
  * Added the right sidebar containing the "Bias Balance" donut chart mock and the "Latest Logs" activity feed.
* **Approach & Why:** Combined the custom components into a unified grid layout using mock data as requested, adhering strictly to Tailwind CSS styling and the project's visual design.

## Implemented News Details Dynamic Route & Mock Data Integration

* **Files Created/Changed:**
  * `data/mock-news.ts`
  * `app/news/[id]/page.tsx`
  * `app/page.tsx`
* **Features Added:**
  * Extracted mock data into a shared TypeScript data file.
  * Implemented Next.js dynamic route `app/news/[id]/page.tsx` matching `image_4e63bf.jpg`.
  * Added Bias Rating widget, Bias Distribution breakdown, Key Points list, Sources citations, and Article Details metadata sidebar.
  * Connected homepage news cards to navigate directly to individual article detail pages.

## Clerk Implemented

  CREATED  proxy.ts
│    MODIFIED app/layout.tsx — Add ClerkProvider import and wrap body contents
│    CREATED  app/sign-in/[[...sign-in]]/page.tsx
│    CREATED  app/sign-up/[[...sign-up]]/page.tsx
│    MODIFIED  .env.local — Add sign-in/sign-up route env vars

Clerk Implementatation not fully finished yet!

# Added dedicated componenents

Such as: 

* `left-side-bar.tsx`
* `header.tsx`
* `news-grid.tsx`
* `bias-widget.tsx`
* `latest-logs.tsx`

In order to debloat pages and make populating components with real data and removing mock data easier.

## [8/17/2026] - Implemented Supabase Persistence

* **Files Created/Changed:** `supabase/schema.sql`, `supabase/seed.sql`, `lib/supabase/types.ts`, `lib/supabase/server.ts`, `lib/supabase/queries/articles.ts`, `lib/supabase/queries/logs.ts`, `app/page.tsx`, `app/news/[id]/page.tsx`, `app/customComponents/news-grid.tsx`, `app/customComponents/bias-widget.tsx`, `app/customComponents/latest-logs.tsx`; removed the unused `app/data/data/mock-news.ts` fixture.
* **Features Added:** Created the six core Supabase tables with constraints, indexes, RLS, and least-privilege grants; added idempotent demo seed data; added a typed server-only service-role client and query layer; replaced homepage and article-detail mock reads with live persisted articles, analyses, aggregate framing metrics, and logs.
* **Approach & Why:** Kept Clerk as the only authentication provider and all Supabase access server-side. Browser roles have no table privileges, while request-time rendering keeps database content current. Demo sources are inactive and use `.invalid` URLs so seeded UI content can never be mistaken for production scraping configuration.
* **Remote State:** Applied the `initial_biasly_persistence` migration and seed to the NewsLens Supabase project. Verified 6 sources, 6 articles, 2 analyses, and 3 logs; all six tables have RLS enabled, service-role reads succeed, and publishable-key article reads are denied.

## [9/8/2026] - Implemented Manual Oxylabs Scraping

* **Files Created/Changed:** Added the server-only Oxylabs client, scraping URL/parser/pipeline modules, Supabase scraping queries, admin-secret guard, `GET /api/sources`, and `POST /api/scrape`; added `.env.example`; updated `.gitignore`, `package.json`, and `package-lock.json` for exact Cheerio/Zod dependencies and a typecheck script.
* **Features Added:** Manual scraping now loads active Supabase sources, fetches homepages and article details through Oxylabs Realtime, conservatively filters story URLs, validates required article metadata and meaningful prose, checks original/canonical URL duplicates in chunks, inserts append-only article rows, and emits console/database logs plus a typed run summary.
* **Approach & Why:** Kept provider, parsing, persistence, pipeline, security, and HTTP layers separate. Source URLs remain database-driven, action access is protected by a server-only admin secret, and bounded sequential requests reduce accidental Oxylabs spend. Scheduling, cron, and AI analysis were intentionally left out of this change.

## [9/16/2026] - Implemented Gemini AI Analysis and UI Framing

* **Files Created/Changed:** Added `lib/ai/article-analysis.ts`, `lib/ai/types.ts`, `lib/analysis/pipeline.ts`, `lib/supabase/queries/analysis.ts`, `app/api/analyze/route.ts`, `app/customComponents/framing-distribution.tsx`, and `.env.example`; updated article queries, framing badges, homepage cards, the news detail page, package dependencies, and `prompts/ai-analysis.md`.
* **Features Added:** Added protected, batched `POST /api/analyze` processing for all articles missing an analysis row; Gemini structured-output generation with Zod and semantic validation, one retry, derived bias scores, safe logging, and post-save `analyzed_at`; added sentiment, AI-estimated framing badges, confidence, and accessible left/center/right distributions to cards and details.
* **Approach & Why:** Used the direct Gemini Developer API through pinned Vercel AI SDK packages with server-only credentials. Runtime verification showed `gemini-2.5-flash` is unavailable to new accounts, so the default is the stable, structured-output-capable free-tier `gemini-3.6-flash`, with `GEMINI_MODEL` available as an override. Pending work is detected from the left-joined `article_analyses` relationship rather than `analyzed_at`.
* **Verification:** `npm run typecheck`, `npm run lint`, and `npm run build` completed without errors. A bounded live run analyzed and saved one pending article, and browser verification confirmed its homepage card displayed sentiment, confidence, and a 45/35/20 framing distribution. The protected detail route redirected an unauthenticated browser to Clerk as expected.

## [9/21/2026] - Implemented pgvector Related Articles

* **Files Created/Changed:** Added the generated `supabase/migrations/20260922015655_pgvector_related_articles.sql` migration and updated `supabase/schema.sql`, Supabase types/query helpers, the Gemini analysis pipeline, the article detail page, `.env.example`, and `prompts/pgvector-related-articles.md`.
* **Features Added:** Added nullable 1536-dimensional pgvector embeddings, an IVFFlat cosine index, and a service-role-only `get_related_articles` RPC. The analysis endpoint now creates Gemini `gemini-embedding-2` vectors for new analyses and backfills missing vectors without rerunning Gemini framing analysis. Eligible article details display up to five cosine-similar articles.
* **Approach & Why:** Reused the existing server-only Gemini key and AI SDK Google provider, requested 1536 dimensions, and normalized vector values returned by PostgREST before use. The RPC performs filtering/ranking in Postgres because the REST client cannot directly issue pgvector cosine-distance operators. The current article is excluded and only analyzed, embedded rows can match.
* **Verification:** `npm run typecheck`, `npm run lint`, and network-enabled `npm run build` passed. The migration was generated locally but still needs to be applied to the target Supabase project before live database/API verification.
