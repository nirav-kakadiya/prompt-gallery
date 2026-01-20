-- ============================================
-- COMBINED SUPABASE SETUP SCRIPT
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================

-- ============================================
-- PART 1: SCHEMA
-- ============================================

-- PROFILES TABLE (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    username TEXT UNIQUE,
    name TEXT,
    bio TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'creator', 'moderator', 'admin')),
    prompt_count INT DEFAULT 0,
    total_copies INT DEFAULT 0,
    total_likes INT DEFAULT 0,
    legacy_user_id TEXT,
    migrated_from_sqlite BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- TAGS TABLE
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT,
    prompt_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    description TEXT,
    icon TEXT,
    parent_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    prompt_count INT DEFAULT 0,
    display_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_slug ON categories(slug);

-- PROMPTS TABLE
CREATE TABLE IF NOT EXISTS prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    prompt_text TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('text-to-image', 'text-to-video', 'image-to-image', 'image-to-video')),
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'pending_review', 'pending_image', 'processing', 'published', 'rejected', 'archived')),
    image_url TEXT,
    thumbnail_url TEXT,
    video_url TEXT,
    blurhash TEXT,
    category TEXT,
    style TEXT,
    source_url TEXT,
    source_type TEXT CHECK (source_type IN ('reddit', 'twitter', 'selection', 'web', 'api', 'other') OR source_type IS NULL),
    author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    legacy_prompt_id TEXT,
    legacy_author_email TEXT,
    metadata JSONB DEFAULT '{}',
    view_count INT DEFAULT 0,
    copy_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- Optimized indexes for prompts
