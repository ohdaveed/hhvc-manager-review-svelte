-- Transactional corpus import.
--
-- scripts/corpus-import.ts used to write corpus_versions and page_versions as
-- two separate PostgREST calls. PostgREST gives each call its own
-- transaction, so a failure between them (network blip, a bad row) could
-- leave a corpus_versions row with no page_versions -- an orphan. 52f7dad
-- added a guard that detects that orphan on the *next* run and refuses to
-- proceed, but the bad state still gets created and still needs a human to
-- clean it up.
--
-- This function does both inserts inside one PL/pgSQL body, which Postgres
-- always runs as a single transaction: an exception anywhere in the body
-- (e.g. the page_versions unique (corpus_version_id, path) violation, or a
-- NOT NULL failure) rolls back everything the function did, including the
-- corpus_versions insert. Calling it via supabase.rpc() from the import
-- script replaces the two-call path with one atomic call, so a failed import
-- leaves no row behind at all -- there is nothing left for the orphan guard
-- to catch on the next run.
CREATE OR REPLACE FUNCTION import_corpus_version(
    p_git_sha text,
    p_page_count integer,
    p_corpus_hash text,
    p_note text,
    p_pages jsonb
) RETURNS uuid
LANGUAGE plpgsql
-- SECURITY INVOKER (the default), not DEFINER: the only caller is
-- scripts/corpus-import.ts, which already authenticates with the
-- service-role key and therefore already bypasses RLS on both tables. A
-- DEFINER function would run as its owner (typically `postgres`) regardless
-- of caller, which buys nothing here and only widens the blast radius if
-- EXECUTE were ever accidentally granted to a lesser role -- INVOKER keeps
-- this function exactly as privileged as whoever calls it, no more.
SECURITY INVOKER
AS $$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO corpus_versions (git_sha, page_count, corpus_hash, note)
    VALUES (p_git_sha, p_page_count, p_corpus_hash, p_note)
    RETURNING id INTO v_id;

    INSERT INTO page_versions (corpus_version_id, path, content, content_hash, field_hashes)
    SELECT v_id, p ->> 'path', p -> 'content', p ->> 'content_hash', p -> 'field_hashes'
    FROM jsonb_array_elements(p_pages) AS p;

    RETURN v_id;
END;
$$;

COMMENT ON FUNCTION import_corpus_version(text, integer, text, text, jsonb) IS
    'Writes one corpus_versions row and its page_versions rows in a single transaction, so a failure partway through (e.g. a duplicate path) rolls back the whole import instead of leaving an orphaned corpus_versions row with no pages. Called only by scripts/corpus-import.ts via supabase.rpc(), using the service-role key.';

-- Checked directly (a scratch function's pg_proc.proacl is NULL, meaning
-- "use the default"; has_function_privilege() against that default showed
-- EXECUTE true for anon, authenticated, service_role and public alike):
-- PostgreSQL grants EXECUTE on new functions to PUBLIC by default, and every
-- role here -- anon, authenticated, service_role -- is a member of PUBLIC, so
-- without a REVOKE, any signed-in or even anonymous caller could write
-- corpus_versions/page_versions rows directly through PostgREST's
-- /rpc/import_corpus_version endpoint, bypassing the read-only intent of
-- corpus_versions_select/page_versions_select in 20260823060000.
--
-- Revoke the default PUBLIC grant, then grant EXECUTE back only to
-- service_role -- the sole intended caller (scripts/corpus-import.ts, via
-- the service-role key). service_role is not the function owner and is not
-- superuser, only bypassrls, so it does NOT keep implicit EXECUTE once
-- PUBLIC is revoked -- confirmed with has_function_privilege('service_role',
-- ..., 'EXECUTE') returning false immediately after the REVOKE ALL FROM
-- PUBLIC below and before this GRANT.
REVOKE ALL ON FUNCTION import_corpus_version(text, integer, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION import_corpus_version(text, integer, text, text, jsonb) TO service_role;
