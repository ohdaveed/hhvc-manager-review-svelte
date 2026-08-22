-- Supabase Database Schema for HHVC Manager Review Tool
-- Copy and paste this into your Supabase SQL Editor

-- 1. Reviews Table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Pages Table (Mockup pages within a review)
CREATE TABLE pages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    review_id UUID REFERENCES reviews(id) ON DELETE CASCADE NOT NULL,
    path TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Comments Table (Feedback left by reviewers)
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID REFERENCES pages(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    field_id TEXT NOT NULL, -- The ID/Name of the DOM element being commented on
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Edits Table (Inline content edits)
CREATE TABLE edits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    page_id UUID REFERENCES pages(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    field_id TEXT NOT NULL,
    new_content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE edits ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies
-- For this internal tool, we allow all authenticated users full access.
-- You can restrict this later (e.g., using a review_users join table).
CREATE POLICY "Allow authenticated full access to reviews" ON reviews FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access to pages" ON pages FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access to comments" ON comments FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow authenticated full access to edits" ON edits FOR ALL TO authenticated USING (true);

-- Enable Realtime for the sync tables
alter publication supabase_realtime add table comments;
alter publication supabase_realtime add table edits;
