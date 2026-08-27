-- import_corpus_version: pin search_path, schema-qualify the two tables.
--
-- 20260823120000 created the function with no SET search_path clause, so its
-- unqualified `corpus_versions` and `page_versions` resolve through whatever
-- search_path the caller happens to carry. SECURITY INVOKER keeps the blast
-- radius small -- this is not the classic SECURITY DEFINER hijack, where an
-- attacker-controlled path makes the body touch someone else's table with the
-- owner's rights -- but the resolution is ambient rather than stated, and
-- Supabase's linter reports it as function_search_path_mutable.
--
-- `SET search_path = ''` turns every unqualified name into an error, so the
-- two tables are named public.* explicitly. pg_catalog stays implicitly first
-- even with an empty path, so jsonb_array_elements needs no qualification.
--
-- The body is otherwise byte-for-byte the one from 20260823120000 and the
-- signature is identical, so this replaces that function rather than adding a
-- second overload.

CREATE OR REPLACE FUNCTION import_corpus_version(
    p_git_sha text,
    p_page_count integer,
    p_corpus_hash text,
    p_note text,
    p_pages jsonb
) RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    v_id uuid;
BEGIN
    INSERT INTO public.corpus_versions (git_sha, page_count, corpus_hash, note)
    VALUES (p_git_sha, p_page_count, p_corpus_hash, p_note)
    RETURNING id INTO v_id;

    INSERT INTO public.page_versions (corpus_version_id, path, content, content_hash, field_hashes)
    SELECT v_id, p ->> 'path', p -> 'content', p ->> 'content_hash', p -> 'field_hashes'
    FROM jsonb_array_elements(p_pages) AS p;

    RETURN v_id;
END;
$$;

-- CREATE OR REPLACE leaves ownership and permissions unchanged, so the revokes
-- in 20260823130000 survive this migration on their own. They are restated
-- anyway: closing this exact hole already took two migrations because the
-- hosted project's ALTER DEFAULT PRIVILEGES grants EXECUTE to anon and
-- authenticated by name, and a reader who has to reason about whether a
-- replace preserved an ACL is one wrong assumption away from an anonymous
-- write path into corpus_versions and page_versions. Four idempotent lines
-- are cheaper than that doubt.
REVOKE ALL ON FUNCTION import_corpus_version(text, integer, text, text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION import_corpus_version(text, integer, text, text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION import_corpus_version(text, integer, text, text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION import_corpus_version(text, integer, text, text, jsonb) TO service_role;
