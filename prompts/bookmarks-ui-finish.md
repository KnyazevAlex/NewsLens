# Bookmark UI Finish and Duplicate Prevention

## Goal

Finish the bookmark feature already started in Biasly. Keep the existing Supabase `public.bookmarks` table, its data, and its owner-scoped RLS policy as the database foundation. Complete the user-facing interactions and make repeated bookmark attempts by one user resolve to a single saved bookmark per article.

## Context inspected

- `app/customComponents/bookmark.tsx`
- `app/customComponents/bookmarkCardRender.tsx`
- `app/customComponents/book-mark-menu.tsx`
- `app/customComponents/header.tsx`
- `app/customComponents/news-grid.tsx`
- `app/page.tsx`
- `app/news/[id]/page.tsx`
- `lib/supabase/queries/manageBookMarks.ts`
- `lib/supabase/useSupabse.ts`
- `supabase/schema.sql` and `lib/supabase/types.ts`
- User-provided Supabase Table Editor screenshot for the existing RLS policy

The table was created and populated in the Supabase dashboard, so it is not represented in the checked-in schema/types. The screenshot shows a permissive `authenticated` policy for all commands, with both `USING` and `WITH CHECK` comparing `auth.jwt()->>'sub'` to `user_id`. The user confirmed that this RLS setup works: each Clerk user's `user_id` matches their Clerk ID and users see only their own bookmarks. The current `useSupabse.ts` obtains a Clerk session token with `auth()` and passes it as the Supabase Authorization bearer token. Treat the screenshot and this confirmation as established configuration context, not as instructions to create or replace database objects.

## Current implementation gaps

- The detail-page bookmark action submits only URL and title. The user confirms ownership filtering works through the existing `user_id` and RLS setup; inspect the live table's default/insert behavior only to ensure new rows are assigned the expected Clerk ID. Do not rework the confirmed user-scoping design.
- `addBookmark` reports no structured failure to the caller and permits duplicate attempts at the application layer.
- The detail page builds its saved URL with `http://localhost:3000`, which is not valid in production.
- The article-card bookmark glyph is display-only; it does not invoke the bookmark action or stop event propagation from the enclosing article link.
- Bookmark state is matched by title in the feed, which is not a stable article identity.
- The bookmark menu treats an empty array as populated, so its empty state is skipped. Its mapped cards also lack React keys.
- The delete action is attached to a clickable `span`; it lacks button semantics and immediate, clear feedback.
- `bookmark.tsx` imports `title` from Node's `process` module, although it is unused.
- The bookmark dialog and buttons are not currently gated for signed-out users, so failures may surface only after attempting a server action.

## Decisions and assumptions

- Retain and adapt the existing actions in `lib/supabase/queries/manageBookMarks.ts`; do not replace them with a new API route or introduce another persistence layer.
- Use the existing article UUID as the canonical bookmark identity wherever it is available. Continue displaying the article title and a useful article link from stored bookmark/article data.
- Make insertion idempotent with a composite unique constraint on `(user_id, url)` (or the equivalent owner plus stable article-identity columns in the existing table). A global unique constraint on the article URL would incorrectly prevent other users from bookmarking that article. Include a migration that removes any global article-only uniqueness and adds the composite uniqueness while preserving existing rows. Before adding the constraint, identify and safely consolidate duplicate rows for the same user/article pair; never delete one user's copy merely because another user saved the same article.
- Preserve the confirmed Clerk-ID/user_id mapping and existing RLS policy. Do not weaken or recreate it. Continue deriving any owner value server-side rather than trusting a browser-supplied user ID.
- Keep the UI compact and consistent with the existing card/header design. Show clear pending/success/already-saved/error states and update bookmark state after add/delete.
- Do not alter unrelated article or analysis flows.

## Files likely to change

- `app/customComponents/bookmark.tsx`
- `app/customComponents/bookmarkCardRender.tsx`
- `app/customComponents/book-mark-menu.tsx`
- `app/customComponents/header.tsx`
- `app/customComponents/news-grid.tsx`
- `app/page.tsx`
- `app/news/[id]/page.tsx`
- `lib/supabase/queries/manageBookMarks.ts`
- `lib/supabase/types.ts` only if adding the existing table's shape to generated/local database types is needed for type-safe queries
- `memory.md` after implementation

Do not recreate the existing table. Add a migration for the uniqueness correction: remove a global article-only unique constraint/index if present, then enforce uniqueness on `(user_id, url)` (or the equivalent owner/article identity columns confirmed from the live schema). Preserve existing rows and the current RLS policy. If existing duplicate rows prevent adding the composite constraint, the migration must identify duplicates and consolidate only rows belonging to the same user and same article before applying it.

## Implementation requirements

### Bookmark actions and identity

- Preserve the existing authenticated Clerk session token flow through `supabaseActivation()` and the confirmed matching Clerk subject/user_id behavior.
- Ensure only authenticated users can add, fetch, or delete bookmarks; return structured outcomes for unauthenticated, duplicate/already-saved, success, and error cases.
- Use the table's stable article identity, currently `url`, and enforce one bookmark per user/article using a composite database uniqueness constraint on `(user_id, url)`. Ensure the URL saved for an article is stable across development and production; do not use a `localhost` absolute URL as the uniqueness key. Application checks alone are insufficient for concurrent duplicate requests.
- Scope fetches and deletes to the authenticated owner in the query as defense in depth, while retaining RLS.
- Replace the hard-coded localhost URL with a stable article route or the actual article URL according to the existing table's columns and desired card behavior.

### UI completion

- Make the bookmark control on article cards functional, accessible, and safe inside the enclosing article link; use the same action and duplicate behavior as the details page.
- Reflect saved state consistently in both the feed and details page, using article IDs rather than titles.
- Add disabled/pending state and visible feedback for failures or an already-saved article.
- Render the empty bookmark state when the list is null or has zero rows; add stable React keys to mapped cards.
- Replace the delete span with a labeled button, handle its result, and refresh the visible list/state after deletion.
- Hide or disable bookmark actions for signed-out users and give them an appropriate sign-in path.
- Remove unused imports and avoid logging routine bookmark events to the browser console.

## Security requirements

- Never trust a `user_id` supplied by a Client Component.
- Preserve the existing owner policy shown in the screenshot (`auth.jwt()->>'sub' = user_id` for `USING` and `WITH CHECK`).
- Preserve the confirmed Clerk token and RLS behavior; do not switch to a service-role client for user bookmark operations.
- Keep duplicate prevention backed by a composite unique database key for `(user_id, url)` (or equivalent existing owner/article identity columns). Never use a global unique article URL constraint.

## Validation after approval and implementation

- Run `npm run typecheck` and `npm run lint` from `news/`.
- Manually verify a signed-in user can add a bookmark once, repeated/rapid clicks leave one row, the saved state is reflected on both article views, and delete removes it from the menu.
- Verify a second account sees only its own bookmarks and cannot delete the first user's row.
- Verify the empty menu state and signed-out behavior.
- Verify the same article can be bookmarked by two different accounts, while duplicate/rapid attempts by either account create only one row for that account. Verify the composite constraint and existing RLS outcome; do not print credentials or tokens.
