-- Every edit records the hash of its field's base copy at save time
-- (docs/adr/0001-edits-anchor-to-base-copy-hash.md). An edit is expired when
-- that hash differs from the hash of the field's base copy now.
--
-- The column is REQUIRED, and nothing is backfilled: production held 0 edits
-- when this was decided and again when it was re-checked (2026-11-26). An edit
-- saved before this migration has no record of the copy it answered, and
-- inventing one -- from corpus-version timing, say -- would pass a guess off as
-- a fact. So this refuses to run while any edit exists, rather than adding the
-- column with a default that would be wrong for every one of them.
DO $$
DECLARE
    n bigint;
BEGIN
    SELECT count(*) INTO n FROM public.edits;
    IF n > 0 THEN
        RAISE EXCEPTION
            'edits holds % row(s) with no base copy hash; ADR 0001 forbids inventing one. Resolve them before applying this migration.', n;
    END IF;
END
$$;

-- sha256 hex, as `hashText` and `hashTextBrowser` produce and as
-- `page_versions.field_hashes` stores. Lowercase only: both producers emit it,
-- and a comparison against a mixed-case value would report a spurious expiry.
ALTER TABLE public.edits
    ADD COLUMN base_hash text NOT NULL
    CONSTRAINT edits_base_hash_sha256 CHECK (base_hash ~ '^[0-9a-f]{64}$');

COMMENT ON COLUMN public.edits.base_hash IS
    'sha256 (hex) of the field''s base copy -- corpus text, or the drafted text on a draft page -- when the edit was saved. Expired when it differs from the base copy''s hash now. See docs/adr/0001-edits-anchor-to-base-copy-hash.md.';

-- `latest_edits` is `SELECT *`, and Postgres fixes a view's column list when
-- the view is created, so it does not gain `base_hash` on its own. Re-created
-- exactly as 20260827110000 defined it; DROP then CREATE, because CREATE OR
-- REPLACE cannot change a view's column list.
DROP VIEW IF EXISTS public.latest_edits;

-- `security_invoker = true` keeps `edits`' RLS applying to readers of the view;
-- see 20260827110000 for why that is load bearing.
CREATE VIEW public.latest_edits WITH (security_invoker = true) AS
SELECT DISTINCT ON (page_id, field_id) *
FROM public.edits
ORDER BY page_id, field_id, created_at DESC, id DESC;

COMMENT ON VIEW public.latest_edits IS
    'The newest edit per (page_id, field_id). loadReview() reads this rather than `edits` so its response is bounded by field count instead of by an append-only history PostgREST silently truncates at max_rows. Realtime still subscribes to `edits` -- publications carry tables, not views.';

GRANT SELECT ON public.latest_edits TO authenticated;
