-- Ten proposed pages join the review queue.
--
-- `pages` rows are written by the seed only. `corpus:import` writes
-- `corpus_versions` and `page_versions` and never touches `public.pages`, and
-- `loadReview()` builds the queue from `select * from pages where review_id = …`
-- rather than from the compiled corpus. So a new module renders at its route
-- and is invisible in the review queue until a row exists. Regenerating
-- seed.sql covers a fresh database; this covers the two that already exist.
--
-- These ten are PROPOSALS, not part of the reviewed 29. They deliberately join
-- the same queue anyway: the manager wants every option in front of her, and
-- deciding not to publish one is a normal review outcome rather than a reason
-- to hide it. Each page's `editorNote` opens "PROPOSED PAGE — not in the
-- current 29", which is what tells them apart in the review panel. `status`
-- takes the table default, so they arrive as `needs-review` alongside
-- everything else — the queue's status union has no fifth value for a proposal
-- and inventing one would mean changing how the queue groups.
--
-- Idempotent: re-running inserts nothing. The paths are the routable ids
-- `routableId()` derives (slug minus 'sf.gov/', slashes to dashes), which is
-- what the router and the review panel both match on — taken from the corpus
-- rather than typed by hand.

INSERT INTO pages (review_id, path)
SELECT r.id, v.path
FROM reviews r
CROSS JOIN (
    VALUES
      ('step-by-step-report-a-pest-problem'),
      ('step-by-step-correct-a-violation-and-close-your-case'),
      ('step-by-step-prepare-your-unit-for-pest-treatment'),
      ('location-environmental-health-office'),
      ('information-who-to-call-about-a-housing-problem'),
      ('appeal-a-notice-of-violation'),
      ('pay-a-healthy-housing-citation'),
      ('resource-guides-in-other-languages'),
      ('rat-free-blocks'),
      ('report-healthy-housing-inspections-annual-summary')
) AS v (path)
WHERE NOT EXISTS (
    SELECT 1 FROM pages p WHERE p.review_id = r.id AND p.path = v.path
);
