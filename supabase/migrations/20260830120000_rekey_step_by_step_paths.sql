-- Re-key the four pages whose slug lost its `step-by-step--` prefix.
--
-- Those four were slugged `step-by-step--*` while typed `Transaction`. The
-- prefix reads as a type marker on SF.gov, so it advertised a type they are
-- not; the slug was renamed rather than the type, because `Step by step` has
-- no page-level `cost` and no `things_to_know` and retyping would have dropped
-- copy from all four.
--
-- Without this, the rename does exactly what `20260823060000_corpus_versions`
-- warns about: "a renamed or dropped slug orphaned its `pages` row -- which
-- still held a reviewer's status, notes and checks -- pointing at a path the
-- app no longer rendered. Nothing errored; the work just stopped being
-- reachable." The next `corpus:import` would create fresh rows at the new
-- paths and leave the reviewer's work stranded on the old ones.
--
-- An UPDATE is enough, and that is a property of the schema rather than luck:
-- `comments.page_id` and `edits.page_id` reference `pages(id)`, a UUID that
-- does not change here, so every comment and edit follows its page. `path` has
-- no unique constraint, so nothing to violate -- which is also why the guard
-- below is explicit rather than an ON CONFLICT clause.
--
-- Idempotent in both directions. Re-running finds no `step-by-step--` rows and
-- does nothing; and if an import already created a row at the target path, the
-- NOT EXISTS guard leaves the old row alone rather than minting a duplicate
-- path that two pages would then answer to. That case needs a human to decide
-- which row holds the real review, so it is deliberately left visible instead
-- of merged automatically.
UPDATE pages AS p
SET path = replace(p.path, 'step-by-step--', '')
WHERE p.path LIKE 'step-by-step--%'
  AND NOT EXISTS (
      SELECT 1
      FROM pages AS existing
      WHERE existing.review_id = p.review_id
        AND existing.path = replace(p.path, 'step-by-step--', '')
  );
