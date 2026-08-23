-- Corpus version snapshots.
--
-- The mockups are redesigned in a separate app and re-ported by hand into
-- src/lib/data. Before this, a renamed or dropped slug orphaned its `pages`
-- row -- which still held a reviewer's status, notes and checks -- pointing at
-- a path the app no longer rendered. Nothing errored; the work just stopped
-- being reachable. These tables make each re-port a recorded version so the
-- change is legible instead of silent.
--
-- Written only by `bun run corpus:import`, which uses the service-role key and
-- therefore bypasses RLS. Authenticated clients read; they never write.

CREATE TABLE IF NOT EXISTS corpus_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    git_sha text,
    imported_at timestamptz NOT NULL DEFAULT now(),
    note text,
    page_count integer NOT NULL,
    corpus_hash text NOT NULL UNIQUE,
    -- Imports run with service_role and therefore have no auth.uid(); NULL
    -- denotes the shared, immutable corpus rather than a user's private data.
    created_by uuid REFERENCES auth.users (id)
);

COMMENT ON COLUMN corpus_versions.corpus_hash IS
    'Hash over every page hash, sorted by path. UNIQUE is what makes corpus:import idempotent: re-running against an unchanged corpus conflicts instead of minting a duplicate version.';

CREATE TABLE IF NOT EXISTS page_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    corpus_version_id uuid NOT NULL REFERENCES corpus_versions (id) ON DELETE CASCADE,
    path text NOT NULL,
    content jsonb NOT NULL,
    content_hash text NOT NULL,
    field_hashes jsonb NOT NULL,
    UNIQUE (corpus_version_id, path)
);

COMMENT ON COLUMN page_versions.content IS
    'Full page snapshot including karl/editorNote/editorStatus. Those travel here so they are never lost, but they are excluded from content_hash.';
COMMENT ON COLUMN page_versions.content_hash IS
    'Reader-visible copy only. Editing an editorNote must not mint a version.';
COMMENT ON COLUMN page_versions.field_hashes IS
    'field_id -> sha256 of that field text. A later slice expires an accepted edit when its own field hash moves; a single per-page hash would expire every accepted edit on the page whenever any part of it changed.';

CREATE INDEX IF NOT EXISTS page_versions_path_idx ON page_versions (path);

ALTER TABLE corpus_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_versions ENABLE ROW LEVEL SECURITY;

-- Idempotent, matching the style of 20260822030000: Postgres has no
-- CREATE POLICY IF NOT EXISTS, and a bare CREATE aborts the migration on re-run.
DROP POLICY IF EXISTS "corpus_versions_select" ON corpus_versions;
DROP POLICY IF EXISTS "page_versions_select" ON page_versions;

CREATE POLICY "corpus_versions_select" ON corpus_versions
    FOR SELECT TO authenticated
    USING (created_by IS NULL OR created_by = (SELECT auth.uid()));

CREATE POLICY "page_versions_select" ON page_versions
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM corpus_versions
            WHERE corpus_versions.id = page_versions.corpus_version_id
              AND (corpus_versions.created_by IS NULL
                   OR corpus_versions.created_by = (SELECT auth.uid()))
        )
    );
