-- Replace the blanket RLS policies with per-operation ones.
--
-- Every table shipped with `FOR ALL TO authenticated USING (true)`, so any
-- signed-in user could read, modify and DELETE any row -- including another
-- reviewer's edits. Authorship was already recorded (comments.user_id and
-- edits.user_id are both NOT NULL REFERENCES auth.users); it was simply never
-- used for authorization.
--
-- The decision this implements (PLAN.md F1): reviewers may READ everything --
-- seeing each other's work is the point of a shared review tool -- and WRITE
-- only their own rows. Blanket DELETE is not a trust model, it is an oversight.
--
-- Note that Supabase's own security advisor reports nothing about this: its
-- linter checks whether RLS is enabled and whether policies exist, not whether
-- they are permissive. The old policies passed both tests.
--
-- What each table actually needs, from the code rather than from guesswork:
--
--   reviews   loadReview() SELECTs the newest row. Nothing writes.
--   pages     loadReview() SELECTs; updatePageStatus() and updatePageNotes()
--             UPDATE status and manager_notes. Rows are seeded, never inserted
--             or deleted by a client.
--   edits     loadReview() SELECTs; saveInlineEdit() INSERTs. Nothing updates
--             or deletes -- HelpPanel folds the table as append-only,
--             last-write-wins, so an UPDATE path would contradict the reader.
--   comments  No application code touches this table at all. It still gets
--             scoped policies rather than being left open, because any signed-in
--             user can reach it through the anon key.
--
-- scripts/sync-checks.ts is unaffected: it uses the service-role key, which
-- bypasses RLS entirely.

-- Idempotent, matching the style of 20260822020000: Postgres has no
-- CREATE POLICY IF NOT EXISTS, and a bare CREATE aborts the migration on re-run.
DROP POLICY IF EXISTS "Allow authenticated full access to reviews" ON reviews;
DROP POLICY IF EXISTS "Allow authenticated full access to pages" ON pages;
DROP POLICY IF EXISTS "Allow authenticated full access to comments" ON comments;
DROP POLICY IF EXISTS "Allow authenticated full access to edits" ON edits;

DROP POLICY IF EXISTS "reviews_select" ON reviews;
DROP POLICY IF EXISTS "pages_select" ON pages;
DROP POLICY IF EXISTS "pages_update" ON pages;
DROP POLICY IF EXISTS "edits_select" ON edits;
DROP POLICY IF EXISTS "edits_insert_own" ON edits;
DROP POLICY IF EXISTS "comments_select" ON comments;
DROP POLICY IF EXISTS "comments_insert_own" ON comments;
DROP POLICY IF EXISTS "comments_update_own" ON comments;
DROP POLICY IF EXISTS "comments_delete_own" ON comments;

-- reviews: read-only to reviewers. The row is seeded; nothing in the app
-- creates, renames or deletes a review.
CREATE POLICY "reviews_select" ON reviews
	FOR SELECT TO authenticated
	USING (true);

-- pages: shared review state. status and manager_notes are deliberately
-- writable by any reviewer -- a decision is a property of the page, not of the
-- person who recorded it. No INSERT or DELETE: pages are seeded.
CREATE POLICY "pages_select" ON pages
	FOR SELECT TO authenticated
	USING (true);

CREATE POLICY "pages_update" ON pages
	FOR UPDATE TO authenticated
	USING (true)
	WITH CHECK (true);

-- edits: readable by everyone, written only as yourself, and append-only.
-- The absence of UPDATE and DELETE policies is the substance of this migration:
-- it is what stops one reviewer rewriting or destroying another's work.
--
-- `(select auth.uid())` rather than a bare `auth.uid()`: wrapped in a subquery
-- the initplan is evaluated once per statement instead of once per row.
CREATE POLICY "edits_select" ON edits
	FOR SELECT TO authenticated
	USING (true);

CREATE POLICY "edits_insert_own" ON edits
	FOR INSERT TO authenticated
	WITH CHECK ((select auth.uid()) = user_id);

-- comments: unused by the app today, so this is the shape it should have when
-- something does use it. A reviewer manages their own comments and reads
-- everyone's.
CREATE POLICY "comments_select" ON comments
	FOR SELECT TO authenticated
	USING (true);

CREATE POLICY "comments_insert_own" ON comments
	FOR INSERT TO authenticated
	WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "comments_update_own" ON comments
	FOR UPDATE TO authenticated
	USING ((select auth.uid()) = user_id)
	WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "comments_delete_own" ON comments
	FOR DELETE TO authenticated
	USING ((select auth.uid()) = user_id);

-- Indexes on the columns the policies and the app's own queries filter on.
-- An RLS predicate runs on every candidate row, so an unindexed column in a
-- policy turns every read into a sequential scan as the table grows.
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON comments (user_id);
CREATE INDEX IF NOT EXISTS edits_user_id_idx ON edits (user_id);

-- Not policy columns, but the filters loadReview() uses on every page load:
-- `.in('page_id', pageIds)` over edits and `.eq('review_id', reviewId)` over
-- pages.
CREATE INDEX IF NOT EXISTS edits_page_id_idx ON edits (page_id);
CREATE INDEX IF NOT EXISTS comments_page_id_idx ON comments (page_id);
CREATE INDEX IF NOT EXISTS pages_review_id_idx ON pages (review_id);
