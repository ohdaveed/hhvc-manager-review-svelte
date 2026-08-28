-- Move import_corpus_version out of `public`, where PostgREST can reach it.
--
-- PLAN.md G4, the prevention half of G2. `bun run audit:privileges` detects a
-- function in `public` that anon or authenticated can EXECUTE; this removes the
-- category. PostgREST serves only the schemas named in `[api] schemas`
-- (supabase/config.toml: `public`, `graphql_public`), so a function in
-- `private` is not reachable at /rest/v1/rpc/<name> at any grant level, and the
-- next CREATE FUNCTION placed here needs no REVOKE remembered by hand.
--
-- This is what 20260823130000 was working around. That migration documents the
-- hosted projects' ALTER DEFAULT PRIVILEGES granting EXECUTE to `anon` and
-- `authenticated` **by name**, so revoking PUBLIC left the function callable
-- and three explicit REVOKEs were needed. Those defaults are scoped
-- `IN SCHEMA public`, so they do not follow the function here.
--
-- The cost is real and is the reason this did not ship with G2:
-- scripts/corpus-import.ts called this through supabase.rpc(), which is
-- PostgREST, so it moves to a direct Postgres connection in the same change.

CREATE SCHEMA IF NOT EXISTS private;

COMMENT ON SCHEMA private IS
    'Not in PostgREST''s exposed schema list, so nothing here is reachable over the Data API. For functions and objects called only by a direct Postgres connection (scripts/corpus-import.ts).';

-- Stated rather than assumed. A fresh CREATE SCHEMA grants nothing to PUBLIC,
-- and Supabase's default privileges are scoped IN SCHEMA public so they do not
-- reach this one -- but the whole point of the schema is that this is true, so
-- it is worth asserting rather than inheriting.
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;

-- Idempotent: ALTER ... SET SCHEMA errors if the function has already moved,
-- and to_regprocedure returns NULL rather than raising for a name that is not
-- there, which is what makes the check safe to re-run.
DO $$
BEGIN
    IF to_regprocedure('public.import_corpus_version(text,integer,text,text,jsonb)') IS NOT NULL THEN
        ALTER FUNCTION public.import_corpus_version(text, integer, text, text, jsonb)
            SET SCHEMA private;
    END IF;
END
$$;

-- The grants from 20260823120000/20260823130000 travel with the function, so
-- restate the intent at its new address. service_role is no longer granted:
-- it was the identity PostgREST authenticated as, and there is no PostgREST in
-- this path any more. The caller is now the connection owner.
REVOKE ALL ON FUNCTION private.import_corpus_version(text, integer, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.import_corpus_version(text, integer, text, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION private.import_corpus_version(text, integer, text, text, jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION private.import_corpus_version(text, integer, text, text, jsonb) FROM service_role;
