-- Migration to add review state and page checks to pages table
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'needs-review',
ADD COLUMN IF NOT EXISTS manager_notes TEXT NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS page_checks JSONB NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE pages
ADD CONSTRAINT pages_status_check
CHECK (status IN ('needs-review', 'approved', 'blocked', 'revise'));

alter publication supabase_realtime add table pages;
