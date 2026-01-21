-- Drop legacy columns that are no longer needed
-- Run this in Supabase SQL Editor

-- Drop from prompts table
ALTER TABLE prompts
DROP COLUMN IF EXISTS legacy_prompt_id,
DROP COLUMN IF EXISTS legacy_author_email;

-- Drop from collections table
ALTER TABLE collections
DROP COLUMN IF EXISTS legacy_collection_id,
DROP COLUMN IF EXISTS legacy_owner_email;

-- Drop from profiles table
ALTER TABLE profiles
DROP COLUMN IF EXISTS legacy_user_id,
DROP COLUMN IF EXISTS migrated_from_sqlite;
