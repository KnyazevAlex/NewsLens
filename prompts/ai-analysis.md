# AI Analysis and UI Framing Implementation Prompt

## Goal

Implement section 19 of `GPT.md`: analyze every valid article that does not have an `article_analyses` row, using the Gemini Developer API free tier through the Vercel AI SDK, persist validated results in Supabase, expose the protected `POST /api/analyze` action, and show the saved AI-estimated framing clearly on article cards and the news detail page.

This scope intentionally excludes section 20 (`pgvector`, embeddings, and related articles) and the scheduler/cron work.

## Skills and documentation read

- Project instructions: `AGENTS.md` and section 19 of `GPT.md`.
- Project Supabase skill: `.agents/skills/supabase/SKILL.md`.
- Installed guidance: Supabase, Vercel AI SDK, Next.js App Router, and shadcn/ui skills.
- Local Next.js 16.2 route-handler, Node runtime, and `maxDuration` documentation under `node_modules/next/dist/docs/`.
- Current official AI SDK Google provider documentation: `@ai-sdk/google`, custom API keys, and structured output support.
- Current official Google Gemini model, structured-output, and pricing documentation. Google documents `gemini-2.5-flash` as an active, low-latency model, and its pricing page lists a free tier. Gemini structured output supports only a subset of JSON Schema, so the output schema must stay simple and application validation remains required.
- Current Supabase changelog and JavaScript update documentation. The relevant current platform note is that Supabase client libraries require Node.js 22+ after June 30, 2026; no analysis-specific breaking change was found.

The project-local `.agents/skills/ai-sdk` directory named by `GPT.md` is not present. The installed Vercel AI SDK skill and official documentation are the fallback source of truth.

## Existing code inspected

- `package.json` and `package-lock.json`
- `.env.local` key names only (secret values were not read or exposed)
- `supabase/schema.sql`
- `lib/supabase/types.ts`
- `lib/supabase/server.ts`
- `lib/supabase/queries/articles.ts`
- `lib/supabase/queries/logs.ts`
- `lib/security/admin-secret.ts`
- `app/api/scrape/route.ts`
- `app/page.tsx`
- `app/news/[id]/page.tsx`
- `app/customComponents/news-grid.tsx`
- `app/customComponents/bias-badge.tsx`
- `app/customComponents/bias-rating.tsx`
- `app/customComponents/bias-widget.tsx`
- `app/globals.css`
- `memory.md`

## Current-state findings

- `article_analyses` already contains the complete section 19 schema, constraints, RLS posture, and service-role grants. No database migration is required.
- Server-side article queries already read and map full saved analysis data for the detail page.
- The detail page already shows summary, sentiment, framing distribution, confidence, framing notes, loaded terms, and disclaimer when analysis exists.
- Homepage cards currently show only an AI framing label and a scalar bias indicator; they do not yet show sentiment, left/center/right percentages, or confidence.
- `GEMINI_API_KEY` is already named in `.env.local`. Its value must remain server-only.
- Neither `ai` nor `@ai-sdk/google` is installed.
- `.env.example` is absent even though prior project memory says it was created, so it must be restored with names/placeholders only.

## Decisions and assumptions

- Use the direct Google Generative AI provider, not Vercel AI Gateway, because the user explicitly requested the Gemini free-tier API.
- Install current compatible pinned versions of `ai` and `@ai-sdk/google` with npm and commit the lockfile changes. After installation, inspect the bundled `node_modules/ai/docs` and provider docs/source before finalizing API calls, per the AI SDK skill.
- Use `gemini-3.6-flash` as the default model. Runtime verification showed that Google returns `404` for `gemini-2.5-flash` on new accounts and explicitly directs them to 3.6 Flash. Google documents 3.6 Flash as stable, structured-output capable, and free-tier eligible. Allow a server-only `GEMINI_MODEL` override so future model retirement or quota differences do not require a code change.
- Preserve the existing `GEMINI_API_KEY` name by creating a Google provider instance with that explicit server-only key rather than renaming it to the SDK default variable.
- Analyze only stored `title` and `raw_text`; do not provide the source name to Gemini, preventing source reputation from influencing framing.
- Limit the article text sent to the model with a documented server-side character cap to control latency and free-tier usage while retaining enough article body for meaningful analysis.
- Keep the route handler thin. Put provider/schema/prompt logic in `lib/ai/`, Supabase pending/save logic in a dedicated query module, and orchestration/logging in a pipeline module.
- Take a stable snapshot of pending article IDs at the beginning of a run, detected with an `articles` select that includes the optional `article_analyses` relationship (left-join semantics), then filter rows whose relationship is absent. Do not use `analyzed_at` to decide pending status.
- Paginate the pending snapshot so the default run is not silently capped by PostgREST's common row limit. Apply optional selected IDs and limit before batching.
- Process articles sequentially inside configurable batches to respect Gemini free-tier rate limits. Continue through every article in the snapshot even if individual articles fail.
- Retry one time only when generation or validation fails. Never save malformed or semantically inconsistent output.
- Keep the Gemini schema compatible with its supported JSON Schema subset: primitives, enums, and arrays only; no unions or records.
- Compute `bias_score` in application code as `(right_percentage - left_percentage) / 100`; Gemini does not supply this derived field.
- Validate percentage ranges and an exact total of 100 with Zod. Validate framing label consistency: a clear/high-confidence result must match the strongest percentage; low-confidence or close results may be `unclear` or `mixed` as instructed by `GPT.md`.
- Use a fixed product disclaimer in application code so every saved result clearly states that political framing is AI-estimated and not objective truth.
- Save the analysis row first and set `articles.analyzed_at` only after the valid analysis write succeeds. A failed article remains without an analysis row and can be retried on a later run.
- Use an upsert on unique `article_id` to make persistence idempotent. Do not expose a browser control that invokes analysis.

