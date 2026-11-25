-- Track C (decided Nov 24, 2026): the review queue follows the corpus's new
-- page set.
--
-- `pages` rows are written by the seed only. `corpus:import` never touches
-- `public.pages`, and `loadReview()` builds the queue from these rows rather
-- than from the compiled corpus (see 20260829120000_rename_agency_page_paths).
-- So every routable id the corpus drops or renames has to move here too, or a
-- renamed page leaves the queue while its old row lingers at a path nothing
-- renders. Regenerated seed.sql / seed.hosted.sql cover a fresh database; this
-- covers the two that already exist.
--
-- C1 removes four pages:
--   - Fix your Healthy Housing and Vector Control violation, merged into the
--     Correct a violation Step by step
--   - Get ready for a follow-up inspection, folded into that Step by step
--   - Get ready for a housing inspection after you report, folded into the
--     Report a pest problem Step by step
--   - Look up residential health code violations, merged into Find complaints
--     and inspection records
-- and retypes What tenants need to do after a Notice of Violation from
-- Transaction to Information, which moves its URL under sf.gov/information/.
--
-- Deleting a `pages` row cascades to its `edits` and `comments`. Production
-- and staging held 0 decisions, 0 edits and 0 comments when this was written
-- (measured 2026-11-24), but that is a fact about then, not a guarantee about
-- whenever this runs. So the guard below refuses to delete any row carrying
-- reviewer work -- a decision, a note, an edit or a comment -- rather than
-- dropping it silently. `page_checks` is not guarded: sync-checks computes it.
--
-- Idempotent: once the old paths are gone, every statement matches nothing.

DO $$
DECLARE
  removed text[] := ARRAY[
    'fix-healthy-housing-and-vector-control-violation',
    'get-ready-for-a-follow-up-inspection',
    'get-ready-for-a-housing-inspection',
    'lookup-residential-health-code-violations'
  ];
  blocked text;
BEGIN
  SELECT string_agg(DISTINCT p.path, ', ')
    INTO blocked
    FROM pages p
   WHERE p.path = ANY (removed)
     AND (p.status <> 'needs-review'
          OR p.manager_notes <> ''
          OR EXISTS (SELECT 1 FROM edits e WHERE e.page_id = p.id)
          OR EXISTS (SELECT 1 FROM comments c WHERE c.page_id = p.id));

  IF blocked IS NOT NULL THEN
    RAISE EXCEPTION 'Track C would delete reviewer work on: %', blocked
      USING HINT = 'Carry the decision, notes, edits and comments to the page each one merged into, then re-run this migration.';
  END IF;

  DELETE FROM pages WHERE path = ANY (removed);
END
$$;

UPDATE pages
   SET path = 'information-tenant-steps-after-notice-of-violation'
 WHERE path = 'tenant-steps-after-notice-of-violation';
