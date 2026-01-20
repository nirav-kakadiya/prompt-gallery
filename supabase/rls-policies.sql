-- Supabase Row Level Security (RLS) Policies for Prompt Gallery
-- Security-first approach with proper access control

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE view_buffer ENABLE ROW LEVEL SECURITY;
ALTER TABLE copy_buffer ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================
-- Anyone can view public profile info
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" ON profiles
    FOR SELECT USING (TRUE);

-- Users can update their own profile
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Users can insert their own profile (handled by trigger, but just in case)
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- ============================================
-- PROMPTS POLICIES
-- ============================================
-- Anyone can view published prompts
DROP POLICY IF EXISTS "Published prompts are viewable by everyone" ON prompts;
CREATE POLICY "Published prompts are viewable by everyone" ON prompts
    FOR SELECT USING (status = 'published');

-- Authors can view their own prompts (any status)
DROP POLICY IF EXISTS "Authors can view own prompts" ON prompts;
CREATE POLICY "Authors can view own prompts" ON prompts
    FOR SELECT USING (auth.uid() = author_id);

-- Authenticated users can create prompts
DROP POLICY IF EXISTS "Authenticated users can create prompts" ON prompts;
CREATE POLICY "Authenticated users can create prompts" ON prompts
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Authors can update their own prompts
DROP POLICY IF EXISTS "Authors can update own prompts" ON prompts;
CREATE POLICY "Authors can update own prompts" ON prompts
    FOR UPDATE USING (auth.uid() = author_id);

-- Authors can delete their own prompts
DROP POLICY IF EXISTS "Authors can delete own prompts" ON prompts;
CREATE POLICY "Authors can delete own prompts" ON prompts
    FOR DELETE USING (auth.uid() = author_id);

-- ============================================
-- TAGS POLICIES
-- ============================================
-- Anyone can view tags
DROP POLICY IF EXISTS "Tags are viewable by everyone" ON tags;
CREATE POLICY "Tags are viewable by everyone" ON tags
    FOR SELECT USING (TRUE);

-- Only authenticated users can create tags (when creating prompts)
DROP POLICY IF EXISTS "Authenticated users can create tags" ON tags;
CREATE POLICY "Authenticated users can create tags" ON tags
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- CATEGORIES POLICIES
-- ============================================
-- Anyone can view categories
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
CREATE POLICY "Categories are viewable by everyone" ON categories
    FOR SELECT USING (TRUE);

-- ============================================
-- PROMPT_TAGS POLICIES
-- ============================================
-- Anyone can view prompt-tag associations
DROP POLICY IF EXISTS "Prompt tags are viewable by everyone" ON prompt_tags;
CREATE POLICY "Prompt tags are viewable by everyone" ON prompt_tags
    FOR SELECT USING (TRUE);

-- Prompt authors can manage tags on their prompts
DROP POLICY IF EXISTS "Authors can manage prompt tags" ON prompt_tags;
CREATE POLICY "Authors can manage prompt tags" ON prompt_tags
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM prompts 
            WHERE prompts.id = prompt_tags.prompt_id 
            AND prompts.author_id = auth.uid()
        )
    );

-- ============================================
-- LIKES POLICIES
-- ============================================
-- Anyone can view likes (for counts)
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON likes;
CREATE POLICY "Likes are viewable by everyone" ON likes
    FOR SELECT USING (TRUE);

-- Users can manage their own likes
DROP POLICY IF EXISTS "Users can manage own likes" ON likes;
CREATE POLICY "Users can manage own likes" ON likes
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- COLLECTIONS POLICIES
-- ============================================
-- Anyone can view public collections
DROP POLICY IF EXISTS "Public collections are viewable by everyone" ON collections;
CREATE POLICY "Public collections are viewable by everyone" ON collections
    FOR SELECT USING (is_public = TRUE);

-- Owners can view their own collections (any visibility)
DROP POLICY IF EXISTS "Owners can view own collections" ON collections;
CREATE POLICY "Owners can view own collections" ON collections
    FOR SELECT USING (auth.uid() = owner_id);

