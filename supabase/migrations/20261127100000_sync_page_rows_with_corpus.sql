-- Square `pages` with the corpus: five corpus pages that had no row, and two
-- rows whose pages were retired.
--
-- `pages` rows are written by the seed and by migrations, and `loadReview()`
-- builds the queue from them. These five pages reached the seed through
-- `seed:gen` but no migration ever inserted them, so a database seeded before
-- they existed lists them under "Not in the review yet", where they cannot be
-- decided. Production has their rows already (measured 2026-11-27, review
-- 22222222-…), so there the insert below is a no-op; it exists for every other
-- database, and so the repo states the rows rather than relying on a seed run.
--
-- The two retired pages were merged away by #244 ("Who to call" into the
-- inspection-scope page) and #245 ("Prepare your unit" into the treatment
-- page). Neither change shipped a migration, so their rows linger and the
-- queue reports them as records belonging to pages no longer in the mockups.
-- They are deleted only if no reviewer has worked on them; otherwise the whole
-- migration stops, so nothing is lost silently. Production had no decision,
-- notes, edits or comments on either row when this was written (2026-11-27).
-- `page_checks` is not guarded: sync-checks computes it.
--
-- Idempotent: once deleted and inserted, a re-run changes nothing.

DO $$
DECLARE
  worked int;
BEGIN
  SELECT count(*) INTO worked
    FROM pages p
   WHERE p.path IN ('information-who-to-call-about-a-housing-problem',
                    'step-by-step-prepare-your-unit-for-pest-treatment')
     AND (p.status <> 'needs-review'
          OR coalesce(p.manager_notes, '') <> ''
          OR EXISTS (SELECT 1 FROM edits e WHERE e.page_id = p.id)
          OR EXISTS (SELECT 1 FROM comments c WHERE c.page_id = p.id));
  IF worked > 0 THEN
    RAISE EXCEPTION 'sync_page_rows_with_corpus: % retired page row(s) carry reviewer work; move it before deleting', worked;
  END IF;
END $$;

DELETE FROM pages
 WHERE path IN ('information-who-to-call-about-a-housing-problem',
                'step-by-step-prepare-your-unit-for-pest-treatment');

INSERT INTO pages (review_id, path)
SELECT r.id, v.path
FROM reviews r
CROSS JOIN (
    VALUES
      ('information-bed-bugs-prevent-find-and-prepare-for-treatment'),
      ('information-reduce-moisture-and-mold-in-your-home'),
      ('information-keep-rats-and-mice-out-of-your-home'),
      ('information-get-rid-of-cockroaches-without-heavy-pesticides'),
      ('information-what-to-expect-when-your-building-is-treated-for-pests')
) AS v (path)
WHERE NOT EXISTS (
    SELECT 1 FROM pages p WHERE p.review_id = r.id AND p.path = v.path
);
