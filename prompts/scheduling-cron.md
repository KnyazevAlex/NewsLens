# NewsLens — Scheduling & Cron Implementation Plan

**Target location:** `Scheduling/Cron.md`  
**Purpose:** Implementation specification for adding automated, low-frequency news ingestion and analysis to the existing NewsLens pipeline.

---

## 1. Objective

Implement an automated scheduling system that periodically:

1. Checks whether a news ingestion run is due.
2. Scrapes a limited number of articles from active news sources.
3. Deduplicates and stores newly discovered articles.
4. Analyzes only newly inserted articles using the existing Gemini analysis pipeline.
5. Records execution results, errors, and timing information.
6. Maintains lightweight daily Supabase database activity to reduce the risk of Free-tier project pausing.

### Initial operating configuration

| Setting | Initial value |
|---|---|
| Ingestion frequency | Every 14 days |
| Cron invocation | Daily |
| Sources | Existing active sources |
| Articles per source | Configurable, initially 2–3 |
| Oxylabs requests | Strictly limited |
| Analysis | Newly inserted articles only |
| Database | Existing Supabase project |
| Hosting | Existing Vercel deployment |
| Scheduling | Vercel Cron |

All values should be configurable where practical. Avoid hardcoding operational limits throughout the application.

### Important distinction

The daily cron invocation is not equivalent to daily scraping.

The cron should perform a lightweight database check every day. Actual scraping and analysis should only happen when the configured ingestion schedule is due.

---

## 2. Existing Architecture

Before implementation, inspect the current repository and identify the existing pipeline components.

The following components are already present:

- `lib/scraping/pipeline.ts`
  - `runManualScrape()`
  - Loads active sources, discovers article candidates, deduplicates URLs, parses and validates articles, and inserts them into Supabase.
- `lib/oxylabs/client.ts`
  - `fetchHtmlThroughOxylabs()`
  - Handles Oxylabs Realtime API requests.
- `lib/supabase/queries/scraping.ts`
  - Active source retrieval.
  - Existing article URL lookup.
  - Article insertion.
  - Scraping log creation.
- `lib/analysis/pipeline.ts`
  - `runArticleAnalysis()`
  - Handles AI analysis and embeddings for pending articles or specified article IDs.
- `app/api/scrape/route.ts`
  - Existing manually triggered scraping endpoint.
- `app/api/analyze/route.ts`
  - Existing manually triggered analysis endpoint.
- `lib/security/admin-secret.ts`
  - Existing admin-secret validation.

Existing database tables:

| Table | Responsibility |
|---|---|
| `sources` | News source configuration |
| `articles` | Stored articles |
| `article_analyses` | Analysis results and embeddings |
| `bookmarks` | Bookmarked articles |
| `logs` | Existing application logs |
| `oxylabs_schedules` | Oxylabs-managed schedule configuration |
| `oxylabs_schedule_runs` | Oxylabs-managed execution history |

### Existing Oxylabs tables

Do not repurpose or delete `oxylabs_schedules` and `oxylabs_schedule_runs`.

These tables represent Oxylabs-managed scheduling and execution records. The new scheduler should operate independently because NewsLens currently uses the Oxylabs Realtime API directly.

The application scheduler should not depend on Oxylabs creating or executing external schedules.

---

## 3. Proposed Architecture

Use one global application-level schedule initially.

```text
                    Vercel Cron
                    Daily trigger
                         |
                         v
                  /api/cron/ingest
                         |
                         v
                 Authenticate request
                         |
                         v
                Supabase heartbeat
                         |
                         v
                Check ingestion due
                         |
               +---------+---------+
               |                   |
              No                  Yes
               |                   |
               v                   v
           Exit early        Claim execution
                                   |
                                   v
                            Create pipeline run
                                   |
                                   v
                             Scrape sources
                                   |
                                   v
                         Deduplicate and insert
                                   |
                                   v
                        Collect inserted IDs
                                   |
                                   v
                         Analyze inserted IDs
                                   |
                                   v
                         Record run results
                                   |
                                   v
                        Update next_run_at
```

### Architectural requirements