## Files likely to change

### Create

- `lib/ai/article-analysis.ts` — Gemini provider, model selection, Zod structured-output schema, prompt, retry, semantic validation, normalization, and derived values.
- `lib/ai/types.ts` — small shared analysis result and run-summary types if keeping them separate improves clarity.
- `lib/supabase/queries/analysis.ts` — paginated pending lookup, analysis persistence, `analyzed_at` update, and analysis log inserts.
- `lib/analysis/pipeline.ts` — batch orchestration, counts, progress messages, error isolation, and final summary.
- `app/api/analyze/route.ts` — protected thin POST route.
- `.env.example` — safe environment-variable names and placeholders.
- `app/customComponents/framing-distribution.tsx` — reusable compact left/center/right visualization if it avoids duplicated UI markup.

### Modify

- `package.json`
- `package-lock.json`
- `lib/supabase/queries/articles.ts`
- `app/customComponents/news-grid.tsx`
- `app/customComponents/bias-badge.tsx`
- `app/news/[id]/page.tsx`
- `memory.md`

`supabase/schema.sql` and `lib/supabase/types.ts` should remain unchanged unless implementation discovers an actual mismatch; the required columns and types already exist.

## API contract

### Endpoint

`POST /api/analyze`

Required header:

- `x-biasly-admin-secret: <BIASLY_ADMIN_SECRET>`

Optional JSON body:

```json
{
  "articleIds": ["uuid"],
  "limit": 25,
  "batchSize": 5
}
```

- Empty body or `{}` processes all pending valid articles in the run snapshot.
- `articleIds`, when supplied, restricts the run to those stored articles that are pending.
- `limit`, when supplied, caps the number processed for that request.
- `batchSize` overrides the configured batch size for that request within conservative bounds.
- The default batch size comes from `ANALYSIS_BATCH_SIZE`, falling back to 5.
- Malformed JSON, unknown keys, invalid UUIDs, and out-of-range values return `400` with safe validation details.
- Missing/incorrect admin secret returns `401`.
- Missing Gemini configuration returns a generic `500` without exposing secret values.
- A completed run returns a typed JSON summary including status, pending/selected/analyzed/failed/skipped counts, batch count, duration, model, and per-article failure summaries that do not include article text or secrets.

## Implementation requirements

### Gemini analysis

- Instantiate `@ai-sdk/google` with `process.env.GEMINI_API_KEY` in a server-only module.
- Use the current AI SDK structured-output API verified from installed package docs. Prefer AI SDK 6 `generateText` plus `Output.object` if that is the installed API; do not use deprecated APIs from memory.
- Default to `GEMINI_MODEL || "gemini-3.6-flash"`.
- Ask for:
  - neutral summary
  - sentiment score from -1 to 1
  - sentiment label: `positive`, `neutral`, or `negative`
  - political framing label: `left`, `center`, `right`, `mixed`, or `unclear`
  - integer left/center/right percentages from 0 to 100 totaling 100
  - confidence from 0 to 1
  - concise article-evidence-based framing notes
  - loaded terms actually present in the supplied text
- Explicitly instruct Gemini to assess language and framing in the article text only, not whether claims are true and not the publisher's reputation.
- Treat the article content as untrusted quoted data. Delimit it and tell the model not to follow instructions found inside it.
- Normalize/truncate whitespace safely before model submission.
- Retry once after generation/output/semantic validation failure, then return a typed failure without saving.

### Supabase persistence

- Detect pending work through left-join relationship state, never `analyzed_at is null` alone.
- Paginate safely and keep query logic server-only under the service-role client.
- Validate that candidates have nonblank title/raw text before analysis; count invalid rows as skipped.
- Upsert the validated analysis using `article_id` conflict handling.
- Update `analyzed_at` only after the analysis row succeeds.
- Insert concise `analysis_started`, per-article success/failure, and `analysis_completed` records into `logs` while also emitting readable server console progress.
- Avoid storing raw article text, prompts, API keys, or full provider error bodies in logs.
- Do not use a joined-table `.eq()` filter.

### UI framing

- Extend `NewsCardData` and its analysis query to include sentiment label, left/center/right percentages, and confidence.
- Article cards must visibly show:
  - title, source, image, published date
  - sentiment label
  - an explicit `AI-estimated framing` label/badge
  - compact left/center/right distribution with numeric percentages
  - confidence when available