CREATE INDEX IF NOT EXISTS idx_prompts_published_newest ON prompts(created_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_prompts_published_popular ON prompts(like_count DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_prompts_published_copied ON prompts(copy_count DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_prompts_type_status ON prompts(type, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_prompts_author ON prompts(author_id) WHERE author_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category, created_at DESC) WHERE status = 'published' AND category IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prompts_slug ON prompts(slug);
CREATE INDEX IF NOT EXISTS idx_prompts_legacy_id ON prompts(legacy_prompt_id) WHERE legacy_prompt_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_prompts_search ON prompts USING GIN (to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(prompt_text, '')));

-- PROMPT_TAGS JUNCTION TABLE
CREATE TABLE IF NOT EXISTS prompt_tags (
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (prompt_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_prompt_tags_tag ON prompt_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_prompt_tags_prompt ON prompt_tags(prompt_id);

-- LIKES TABLE
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, prompt_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_prompt ON likes(prompt_id);

-- COLLECTIONS TABLE
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    legacy_collection_id TEXT,
    legacy_owner_email TEXT,
    prompt_count INT DEFAULT 0,
    save_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collections_owner ON collections(owner_id);
CREATE INDEX IF NOT EXISTS idx_collections_public ON collections(is_public, created_at DESC) WHERE is_public = TRUE;

-- COLLECTION_PROMPTS JUNCTION TABLE
CREATE TABLE IF NOT EXISTS collection_prompts (
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    display_order INT DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (collection_id, prompt_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_prompts_collection ON collection_prompts(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_prompts_prompt ON collection_prompts(prompt_id);

-- SAVED_COLLECTIONS TABLE
CREATE TABLE IF NOT EXISTS saved_collections (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, collection_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_collections_user ON saved_collections(user_id);

-- VIEW_BUFFER TABLE (for batched updates)
CREATE TABLE IF NOT EXISTS view_buffer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_view_buffer_created ON view_buffer(created_at);
CREATE INDEX IF NOT EXISTS idx_view_buffer_prompt ON view_buffer(prompt_id);

-- COPY_BUFFER TABLE
CREATE TABLE IF NOT EXISTS copy_buffer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_copy_buffer_created ON copy_buffer(created_at);
CREATE INDEX IF NOT EXISTS idx_copy_buffer_prompt ON copy_buffer(prompt_id);

-- API_KEYS TABLE
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    key_hash TEXT NOT NULL,
    key_prefix TEXT NOT NULL,
    scopes JSONB DEFAULT '[]',
    last_used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON api_keys(key_prefix);

-- CONTACT_MESSAGES TABLE
CREATE TABLE IF NOT EXISTS contact_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'replied', 'archived')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);

-- REPORTS TABLE
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'inappropriate', 'copyright', 'other')),
    details TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_prompt ON reports(prompt_id);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);

-- ============================================
-- PART 2: TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated ON profiles;
CREATE TRIGGER trigger_profiles_updated BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_prompts_updated ON prompts;
CREATE TRIGGER trigger_prompts_updated BEFORE UPDATE ON prompts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_collections_updated ON collections;
CREATE TRIGGER trigger_collections_updated BEFORE UPDATE ON collections FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_contact_messages_updated ON contact_messages;
CREATE TRIGGER trigger_contact_messages_updated BEFORE UPDATE ON contact_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_reports_updated ON reports;
CREATE TRIGGER trigger_reports_updated BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO profiles (id, email, username, name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1)),
        COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
        NEW.raw_user_meta_data->>'avatar_url'
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- PART 3: FUNCTIONS
-- ============================================

-- Toggle Like (4 queries -> 1)
CREATE OR REPLACE FUNCTION toggle_like(p_prompt_id UUID, p_user_id UUID)
RETURNS TABLE(liked BOOLEAN, like_count INT) AS $$
DECLARE
    v_existing_like UUID;
    v_new_count INT;
    v_author_id UUID;
BEGIN
    SELECT id INTO v_existing_like FROM likes WHERE prompt_id = p_prompt_id AND user_id = p_user_id;
    SELECT author_id INTO v_author_id FROM prompts WHERE id = p_prompt_id;
    
    IF v_existing_like IS NOT NULL THEN
        DELETE FROM likes WHERE id = v_existing_like;
        UPDATE prompts SET like_count = GREATEST(0, prompts.like_count - 1) WHERE id = p_prompt_id RETURNING prompts.like_count INTO v_new_count;
        IF v_author_id IS NOT NULL THEN
            UPDATE profiles SET total_likes = GREATEST(0, total_likes - 1) WHERE id = v_author_id;
        END IF;
        RETURN QUERY SELECT FALSE, v_new_count;
    ELSE
        INSERT INTO likes (prompt_id, user_id) VALUES (p_prompt_id, p_user_id);
        UPDATE prompts SET like_count = like_count + 1 WHERE id = p_prompt_id RETURNING prompts.like_count INTO v_new_count;
        IF v_author_id IS NOT NULL THEN
            UPDATE profiles SET total_likes = total_likes + 1 WHERE id = v_author_id;
        END IF;
        RETURN QUERY SELECT TRUE, v_new_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Flush View Counts (called by Vercel Cron)
CREATE OR REPLACE FUNCTION flush_view_counts() 
RETURNS TABLE(prompts_updated INT, views_flushed BIGINT) AS $$
DECLARE
    v_prompts_updated INT := 0;
    v_views_flushed BIGINT := 0;
BEGIN
    WITH flushed AS (
        DELETE FROM view_buffer WHERE created_at < NOW() - INTERVAL '1 minute' RETURNING prompt_id, count
    ),
    aggregated AS (
        SELECT prompt_id, SUM(count)::BIGINT as total FROM flushed GROUP BY prompt_id
    ),
    updated AS (
        UPDATE prompts p SET view_count = p.view_count + a.total::INT, updated_at = NOW()
        FROM aggregated a WHERE p.id = a.prompt_id RETURNING 1
    )
    SELECT (SELECT COUNT(*)::INT FROM updated), (SELECT COALESCE(SUM(total), 0) FROM aggregated)
    INTO v_prompts_updated, v_views_flushed;
    RETURN QUERY SELECT v_prompts_updated, v_views_flushed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Flush Copy Counts
CREATE OR REPLACE FUNCTION flush_copy_counts() 
RETURNS TABLE(prompts_updated INT, copies_flushed BIGINT) AS $$
DECLARE
    v_prompts_updated INT := 0;
    v_copies_flushed BIGINT := 0;
BEGIN
    WITH flushed AS (
        DELETE FROM copy_buffer WHERE created_at < NOW() - INTERVAL '1 minute' RETURNING prompt_id, count
    ),
    aggregated AS (
        SELECT prompt_id, SUM(count)::BIGINT as total FROM flushed GROUP BY prompt_id
    ),
    updated AS (
        UPDATE prompts p SET copy_count = p.copy_count + a.total::INT, updated_at = NOW()
        FROM aggregated a WHERE p.id = a.prompt_id RETURNING p.author_id, a.total
    ),
    author_updates AS (
        UPDATE profiles pr SET total_copies = pr.total_copies + u.total::INT
        FROM updated u WHERE pr.id = u.author_id AND u.author_id IS NOT NULL RETURNING 1
    )
    SELECT (SELECT COUNT(*)::INT FROM updated), (SELECT COALESCE(SUM(total), 0) FROM aggregated)
    INTO v_prompts_updated, v_copies_flushed;
    RETURN QUERY SELECT v_prompts_updated, v_copies_flushed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Cleanup buffers
CREATE OR REPLACE FUNCTION cleanup_view_buffer() RETURNS INT AS $$
DECLARE v_deleted INT;
BEGIN
    DELETE FROM view_buffer WHERE created_at < NOW() - INTERVAL '1 hour';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION cleanup_copy_buffer() RETURNS INT AS $$
DECLARE v_deleted INT;
BEGIN
    DELETE FROM copy_buffer WHERE created_at < NOW() - INTERVAL '1 hour';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Buffer functions
CREATE OR REPLACE FUNCTION buffer_view(p_prompt_id UUID) RETURNS VOID AS $$
BEGIN
    INSERT INTO view_buffer (prompt_id, count) VALUES (p_prompt_id, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION buffer_copy(p_prompt_id UUID) RETURNS VOID AS $$
BEGIN
    INSERT INTO copy_buffer (prompt_id, count) VALUES (p_prompt_id, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get prompt with all data
CREATE OR REPLACE FUNCTION get_prompt_by_slug(p_slug TEXT, p_user_id UUID DEFAULT NULL)
RETURNS TABLE(
    id UUID, title TEXT, slug TEXT, prompt_text TEXT, type TEXT, status TEXT,
    image_url TEXT, thumbnail_url TEXT, video_url TEXT, blurhash TEXT,
    category TEXT, style TEXT, metadata JSONB, view_count INT, copy_count INT, like_count INT,
    created_at TIMESTAMPTZ, published_at TIMESTAMPTZ, author_id UUID,
    author_username TEXT, author_name TEXT, author_avatar TEXT, tags TEXT[], is_liked BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.title, p.slug, p.prompt_text, p.type, p.status,
        p.image_url, p.thumbnail_url, p.video_url, p.blurhash,
        p.category, p.style, p.metadata, p.view_count, p.copy_count, p.like_count,
        p.created_at, p.published_at, pr.id AS author_id,
        pr.username AS author_username, pr.name AS author_name, pr.avatar_url AS author_avatar,
        ARRAY(SELECT t.name FROM prompt_tags pt JOIN tags t ON t.id = pt.tag_id WHERE pt.prompt_id = p.id) AS tags,
        CASE WHEN p_user_id IS NULL THEN FALSE
             ELSE EXISTS(SELECT 1 FROM likes l WHERE l.prompt_id = p.id AND l.user_id = p_user_id)
        END AS is_liked
    FROM prompts p
    LEFT JOIN profiles pr ON pr.id = p.author_id
    WHERE p.slug = p_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update tag counts trigger
CREATE OR REPLACE FUNCTION update_tag_counts() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE tags SET prompt_count = prompt_count + 1 WHERE id = NEW.tag_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE tags SET prompt_count = GREATEST(0, prompt_count - 1) WHERE id = OLD.tag_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prompt_tags_count ON prompt_tags;
CREATE TRIGGER trigger_prompt_tags_count AFTER INSERT OR DELETE ON prompt_tags FOR EACH ROW EXECUTE FUNCTION update_tag_counts();

-- Update collection prompt count trigger
CREATE OR REPLACE FUNCTION update_collection_prompt_count() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE collections SET prompt_count = prompt_count + 1 WHERE id = NEW.collection_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE collections SET prompt_count = GREATEST(0, prompt_count - 1) WHERE id = OLD.collection_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_collection_prompts_count ON collection_prompts;
CREATE TRIGGER trigger_collection_prompts_count AFTER INSERT OR DELETE ON collection_prompts FOR EACH ROW EXECUTE FUNCTION update_collection_prompt_count();

-- Update user prompt count trigger
CREATE OR REPLACE FUNCTION update_user_prompt_count() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' AND NEW.author_id IS NOT NULL THEN
        UPDATE profiles SET prompt_count = prompt_count + 1 WHERE id = NEW.author_id;
    ELSIF TG_OP = 'DELETE' AND OLD.author_id IS NOT NULL THEN
        UPDATE profiles SET prompt_count = GREATEST(0, prompt_count - 1) WHERE id = OLD.author_id;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.author_id IS DISTINCT FROM NEW.author_id THEN
            IF OLD.author_id IS NOT NULL THEN
                UPDATE profiles SET prompt_count = GREATEST(0, prompt_count - 1) WHERE id = OLD.author_id;
            END IF;
            IF NEW.author_id IS NOT NULL THEN
                UPDATE profiles SET prompt_count = prompt_count + 1 WHERE id = NEW.author_id;
            END IF;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prompts_user_count ON prompts;
CREATE TRIGGER trigger_prompts_user_count AFTER INSERT OR DELETE OR UPDATE OF author_id ON prompts FOR EACH ROW EXECUTE FUNCTION update_user_prompt_count();

-- Full-text search function
CREATE OR REPLACE FUNCTION search_prompts(
    p_query TEXT, p_type TEXT DEFAULT NULL, p_category TEXT DEFAULT NULL,
    p_limit INT DEFAULT 20, p_offset INT DEFAULT 0
)
RETURNS TABLE(
    id UUID, title TEXT, slug TEXT, prompt_text TEXT, type TEXT,
    thumbnail_url TEXT, blurhash TEXT, like_count INT, copy_count INT, created_at TIMESTAMPTZ,
    author_id UUID, author_username TEXT, author_avatar TEXT, rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT p.id, p.title, p.slug, p.prompt_text, p.type,
        p.thumbnail_url, p.blurhash, p.like_count, p.copy_count, p.created_at,
        pr.id AS author_id, pr.username AS author_username, pr.avatar_url AS author_avatar,
        ts_rank(to_tsvector('english', COALESCE(p.title, '') || ' ' || COALESCE(p.prompt_text, '')),
                websearch_to_tsquery('english', p_query)) AS rank
    FROM prompts p
    LEFT JOIN profiles pr ON pr.id = p.author_id
    WHERE p.status = 'published'
        AND to_tsvector('english', COALESCE(p.title, '') || ' ' || COALESCE(p.prompt_text, '')) 
            @@ websearch_to_tsquery('english', p_query)
        AND (p_type IS NULL OR p.type = p_type)
        AND (p_category IS NULL OR p.category = p_category)
    ORDER BY rank DESC, p.created_at DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- PART 4: ROW LEVEL SECURITY
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

-- Profiles policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
CREATE POLICY "Profiles are viewable by everyone" ON profiles FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Prompts policies
DROP POLICY IF EXISTS "Published prompts are viewable by everyone" ON prompts;
CREATE POLICY "Published prompts are viewable by everyone" ON prompts FOR SELECT USING (status = 'published');
DROP POLICY IF EXISTS "Authors can view own prompts" ON prompts;
CREATE POLICY "Authors can view own prompts" ON prompts FOR SELECT USING (auth.uid() = author_id);
DROP POLICY IF EXISTS "Authenticated users can create prompts" ON prompts;
CREATE POLICY "Authenticated users can create prompts" ON prompts FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
DROP POLICY IF EXISTS "Authors can update own prompts" ON prompts;
CREATE POLICY "Authors can update own prompts" ON prompts FOR UPDATE USING (auth.uid() = author_id);
DROP POLICY IF EXISTS "Authors can delete own prompts" ON prompts;
CREATE POLICY "Authors can delete own prompts" ON prompts FOR DELETE USING (auth.uid() = author_id);

-- Tags policies
DROP POLICY IF EXISTS "Tags are viewable by everyone" ON tags;
CREATE POLICY "Tags are viewable by everyone" ON tags FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Authenticated users can create tags" ON tags;
CREATE POLICY "Authenticated users can create tags" ON tags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Categories policies
DROP POLICY IF EXISTS "Categories are viewable by everyone" ON categories;
CREATE POLICY "Categories are viewable by everyone" ON categories FOR SELECT USING (TRUE);

-- Prompt_tags policies
DROP POLICY IF EXISTS "Prompt tags are viewable by everyone" ON prompt_tags;
CREATE POLICY "Prompt tags are viewable by everyone" ON prompt_tags FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Authors can manage prompt tags" ON prompt_tags;
CREATE POLICY "Authors can manage prompt tags" ON prompt_tags FOR ALL USING (
    EXISTS (SELECT 1 FROM prompts WHERE prompts.id = prompt_tags.prompt_id AND prompts.author_id = auth.uid())
);

-- Likes policies
DROP POLICY IF EXISTS "Likes are viewable by everyone" ON likes;
CREATE POLICY "Likes are viewable by everyone" ON likes FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS "Users can manage own likes" ON likes;
CREATE POLICY "Users can manage own likes" ON likes FOR ALL USING (auth.uid() = user_id);

-- Collections policies
DROP POLICY IF EXISTS "Public collections are viewable by everyone" ON collections;
CREATE POLICY "Public collections are viewable by everyone" ON collections FOR SELECT USING (is_public = TRUE);
DROP POLICY IF EXISTS "Owners can view own collections" ON collections;
CREATE POLICY "Owners can view own collections" ON collections FOR SELECT USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Authenticated users can create collections" ON collections;
CREATE POLICY "Authenticated users can create collections" ON collections FOR INSERT WITH CHECK (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Owners can update own collections" ON collections;
CREATE POLICY "Owners can update own collections" ON collections FOR UPDATE USING (auth.uid() = owner_id);
DROP POLICY IF EXISTS "Owners can delete own collections" ON collections;
CREATE POLICY "Owners can delete own collections" ON collections FOR DELETE USING (auth.uid() = owner_id);

-- Collection_prompts policies
DROP POLICY IF EXISTS "Collection prompts viewable for public collections" ON collection_prompts;
CREATE POLICY "Collection prompts viewable for public collections" ON collection_prompts FOR SELECT USING (
    EXISTS (SELECT 1 FROM collections WHERE collections.id = collection_prompts.collection_id 
            AND (collections.is_public = TRUE OR collections.owner_id = auth.uid()))
);
DROP POLICY IF EXISTS "Owners can manage collection prompts" ON collection_prompts;
CREATE POLICY "Owners can manage collection prompts" ON collection_prompts FOR ALL USING (
    EXISTS (SELECT 1 FROM collections WHERE collections.id = collection_prompts.collection_id AND collections.owner_id = auth.uid())
);

-- Saved_collections policies
DROP POLICY IF EXISTS "Users can view own saved collections" ON saved_collections;
CREATE POLICY "Users can view own saved collections" ON saved_collections FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own saved collections" ON saved_collections;
CREATE POLICY "Users can manage own saved collections" ON saved_collections FOR ALL USING (auth.uid() = user_id);

-- Buffer policies (anyone can insert for anonymous tracking)
DROP POLICY IF EXISTS "Anyone can buffer views" ON view_buffer;
CREATE POLICY "Anyone can buffer views" ON view_buffer FOR INSERT WITH CHECK (TRUE);
DROP POLICY IF EXISTS "Anyone can buffer copies" ON copy_buffer;
CREATE POLICY "Anyone can buffer copies" ON copy_buffer FOR INSERT WITH CHECK (TRUE);

-- API keys policies
DROP POLICY IF EXISTS "Users can view own API keys" ON api_keys;
CREATE POLICY "Users can view own API keys" ON api_keys FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can manage own API keys" ON api_keys;
CREATE POLICY "Users can manage own API keys" ON api_keys FOR ALL USING (auth.uid() = user_id);

-- Contact messages policies
DROP POLICY IF EXISTS "Anyone can submit contact messages" ON contact_messages;
CREATE POLICY "Anyone can submit contact messages" ON contact_messages FOR INSERT WITH CHECK (TRUE);

-- Reports policies
DROP POLICY IF EXISTS "Authenticated users can submit reports" ON reports;
CREATE POLICY "Authenticated users can submit reports" ON reports FOR INSERT WITH CHECK (auth.uid() IS NOT NULL OR user_id IS NULL);
DROP POLICY IF EXISTS "Users can view own reports" ON reports;
CREATE POLICY "Users can view own reports" ON reports FOR SELECT USING (auth.uid() = user_id);

-- ============================================
-- SETUP COMPLETE!
-- ============================================
SELECT 'Supabase setup complete! All tables, functions, and RLS policies created.' as status;
