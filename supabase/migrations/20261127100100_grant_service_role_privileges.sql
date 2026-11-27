-- Table privileges for `service_role`, stated rather than inherited.
--
-- The same gap 20260823140000 closed for `authenticated`, on the role the
-- server routes and scripts write with. The hosted project's ALTER DEFAULT
-- PRIVILEGES give `service_role` full DML on every table (measured on
-- production 2026-11-27: SELECT and INSERT held on reviews, pages and
-- draft_pages), so it went unnoticed there. A local `supabase start` +
-- `supabase db reset` does not reproduce those defaults, and every
-- service-role write failed with
--
--     42501 permission denied for table reviews
--
-- which meant "Add to review" (PUT /api/pages), proposing a page (POST/PATCH
-- /api/pages) and `scripts/sync-checks.ts` could not work against a local
-- stack. Found driving "Add to review" in a browser against one.
--
-- `service_role` bypasses RLS, so these grants are the only statement filter
-- it has. They name exactly what its callers do, rather than GRANT ALL:
--
--   reviews      SELECT                          newest review (routes, sync-checks)
--   pages        SELECT, INSERT, UPDATE          rows for drafts and added pages;
--                                                sync-checks writes page_checks
--   draft_pages  SELECT, INSERT, UPDATE, DELETE  create, finalize, and the cleanup
--                                                when the pages insert fails
--
-- Idempotent: GRANT is not an error when the privilege is already held, so this
-- is a no-op against the hosted project.

GRANT SELECT ON reviews TO service_role;

GRANT SELECT, INSERT, UPDATE ON pages TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON draft_pages TO service_role;