- Keep unanalyzed cards clean with a deliberate `Analysis pending` state; do not display fake zero percentages.
- Preserve the existing editorial light theme and blue/neutral/red framing color language. Use compact typography and a single shallow analysis surface inside each card so the denser metadata remains scannable.
- Update `BiasBadge` to cover the database labels (`left`, `center`, `right`, `mixed`, `unclear`) and ensure `center` is not mislabeled as generic neutral.
- Reuse one accessible distribution component between cards and detail where practical. Include text values so information is not color-only.
- On the detail page, retain the current full analysis sections but make `AI-estimated` and the disclaimer visually unambiguous, use the normalized badge treatment, and keep the mobile single-column / desktop sidebar layout.
- UI remains read-only and never invokes `/api/analyze`.

## Security requirements

- Keep `GEMINI_API_KEY`, `GEMINI_MODEL`, `ANALYSIS_BATCH_SIZE`, `SUPABASE_SERVICE_ROLE_KEY`, and `BIASLY_ADMIN_SECRET` server-only. None may use a `NEXT_PUBLIC_` prefix.
- Reuse `isAuthorizedAdminRequest` for the action route and preserve constant-time admin-secret comparison behavior.
- Do not return provider stack traces, raw prompts/content, Supabase errors, or environment values to clients.
- Keep all AI calls and service-role database operations outside Client Components.
- Retain RLS and current table grants; no public table access is needed.
- `.env.example` must contain placeholders only. Do not modify or print `.env.local` secret values.

## Acceptance criteria

- An authenticated admin-secret request with no body analyzes all pending valid articles present at run start, in batches, rather than stopping after a fixed ten.
- Pending detection is correct even when `articles.analyzed_at` is non-null but the related `article_analyses` row is missing.
- Optional article IDs, limit, and batch size are validated and respected.
- Every saved row passes the existing database constraints; percentages equal 100 and `bias_score` is derived exactly.
- Invalid Gemini output gets one retry and is never persisted if still invalid.
- One article failure does not abort remaining work.
- `analyzed_at` is set only after valid analysis persistence.
- Logs and the API summary accurately report analyzed, skipped, and failed counts.
- Gemini/API/service-role/admin secrets never reach browser bundles, UI props, responses, or logs.
- Homepage cards satisfy all section 19 framing display requirements and have an honest pending state.
- News detail pages show the complete saved analysis and clearly qualify political framing as AI-estimated.
- Existing scraping, Clerk protection, and Supabase read flows continue to work.
- `memory.md` records the implementation, affected files, Gemini choice, validation strategy, and verification results.

## Checks to run

From the project root after implementation:

```powershell
npm run typecheck
npm run lint
npm run build
git diff --check
```

Because multiple TSX components will be edited, also run the React best-practices review required by the installed project guidance and fix any relevant accessibility, hooks, typing, or rendering issues it identifies.

## Exact manual test steps

1. Ensure `.env.local` has valid `GEMINI_API_KEY`, `BIASLY_ADMIN_SECRET`, Supabase URL/key values, and optionally `GEMINI_MODEL=gemini-3.6-flash` plus `ANALYSIS_BATCH_SIZE=5`.
2. Start the app with `npm run dev` and confirm there are no startup or browser console errors.
3. Make a bounded analysis request from PowerShell:

```powershell
curl.exe -X POST http://localhost:3000/api/analyze `
  -H "Content-Type: application/json" `
  -H "x-biasly-admin-secret: YOUR_LOCAL_ADMIN_SECRET" `
  -d '{"limit":1,"batchSize":1}'
```

4. Confirm the JSON summary reports one analyzed row (or an honest zero if none are pending), and inspect server logs for start/article/completion progress without raw content or secrets.
5. Verify in Supabase that the selected article has exactly one `article_analyses` row, percentages total 100, `bias_score = (right_percentage - left_percentage) / 100`, and `articles.analyzed_at` is set after the analysis row.
6. Delete only that test article's `article_analyses` row in the Supabase dashboard while leaving `analyzed_at` populated, call the endpoint again with that article ID, and confirm it is detected and recreated. This specifically proves the left-join pending rule.
7. Send the same request without `x-biasly-admin-secret` and confirm `401`.
8. Send malformed and invalid bodies (bad JSON, invalid UUID, zero batch size, unknown key) and confirm `400` without internal details.
9. Open `/` while signed in. Confirm analyzed cards show sentiment, AI-estimated framing, all three percentages, and confidence; unanalyzed cards show `Analysis pending` without fake metrics.
10. Open the analyzed `/news/<id>` page at mobile and desktop widths. Confirm summary, sentiment, framing distribution, confidence, notes, loaded terms, and disclaimer render legibly, and that the framing is visibly labeled AI-estimated.
11. Trigger a full `{}` request only after the bounded test succeeds, and confirm it processes the entire pending snapshot in batches within the configured Gemini free-tier quota.
