-- Report regroup (Decided, Nov 24, 2026), completed: the last five of the nine
-- condition pages, and the pages they retire.
--
-- `pages` rows are written by the seed only and `loadReview()` builds the queue
-- from them, so each corpus change needs its row here or the page is missing
-- from the review queue (or a retired page lingers in it).
--
-- 1. "Report cockroaches, mosquitoes, and other insects" becomes "Report
--    cockroaches or other insects" in place. A rename keeps the row's id, so any
--    decision, note, edit or comment travels with it.
-- 2. "Report garbage, mold, and overgrown vegetation" is retired: all nine
--    condition pages now cover what it held. "Report a problem in an SRO or
--    hotel" is retired: Decided, each report page carries an SRO note instead.
--    Both rows are deleted only if no reviewer has worked on them; otherwise the
--    whole migration stops, so nothing is lost silently. Production had no
--    decision, notes, edits or comments on either row when this was written
--    (2026-11-25). `page_checks` is not guarded: sync-checks computes it.
-- 3. Four new pages join the queue: bed bugs, pigeons, sewage, animal waste.
--
-- Idempotent: once renamed, deleted and inserted, a re-run changes nothing.

DO $$
DECLARE
  worked int;
BEGIN
  SELECT count(*) INTO worked
    FROM pages p
   WHERE p.path IN ('report-garbage-filth-vegetation', 'report-problem-sro-hotel')
     AND (p.status <> 'needs-review'
          OR coalesce(p.manager_notes, '') <> ''
          OR EXISTS (SELECT 1 FROM edits e WHERE e.page_id = p.id)
          OR EXISTS (SELECT 1 FROM comments c WHERE c.page_id = p.id));
  IF worked > 0 THEN
    RAISE EXCEPTION 'report_regroup_complete: % retired page row(s) carry reviewer work; move it before deleting', worked;
  END IF;
END $$;

UPDATE pages
   SET path = 'report-cockroaches-or-other-insects'
 WHERE path = 'report-cockroaches-mosquitoes-insects';

DELETE FROM pages
 WHERE path IN ('report-garbage-filth-vegetation', 'report-problem-sro-hotel');

INSERT INTO pages (review_id, path)
SELECT r.id, v.path
FROM reviews r
CROSS JOIN (
    VALUES
      ('report-bed-bugs'),
      ('report-pigeon-droppings-nesting-or-feeding'),
      ('report-sewage-leak-or-backup'),
      ('report-animal-waste-on-property')
) AS v (path)
WHERE NOT EXISTS (
    SELECT 1 FROM pages p WHERE p.review_id = r.id AND p.path = v.path
);
