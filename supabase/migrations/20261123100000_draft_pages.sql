-- AI-drafted review pages.
--
-- A drafted page is not part of the static corpus in src/lib/data, so its
-- content has to live somewhere a reviewer's browser can read it. This table
-- holds the draft (title, description, content as jsonb) and its generation
-- state. The review decision -- status, manager notes, checks -- stays on the
-- existing `pages` table, which keeps carrying it; the two are joined by a
-- shared `path` of the reserved form `draft:<uuid>`.
--
-- Written only by a server route using the service-role key, which bypasses
-- RLS. Authenticated clients read; they never write. That mirrors `pages`,
-- which has no INSERT policy either, so there is no policy here beyond SELECT.
--
-- Safe to apply to a database that already has rows in `reviews` and `pages`:
-- it only adds a table that references `reviews` and touches no existing row.

CREATE TABLE IF NOT EXISTS draft_pages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id uuid NOT NULL REFERENCES reviews (id) ON DELETE CASCADE,
    path text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    state text NOT NULL DEFAULT 'drafting',
    content jsonb,
    valid boolean,
    issues jsonb,
    model text,
    created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (review_id, path),
    CHECK (state IN ('drafting', 'ready', 'failed'))
);

COMMENT ON COLUMN draft_pages.path IS
    'Reserved form draft:<uuid>, not a derived slug. A uuid cannot collide with a corpus slug or with another draft, which removes slug-collision handling entirely. The same value is the `path` of this draft''s row in `pages`.';
COMMENT ON COLUMN draft_pages.state IS
    'drafting while generation runs, ready once content is stored, failed if it could not be produced. The client branches on exactly these three.';

ALTER TABLE draft_pages ENABLE ROW LEVEL SECURITY;

-- Idempotent, matching 20260822030000: Postgres has no CREATE POLICY IF NOT
-- EXISTS, and a bare CREATE aborts the migration on re-run.
DROP POLICY IF EXISTS "draft_pages_select" ON draft_pages;

CREATE POLICY "draft_pages_select" ON draft_pages
    FOR SELECT TO authenticated USING (true);

-- Stated rather than inherited, per 20260823140000: a local Postgres has no
-- equivalent of Supabase's ALTER DEFAULT PRIVILEGES, so without this the table
-- works against the hosted project and fails locally with 42501.
GRANT SELECT ON draft_pages TO authenticated;