- Scheduling must be independent of scraping implementation.
- The same scraping and analysis functions should remain usable manually.
- Cron should orchestrate existing pipeline functions rather than duplicate their logic.
- A failed run must not silently be recorded as successful.
- Multiple cron invocations must not execute the same scheduled run simultaneously.
- The scheduler should be recoverable after an interrupted execution.

---

## 4. Database Changes

Create a new Supabase migration.

Suggested location: `supabase/migrations/`

Do not modify existing tables unnecessarily.

### 4.1 `pipeline_schedules`

Purpose: Store the application's scheduling configuration.

Initially, create one schedule named `news_ingestion`.

Suggested schema:

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | TEXT | Unique schedule identifier |
| `is_active` | BOOLEAN | Enables/disables schedule |
| `interval_days` | INTEGER | Number of days between runs |
| `next_run_at` | TIMESTAMPTZ | Next scheduled execution |
| `last_run_at` | TIMESTAMPTZ | Previous execution |
| `last_heartbeat_at` | TIMESTAMPTZ | Most recent daily heartbeat |
| `lease_until` | TIMESTAMPTZ | Execution lease expiration |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |

Requirements:

- Use UUID primary keys.
- Give `name` a unique constraint.
- Add sensible defaults and validation constraints.
- `interval_days` must be positive.
- Store timestamps in UTC.
- Insert the initial `news_ingestion` schedule through the migration or a safe seed operation.
- Initially configure `interval_days = 14`.
- Initialize `next_run_at` to a sensible future UTC timestamp.

Do not create a schedule per news source yet. The existing `sources.is_active` column determines which sources are eligible for scraping.

### 4.2 `pipeline_runs`

Purpose: Record each scheduled pipeline execution.

Suggested schema:

| Column | Type | Purpose |
|---|---|---|
| `id` | UUID | Primary key |
| `schedule_id` | UUID | References `pipeline_schedules.id` |
| `status` | TEXT | Execution state |
| `started_at` | TIMESTAMPTZ | Start timestamp |
| `completed_at` | TIMESTAMPTZ | Completion timestamp |
| `summary` | JSONB | Execution statistics |
| `error_message` | TEXT | Failure information |
| `created_at` | TIMESTAMPTZ | Record creation |

Allowed statuses:

- `pending`
- `running`
- `done`
- `failed`

Add appropriate foreign keys, indexes, and status constraints.

The summary should eventually capture information such as:

```json
{
  "sources_processed": 3,
  "articles_discovered": 8,
  "articles_inserted": 4,
  "articles_analyzed": 4,
  "analysis_failures": 0,
  "oxylabs_requests": 6,
  "duration_ms": 45000
}
```

These are illustrative fields, not expected results.

### 4.3 Security

Both new tables should have RLS enabled.

- Do not expose schedule management or execution records to anonymous clients.
- Do not grant unrestricted access to authenticated clients.
- Use the server-side Supabase service-role client for scheduler operations.
- Never expose the service-role key in client-side code.

---

## 5. Atomic Execution Claiming

This is one of the most important parts of the implementation.

A daily cron can occasionally overlap with another invocation, be retried, or encounter a delayed previous execution.

The system must prevent duplicate ingestion runs.

Implement a database-side atomic claim operation, preferably as a PostgreSQL function/RPC.

The operation should:

1. Find the active schedule.
2. Lock the relevant schedule row.
3. Check whether `next_run_at <= now()`.
4. Check whether an existing execution lease is still valid.
5. If another run owns the lease, return without starting another run.
6. Otherwise, create a new `pipeline_runs` record with status `running`.
7. Set `lease_until` to a bounded future expiration time.
8. Return the newly created run ID.

Perform the claim in one database transaction.

Do not implement the claim as separate application-level SELECT and INSERT requests. That introduces a race condition.

### Lease recovery

If a previous execution crashes, its lease must eventually expire.

The next cron invocation should be able to recover the schedule.

Requirements:

- Use a configurable lease duration.
- Do not immediately start another run simply because the HTTP request timed out.
- Check for an existing run that is still marked `running`.
- Mark an abandoned run as failed or recovered before starting another one.
- Record the recovery reason.
- Never allow a permanently stuck `running` status.

