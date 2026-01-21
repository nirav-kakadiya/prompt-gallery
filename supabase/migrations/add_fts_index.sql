-- Full-Text Search Index for Prompts
-- Run this in the Supabase SQL Editor to enable efficient text search

-- Create GIN index for full-text search on prompts
CREATE INDEX IF NOT EXISTS idx_prompts_fts
ON prompts USING GIN (
  to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(prompt_text, ''))
);

-- Optional: Create a generated column for the tsvector to improve query performance
-- This pre-computes the tsvector so searches don't need to compute it at query time
-- Uncomment if you want to use this optimization:

-- ALTER TABLE prompts
-- ADD COLUMN IF NOT EXISTS search_vector tsvector
-- GENERATED ALWAYS AS (
--   to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(prompt_text, ''))
-- ) STORED;

-- CREATE INDEX IF NOT EXISTS idx_prompts_search_vector
-- ON prompts USING GIN (search_vector);
