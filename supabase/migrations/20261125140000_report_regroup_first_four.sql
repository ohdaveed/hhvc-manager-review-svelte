-- Report regroup (Decided, Nov 24, 2026): the first four of the nine condition
-- pages.
--
-- `pages` rows are written by the seed only and `loadReview()` builds the queue
-- from them, so each corpus change needs its row here or the page is missing
-- from the review queue.
--
-- 1. "Report rats, mice, and other four-legged problems" becomes "Report rats
--    or mice" in place. A rename keeps the row's id, so any decision, note, edit
--    or comment travels with it. Idempotent: once renamed, it matches nothing.
-- 2. Three new pages join the queue: mosquitoes, mold, and garbage/clutter.
--    `status` takes the table default (`needs-review`). Idempotent: re-running
--    inserts nothing.
--
-- The old insects and garbage pages keep their rows: they stay until the
-- conditions only they cover (bed bugs, animal waste, pigeons) get pages.

UPDATE pages
   SET path = 'report-rats-or-mice'
 WHERE path = 'report-rats-mice-four-legged-problems';

INSERT INTO pages (review_id, path)
SELECT r.id, v.path
FROM reviews r
CROSS JOIN (
    VALUES
      ('report-mosquitoes-or-standing-water'),
      ('report-mold'),
      ('report-garbage-clutter-or-overgrown-plants')
) AS v (path)
WHERE NOT EXISTS (
    SELECT 1 FROM pages p WHERE p.review_id = r.id AND p.path = v.path
);
