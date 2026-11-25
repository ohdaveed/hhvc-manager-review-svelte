-- Topic merge (Decided, Nov 24, 2026): the Healthy housing and pest resources
-- and Look up building records Resource Collections fold into the Healthy
-- housing conditions Topic and are retired, so their review-queue rows go too.
-- `pages` rows are written by the seed only and `loadReview()` builds the queue
-- from them, so a row the corpus no longer renders would linger in the queue.
--
-- Deleting a row cascades to its edits and comments. Both databases were
-- checked for reviewer work on these two rows before merge. Idempotent.

DELETE FROM pages
 WHERE path IN ('resource--healthy-housing-and-vermin-information', 'look-up-building-records');
