-- Migration to add review state and page checks to pages table
ALTER TABLE pages 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'needs-review',
ADD COLUMN IF NOT EXISTS manager_notes TEXT,
ADD COLUMN IF NOT EXISTS page_checks JSONB DEFAULT '{}'::jsonb;
alter publication supabase_realtime add table pages;
