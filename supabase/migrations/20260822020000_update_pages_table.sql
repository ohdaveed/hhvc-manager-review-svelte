-- Migration to add review state and page checks to pages table
ALTER TABLE pages
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'needs-review',
ADD COLUMN IF NOT EXISTS manager_notes TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS page_checks JSONB NOT NULL DEFAULT '{}'::jsonb;

-- The columns above use ADD COLUMN IF NOT EXISTS, so on a database where an
-- earlier version of this migration already created them the NOT NULL and
-- DEFAULT clauses are skipped entirely. Apply them explicitly so the shape is
-- the same whether this runs on a fresh database or an already-migrated one.
UPDATE pages SET status = 'needs-review' WHERE status IS NULL;
UPDATE pages SET manager_notes = '' WHERE manager_notes IS NULL;
UPDATE pages SET page_checks = '{}'::jsonb WHERE page_checks IS NULL;

ALTER TABLE pages
ALTER COLUMN status SET DEFAULT 'needs-review',
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN manager_notes SET DEFAULT '',
ALTER COLUMN manager_notes SET NOT NULL,
ALTER COLUMN page_checks SET DEFAULT '{}'::jsonb,
ALTER COLUMN page_checks SET NOT NULL;

-- Postgres has no ADD CONSTRAINT IF NOT EXISTS, and a bare ADD CONSTRAINT
-- aborts the whole migration on re-run. Drop first so this stays idempotent.
ALTER TABLE pages DROP CONSTRAINT IF EXISTS pages_status_check;
ALTER TABLE pages
ADD CONSTRAINT pages_status_check
CHECK (status IN ('needs-review', 'approved', 'blocked', 'revise'));

-- Likewise, adding a table to a publication twice is an error.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE pages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;