If execution duration approaches the lease expiration, extend the lease safely or use a sufficiently conservative duration.

---

## 6. Cron Endpoint

Create:

`app/api/cron/ingest/route.ts`

Use the Next.js App Router conventions already present in the project.

### Request security

Create a dedicated environment variable:

`CRON_SECRET`

The endpoint should validate the incoming request using the secret before performing any database or pipeline operations.

Use a constant-time comparison where practical.

For Vercel Cron, follow the currently documented authorization header convention when configuring the scheduled request.

Requirements:

- Reject unauthorized requests with HTTP 401.
- Never log the secret.
- Do not accept a secret from query parameters.
- Never expose the secret to the browser.
- Keep the existing admin-secret mechanism for manual endpoints separate unless there is a clear reason to consolidate it.

### Endpoint execution sequence

1. Authenticate the cron request.
2. Update `last_heartbeat_at` using a real Supabase database request.
3. Attempt to atomically claim a due schedule.
4. If no schedule is due, return a successful response indicating that no work was performed.
5. If a run was claimed, invoke the ingestion orchestration function.
6. Update execution statistics.
7. Mark the run as `done` or `failed`.
8. Update schedule timestamps and clear the lease.
9. Return a structured JSON response.

Do not make the daily heartbeat dependent on whether ingestion is due.

### Example response: no ingestion due

```json
{
  "success": true,
  "ingestion_due": false,
  "message": "No scheduled ingestion is due."
}
```

### Example response: completed ingestion

```json
{
  "success": true,
  "ingestion_due": true,
  "run_id": "uuid",
  "status": "done",
  "summary": {}
}
```

These responses are illustrative.

---

## 7. Ingestion Orchestration

Create a separate orchestration module rather than placing all logic inside the route handler.

Suggested location:

`lib/scheduling/ingestion.ts`

Suggested responsibility:

```text
runScheduledIngestion()
    |
    +-- runManualScrape()
    |
    +-- collect inserted article IDs
    |
    +-- runArticleAnalysis(articleIds)
    |
    +-- return execution summary
```

The implementation should reuse the existing pipeline functions.

### 7.1 Scraping

Use the existing:

`runManualScrape()`

Do not duplicate Oxylabs request logic, parsing, deduplication, validation, or insertion logic.

Review its current return value.

If it does not return inserted article IDs, modify it to return them.

For example:

```ts
{
  articlesDiscovered: number,
  articlesInserted: number,
  insertedArticleIds: string[],
  sourcesProcessed: number,
  oxylabsRequests: number
}
```

Adapt the actual structure to existing project conventions.

Do not include unnecessary sensitive data in the returned summary.

### 7.2 Scraping limits

Implement configurable resource limits.

Initial suggested values:

- 2–3 active sources per run.
- 2–3 articles per source.
- A strict maximum number of Oxylabs requests.
- A bounded timeout for individual operations.

These are starting limits, not assumptions about the exact number of requests generated by the current scraper.

Important: inspect how `runManualScrape()` uses Oxylabs before setting the final budget. The existing implementation may make separate requests for source homepages and individual article pages.

Do not assume that a limit of three articles means only three Oxylabs requests.

The scheduler must enforce an overall request budget, not just a per-source article limit.

If a budget cannot be respected by the existing scraper, modify the scraper's configuration or request flow rather than silently exceeding it.

### 7.3 Analysis

Use:

`runArticleAnalysis()`

Pass only IDs returned by the current scraping execution:

```ts
runArticleAnalysis({
  articleIds: insertedArticleIds,
  batchSize: 1
});
```

Adapt parameters to the existing function signature.

Do not analyze every pending article in the database during a scheduled ingestion run.

Do not trigger analysis if no new articles were inserted.

Track analysis failures separately from scraping failures.

If scraping succeeds but some analyses fail, record that distinction in the execution summary rather than falsely reporting the entire run as fully successful.

---

## 8. Vercel Cron Configuration

Configure the daily scheduled invocation through the existing Vercel project.

