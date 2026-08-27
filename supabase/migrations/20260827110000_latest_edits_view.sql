-- One row per (page_id, field_id), so loadReview() stops fetching an unbounded
-- history it immediately folds away.
--
-- loadReview() read `edits` with `.in('page_id', pageIds)` and no `.limit()`.
-- The table is append-only by design, PostgREST caps a response at `max_rows`
-- (supabase/config.toml:18 sets 1000, and the hosted projects default to the
-- same), and supabase-js does not error on truncation. The fetch was ordered by
-- `created_at` ASCENDING and HelpPanel folds last-write-wins, so once the table
-- passed the cap the rows silently dropped were the NEWEST ones. Reviewers
-- would have seen progressively staler copy with a clean console and nothing in
-- the network tab that reads as a failure.
--
-- The reader only ever wanted one row per (page_id, field_id): saveInlineEdit
-- filters that pair out of editsStore before appending, so the store already
-- holds exactly one edit per field. This view states that, which makes the
-- result bounded by field count rather than by edit count. The history stays in
-- `edits` untouched -- this is a read path, not a retention change.

CREATE INDEX IF NOT EXISTS edits_page_field_created_idx
    ON edits (page_id, field_id, created_at DESC);

-- DROP then CREATE rather than CREATE OR REPLACE: a replace cannot change a
-- view's column list, so a later edit to the projection would fail in a way
-- that reads as a syntax error rather than as the restriction it actually is.
DROP VIEW IF EXISTS latest_edits;

-- `security_invoker = true` is load bearing, not a default worth restating. A
-- view without it runs with its OWNER's rights, so the RLS on `edits` would not
-- apply to whoever reads through it -- the view would be a read-everything hole
-- wearing a SELECT policy's clothes. `edits_select` is `USING (true)` today, so
-- nothing leaks either way at this moment; the point is that the day that
-- policy is narrowed, the narrowing has to reach readers of this view too.
-- Requires Postgres 15+; the stack is 17.6.
CREATE VIEW latest_edits WITH (security_invoker = true) AS
SELECT DISTINCT ON (page_id, field_id) *
FROM edits
-- `id` breaks a `created_at` tie, so the view is deterministic rather than
-- returning whichever of two same-instant rows the scan happened to reach.
ORDER BY page_id, field_id, created_at DESC, id DESC;

COMMENT ON VIEW latest_edits IS
    'The newest edit per (page_id, field_id). loadReview() reads this rather than `edits` so its response is bounded by field count instead of by an append-only history PostgREST silently truncates at max_rows. Realtime still subscribes to `edits` -- publications carry tables, not views.';

GRANT SELECT ON latest_edits TO authenticated;