-- Authenticated users can create collections
DROP POLICY IF EXISTS "Authenticated users can create collections" ON collections;
CREATE POLICY "Authenticated users can create collections" ON collections
    FOR INSERT WITH CHECK (auth.uid() = owner_id);

-- Owners can update their own collections
DROP POLICY IF EXISTS "Owners can update own collections" ON collections;
CREATE POLICY "Owners can update own collections" ON collections
    FOR UPDATE USING (auth.uid() = owner_id);

-- Owners can delete their own collections
DROP POLICY IF EXISTS "Owners can delete own collections" ON collections;
CREATE POLICY "Owners can delete own collections" ON collections
    FOR DELETE USING (auth.uid() = owner_id);

-- ============================================
-- COLLECTION_PROMPTS POLICIES
-- ============================================
-- Anyone can view prompts in public collections
DROP POLICY IF EXISTS "Collection prompts viewable for public collections" ON collection_prompts;
CREATE POLICY "Collection prompts viewable for public collections" ON collection_prompts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM collections 
            WHERE collections.id = collection_prompts.collection_id 
            AND (collections.is_public = TRUE OR collections.owner_id = auth.uid())
        )
    );

-- Collection owners can manage prompts in their collections
DROP POLICY IF EXISTS "Owners can manage collection prompts" ON collection_prompts;
CREATE POLICY "Owners can manage collection prompts" ON collection_prompts
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM collections 
            WHERE collections.id = collection_prompts.collection_id 
            AND collections.owner_id = auth.uid()
        )
    );

-- ============================================
-- SAVED_COLLECTIONS POLICIES
-- ============================================
-- Users can view their own saved collections
DROP POLICY IF EXISTS "Users can view own saved collections" ON saved_collections;
CREATE POLICY "Users can view own saved collections" ON saved_collections
    FOR SELECT USING (auth.uid() = user_id);

-- Users can manage their own saved collections
DROP POLICY IF EXISTS "Users can manage own saved collections" ON saved_collections;
CREATE POLICY "Users can manage own saved collections" ON saved_collections
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- VIEW_BUFFER POLICIES (service role only for cron)
-- ============================================
-- Anyone can insert views (anonymous tracking)
DROP POLICY IF EXISTS "Anyone can buffer views" ON view_buffer;
CREATE POLICY "Anyone can buffer views" ON view_buffer
    FOR INSERT WITH CHECK (TRUE);

-- Only service role can read/delete (for cron flush)
-- This is handled by SECURITY DEFINER on the flush function

-- ============================================
-- COPY_BUFFER POLICIES
-- ============================================
-- Anyone can insert copies
DROP POLICY IF EXISTS "Anyone can buffer copies" ON copy_buffer;
CREATE POLICY "Anyone can buffer copies" ON copy_buffer
    FOR INSERT WITH CHECK (TRUE);

-- ============================================
-- API_KEYS POLICIES
-- ============================================
-- Users can view their own API keys
DROP POLICY IF EXISTS "Users can view own API keys" ON api_keys;
CREATE POLICY "Users can view own API keys" ON api_keys
    FOR SELECT USING (auth.uid() = user_id);

-- Users can manage their own API keys
DROP POLICY IF EXISTS "Users can manage own API keys" ON api_keys;
CREATE POLICY "Users can manage own API keys" ON api_keys
    FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- CONTACT_MESSAGES POLICIES
-- ============================================
-- Anyone can submit contact messages
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON contact_messages;
CREATE POLICY "Anyone can submit contact messages" ON contact_messages
    FOR INSERT WITH CHECK (TRUE);

-- Only admins can view/manage (handled by service role in admin routes)

-- ============================================
-- REPORTS POLICIES
-- ============================================
-- Authenticated users can submit reports
DROP POLICY IF EXISTS "Authenticated users can submit reports" ON reports;
CREATE POLICY "Authenticated users can submit reports" ON reports
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR user_id IS NULL);

-- Users can view their own reports
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports" ON reports
    FOR SELECT USING (auth.uid() = user_id);

-- Only admins can view all reports (handled by service role)