Suggested configuration in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/ingest",
      "schedule": "0 13 * * *"
    }
  ]
}
```

This is an illustrative UTC schedule. Confirm current Vercel Hobby plan cron restrictions and deployment requirements before implementation.

Requirements:

- Invoke the endpoint once daily.
- Keep the actual ingestion interval controlled by Supabase.
- Do not rely on cron timing alone to enforce the 14-day interval.
- Add `CRON_SECRET` to Vercel environment variables.
- Configure it for the required deployment environments.
- Ensure the endpoint is deployed and reachable before enabling the cron.

Do not create a second independent scheduler in Oxylabs.

---

## 9. Supabase Free-Tier Activity

The project should not go 14 days without database activity.

Supabase Free projects may pause after a period of insufficient activity.

The daily cron should therefore perform a lightweight, genuine database operation regardless of whether ingestion is due.

Suggested operation:

Update `pipeline_schedules.last_heartbeat_at`.

This provides:

- A daily database request.
- A basic record of scheduler activity.
- Visibility into whether the cron is running.

Important limitations:

- Supabase documentation indicates that a few requests per day usually help prevent inactivity pausing, but a single daily heartbeat is not a guarantee.
- Monitor Supabase inactivity warnings and project status.
- Do not treat a successful Vercel invocation as proof that the Supabase project cannot pause.
- Do not create unnecessary high-volume traffic just to keep the project active.

If the project is paused, the scheduler should fail gracefully and produce a useful error when database access cannot be established.

---

## 10. Error Handling and Recovery

Implement explicit error handling for each stage.

| Stage | Example failure | Expected behavior |
|---|---|---|
| Authentication | Invalid cron secret | Reject request |
| Heartbeat | Supabase unavailable | Log/report failure |
| Schedule claim | Database error | Do not scrape |
| Scraping | Oxylabs request failure | Record scrape failure |
| Insertion | Database error | Preserve error details |
| Analysis | Gemini/API failure | Record analysis failure |
| Finalization | Database error | Allow recovery through lease |

### Important rules

- Do not swallow exceptions.
- Do not mark failed executions as successful.
- Do not retry expensive operations indefinitely.
- Use bounded retries with backoff only where appropriate.
- Preserve useful error messages without logging credentials or secrets.
- Make pipeline operations safe to retry through existing URL uniqueness and deduplication behavior.
- Avoid duplicate article analysis where possible.
- If finalization fails, the expired lease and recovery mechanism must eventually resolve the execution state.

Use structured logs with the pipeline run ID so individual executions can be traced.

---

## 11. Observability

The database should provide enough information to understand what happened without requiring Vercel logs for every question.

For every execution, record:

- Run ID.
- Start and completion timestamps.
- Final status.
- Number of sources processed.
- Number of articles discovered.
- Number of articles inserted.
- Number of articles analyzed.
- Analysis failures.
- Oxylabs request count.
- Total execution duration.
- Error message, if applicable.

Do not build a separate dashboard as part of the initial implementation.

The existing database and Vercel logs are sufficient for the first version.

A future admin interface could display:

- Last successful ingestion.
- Next scheduled ingestion.
- Last heartbeat.
- Recent execution history.
- Articles inserted per run.
- Oxylabs usage.
- Failed execution details.

---

## 12. Environment Variables

Review the existing environment variable naming conventions before adding anything.

The scheduler may need:

| Variable | Purpose |
|---|---|
| `CRON_SECRET` | Authenticates scheduled requests |
| Existing Supabase service-role key | Server-side database operations |
| Existing Oxylabs credentials | Scraping |
| Existing Gemini credentials | Analysis |

Do not introduce duplicate Supabase, Oxylabs, or Gemini environment variables if the project already has them.

Do not commit `.env` files or credentials.

---

## 13. Implementation Phases

Execute in this order.

### Phase 1 — Repository inspection

- Inspect the current branch and working tree.
- Read existing scraping and analysis pipeline implementations.
- Inspect Supabase client configuration.
- Inspect existing database migrations.
- Inspect `vercel.json` and project deployment configuration.
- Verify the current Vercel plan's cron limitations.
- Identify the exact Oxylabs request behavior and current pipeline limits.

Do not assume that the current `main` branch is identical to the branch being modified.

### Phase 2 — Database migration

- Create `pipeline_schedules`.
- Create `pipeline_runs`.
- Add appropriate constraints and indexes.
- Add the initial global ingestion schedule.
- Implement the atomic schedule-claim operation.
- Configure RLS and service-role access.
- Test the migration against the existing schema.

Do not delete or repurpose existing Oxylabs scheduling tables.

### Phase 3 — Scraping pipeline integration

- Modify the scraper to return inserted article IDs if necessary.
- Expose useful execution statistics.
- Enforce configurable source, article, and Oxylabs request limits.
- Verify deduplication behavior.
- Ensure existing manual scraping still works.

### Phase 4 — Orchestration

- Implement `runScheduledIngestion()`.
- Connect scraping and analysis.
- Analyze only newly inserted article IDs.
- Return a structured execution summary.
- Handle partial failures.

### Phase 5 — Cron endpoint

- Implement `/api/cron/ingest`.
- Add secure request authentication.
- Implement daily heartbeat.
- Integrate atomic claiming.
- Record execution results.
- Implement lease cleanup and recovery.
- Return structured HTTP responses.

### Phase 6 — Vercel configuration

- Configure the daily cron.
- Add `CRON_SECRET`.
- Deploy.
- Verify the scheduled endpoint.
- Confirm that the cron does not trigger ingestion when it is not due.

### Phase 7 — Testing and validation

Perform the tests in the next section before considering implementation complete.

---

## 14. Acceptance Criteria

The implementation is complete only when all of the following are verified.

### Scheduling

- [ ] A daily Vercel Cron invocation reaches the endpoint.
- [ ] Unauthorized requests are rejected.
- [ ] The heartbeat updates even when ingestion is not due.
- [ ] Actual ingestion only happens when `next_run_at` is due.
- [ ] The initial interval is 14 days.
- [ ] The interval can be changed through the schedule configuration.

### Concurrency and recovery

- [ ] Two simultaneous requests cannot claim the same schedule.
- [ ] A running execution has a valid lease.
- [ ] An expired lease can be recovered.
- [ ] Failed executions are recorded as failed.
- [ ] A failure does not leave the schedule permanently locked.

### Scraping and analysis

- [ ] Existing scraping logic is reused.
- [ ] Oxylabs request limits are enforced.
- [ ] Duplicate URLs are not inserted.
- [ ] Newly inserted article IDs are returned.
- [ ] Only newly inserted articles are sent for analysis.
- [ ] No analysis request is made when zero articles are inserted.
- [ ] Partial analysis failures are visible in the run summary.

### Security and deployment

- [ ] Service-role credentials remain server-side.
- [ ] Cron authentication uses a dedicated secret.
- [ ] RLS is configured correctly.
- [ ] No secrets are committed.
- [ ] Existing manual scraping and analysis endpoints still work.
- [ ] TypeScript checks and relevant tests pass.
- [ ] The deployed cron configuration is verified.

---

## 15. Out of Scope for the First Version

Do not implement these unless required by the existing architecture:

- Per-source schedules.
- Oxylabs-managed scheduling.
- A separate background worker infrastructure.
- Redis or an external queue.
- A dedicated admin dashboard.
- Complex retry orchestration.
- Automatic source discovery.
- High-frequency scraping.
- Multiple independent cron schedules.

The goal is a small, reliable scheduler that makes use of the existing NewsLens infrastructure.

---

## 16. Final Engineering Principles

1. **Reuse before rewriting.** The existing scraping and analysis pipelines should remain the core of the application.
2. **Separate scheduling from execution.** Cron decides when work should happen; pipeline modules decide how it happens.
3. **Control costs explicitly.** Oxylabs and Gemini usage must have configurable limits.
4. **Make execution observable.** Every scheduled run should leave a traceable database record.
5. **Design for failure.** Crashes, timeouts, retries, and overlapping requests must be expected.
6. **Keep the initial implementation small.** Do not introduce infrastructure that the project does not need.
7. **Preserve existing functionality.** Manual scraping and analysis must continue working independently of the scheduler.

**Expected outcome:** NewsLens automatically ingests and analyzes a small batch of new articles every 14 days, maintains daily scheduler activity, records execution history, and does so with strict external API usage limits and no dependence on Oxylabs-managed cron scheduling.