-- A Notice of Violation cannot be appealed (owner, 2026-11-25), so "appeal"
-- leaves the page's URL as well as its title. This amends C5, which had renamed
-- appeal-a-notice-of-violation to appeal-notice-of-violation in
-- 20261125100000_track_c_page_paths. The article stays dropped.
--
-- `pages` rows are written by the seed only and `loadReview()` builds the queue
-- from them, so the row has to follow the corpus's routable id or the page
-- leaves the queue. A rename keeps the row's id: any decision, note, edit or
-- comment travels with it. Idempotent: once renamed, it matches nothing.

UPDATE pages
   SET path = 'question-notice-of-violation'
 WHERE path = 'appeal-notice-of-violation';
