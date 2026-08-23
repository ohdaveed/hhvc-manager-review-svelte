-- Close an anonymous write path opened by 20260823120000.
--
-- That migration ended with:
--     REVOKE ALL ON FUNCTION import_corpus_version(...) FROM PUBLIC;
--     GRANT EXECUTE ON FUNCTION import_corpus_version(...) TO service_role;
-- which is correct on a stock PostgreSQL, where new functions are granted to
-- PUBLIC and nothing else. It verified clean on the local stack.
--
-- It is NOT sufficient on hosted Supabase. The hosted project carries
-- ALTER DEFAULT PRIVILEGES entries that grant EXECUTE on new functions to
-- `anon`, `authenticated` and `service_role` *explicitly, by name* rather
-- than through PUBLIC:
--
--     pg_default_acl: postgres=X/postgres | anon=X/postgres
--                     | authenticated=X/postgres | service_role=X/postgres
--
-- Revoking PUBLIC leaves those explicit grants untouched, so after the push
-- the live ACL was:
--
--     postgres=X/postgres | anon=X/postgres
--     | authenticated=X/postgres | service_role=X/postgres
--
-- meaning any anonymous caller could POST to PostgREST's
-- /rest/v1/rpc/import_corpus_version and insert corpus_versions and
-- page_versions rows directly -- bypassing the read-only intent of
-- corpus_versions_select / page_versions_select in 20260823060000, which
-- grant SELECT only.
--
-- Revoke the named roles explicitly. service_role keeps EXECUTE: it is the
-- sole intended caller (scripts/corpus-import.ts, via the service-role key).
REVOKE ALL ON FUNCTION import_corpus_version(text, integer, text, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION import_corpus_version(text, integer, text, text, jsonb) FROM authenticated;
REVOKE ALL ON FUNCTION import_corpus_version(text, integer, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION import_corpus_version(text, integer, text, text, jsonb) TO service_role;
