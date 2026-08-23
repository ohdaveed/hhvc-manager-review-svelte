-- Table privileges for `authenticated`, stated rather than inherited.
--
-- Every table here was created by a migration and given RLS policies, but never
-- a GRANT. On the hosted project that went unnoticed: Supabase configures
-- ALTER DEFAULT PRIVILEGES so tables created there arrive with full DML for
-- `anon` and `authenticated` already attached. A local `supabase start` +
-- `supabase db reset` does not reproduce that -- `authenticated` comes out with
-- only `Dxtm` (TRUNCATE, REFERENCES, TRIGGER, MAINTAIN) -- so every read from a
-- signed-in local session failed with
--
--     42501 permission denied for table reviews
--
-- and the queue, the decisions and the edits were all inert. The app worked
-- against the hosted database and could not work against a local one, which is
-- the wrong way round for a development stack.
--
-- Grants are per-table and mirror `20260822030000_scope_rls_policies.sql`
-- exactly, rather than a blanket GRANT ALL. RLS is the row filter; this is the
-- statement filter, and the two saying the same thing means neither is load
-- bearing on its own. Anything the policies do not permit is not granted here
-- either -- there is no `DELETE ON reviews` policy, so there is no such grant.
--
-- `anon` gets nothing. Every policy is `TO authenticated`, so a signed-out
-- caller is already refused; the hosted project's `anon` grants come from those
-- same defaults and are neutralised by RLS rather than relied on.
--
-- Idempotent: GRANT is not an error when the privilege is already held, so this
-- is a no-op against the hosted project.

GRANT SELECT ON reviews TO authenticated;

GRANT SELECT, UPDATE ON pages TO authenticated;

GRANT SELECT, INSERT ON edits TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON comments TO authenticated;

GRANT SELECT ON corpus_versions TO authenticated;

GRANT SELECT ON page_versions TO authenticated;
