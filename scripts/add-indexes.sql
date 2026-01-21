-- Performance indexes for Prompt Gallery
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)

-- Indexes for prompts table
CREATE INDEX IF NOT EXISTS prompts_category_idx ON public.prompts (category);
CREATE INDEX IF NOT EXISTS prompts_style_idx ON public.prompts (style);
CREATE INDEX IF NOT EXISTS prompts_copy_count_idx ON public.prompts (copy_count DESC);
CREATE INDEX IF NOT EXISTS prompts_status_type_idx ON public.prompts (status, type);
CREATE INDEX IF NOT EXISTS prompts_status_created_idx ON public.prompts (status, created_at DESC);

-- Verify indexes were created
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'prompts'
ORDER BY indexname;
