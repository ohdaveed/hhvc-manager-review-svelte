-- HHVC was approved for an Agency page, so its landing page moves off the
-- `topic-` URL onto the `departments--` one, and its About child follows.
--
-- This UPDATE is required, not housekeeping. `pages` rows are written by the
-- seed only: `corpus:import` writes `corpus_versions` and `page_versions` and
-- never touches `public.pages` (see 20260823120000_import_corpus_version_fn.sql),
-- and the app only reads and updates them -- it never inserts. `loadReview()`
-- builds the review queue from `select * from pages where review_id = ...`,
-- so the queue is driven by these rows rather than by the compiled corpus.
--
-- Rename the corpus without this and the two renamed pages have no `pages` row
-- at all: they disappear from the queue and can take no status, note or check,
-- while the two old rows linger pointing at paths the corpus no longer renders.
-- Re-running `corpus:import` does not repair that.
--
-- Both production and staging were checked before this was written: 29 pages
-- each, every status still `needs-review`, and zero notes, checks, comments and
-- edits. No reviewer work is being carried across -- but the paths still have
-- to move, or the Agency landing page becomes unreviewable.
--
-- The `departments--…--about` form is sf.gov's real flat pattern, not path
-- nesting: `sf.gov/departments--controllers-office--about` is confirmed live in
-- `about-hhvc-team.ts`'s editorNote, and `docs/karl-export-field-map.md` §Agency
-- carries the type's field inventory.

UPDATE pages
   SET path = 'departments--healthy-housing-and-vector-control'
 WHERE path = 'topic-healthy-housing-and-vector-control';

UPDATE pages
   SET path = 'departments--healthy-housing-and-vector-control--about'
 WHERE path = 'topic-healthy-housing-and-vector-control--about';
