-- Supabase PostgreSQL Schema for Prompt Gallery
-- This schema is designed for production with cost optimization in mind

-- ============================================
-- PROFILES TABLE (extends Supabase auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE,
    username TEXT UNIQUE,
    name TEXT,
    bio TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'creator', 'moderator', 'admin')),
    
    -- Stats (denormalized for performance)
    prompt_count INT DEFAULT 0,
    total_copies INT DEFAULT 0,
    total_likes INT DEFAULT 0,
    
    -- Migration tracking
    legacy_user_id TEXT,
    migrated_from_sqlite BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TAGS TABLE (replaces JSON string in SQLite)
-- ============================================
CREATE TABLE IF NOT EXISTS tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT UNIQUE NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    category TEXT,
    prompt_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for tag lookups
CREATE INDEX IF NOT EXISTS idx_tags_slug ON tags(slug);
CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);

-- ============================================
-- CATEGORIES TABLE
-- ============================================
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

-- ============================================
-- PROMPTS TABLE (main content table)
-- ============================================
CREATE TABLE IF NOT EXISTS prompts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    prompt_text TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('text-to-image', 'text-to-video', 'image-to-image', 'image-to-video')),
    status TEXT DEFAULT 'published' CHECK (status IN ('draft', 'pending_review', 'pending_image', 'processing', 'published', 'rejected', 'archived')),
    
    -- Media
    image_url TEXT,
    thumbnail_url TEXT,
    video_url TEXT,
    blurhash TEXT,
    
    -- Categorization
    category TEXT,
    style TEXT,
    
    -- Source (for extension imports)
    source_url TEXT,
    source_type TEXT CHECK (source_type IN ('reddit', 'twitter', 'selection', 'web', 'api', 'other') OR source_type IS NULL),
    
    -- Author
    author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    
    -- Legacy migration tracking
    legacy_prompt_id TEXT,
    legacy_author_email TEXT,
    
    -- Metadata (JSONB for flexibility)
    metadata JSONB DEFAULT '{}',
    
    -- Stats (denormalized for performance)
    view_count INT DEFAULT 0,
    copy_count INT DEFAULT 0,
    like_count INT DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

-- OPTIMIZED INDEXES (partial indexes for common filters)

-- Partial index: Only published prompts (most queries filter on this)
CREATE INDEX IF NOT EXISTS idx_prompts_published_newest ON prompts(created_at DESC) 
    WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_prompts_published_popular ON prompts(like_count DESC) 
    WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_prompts_published_copied ON prompts(copy_count DESC) 
    WHERE status = 'published';

-- Composite for type + status filtering
CREATE INDEX IF NOT EXISTS idx_prompts_type_status ON prompts(type, status, created_at DESC);

-- Author lookups
CREATE INDEX IF NOT EXISTS idx_prompts_author ON prompts(author_id) WHERE author_id IS NOT NULL;

-- Category filtering (partial - only published)
CREATE INDEX IF NOT EXISTS idx_prompts_category ON prompts(category, created_at DESC) 
    WHERE status = 'published' AND category IS NOT NULL;

-- Slug lookup (unique already creates index, but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_prompts_slug ON prompts(slug);

-- Legacy ID for migration
CREATE INDEX IF NOT EXISTS idx_prompts_legacy_id ON prompts(legacy_prompt_id) 
    WHERE legacy_prompt_id IS NOT NULL;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_prompts_search ON prompts USING GIN (
    to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(prompt_text, ''))
);

-- ============================================
-- PROMPT_TAGS JUNCTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS prompt_tags (
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (prompt_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_prompt_tags_tag ON prompt_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_prompt_tags_prompt ON prompt_tags(prompt_id);

-- ============================================
-- LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(user_id, prompt_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_prompt ON likes(prompt_id);

-- ============================================
-- COLLECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    cover_image_url TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    owner_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    
    -- Legacy migration tracking
    legacy_collection_id TEXT,
    legacy_owner_email TEXT,
    
    -- Stats
    prompt_count INT DEFAULT 0,
    save_count INT DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_collections_owner ON collections(owner_id);
CREATE INDEX IF NOT EXISTS idx_collections_public ON collections(is_public, created_at DESC) 
    WHERE is_public = TRUE;

-- ============================================
-- COLLECTION_PROMPTS JUNCTION TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS collection_prompts (
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    display_order INT DEFAULT 0,
    added_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (collection_id, prompt_id)
);

CREATE INDEX IF NOT EXISTS idx_collection_prompts_collection ON collection_prompts(collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_prompts_prompt ON collection_prompts(prompt_id);

-- ============================================
-- SAVED_COLLECTIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS saved_collections (
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
    saved_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, collection_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_collections_user ON saved_collections(user_id);

-- ============================================
-- VIEW_BUFFER TABLE (for batched view count updates)
-- ============================================
CREATE TABLE IF NOT EXISTS view_buffer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient cron cleanup
CREATE INDEX IF NOT EXISTS idx_view_buffer_created ON view_buffer(created_at);
CREATE INDEX IF NOT EXISTS idx_view_buffer_prompt ON view_buffer(prompt_id);

-- ============================================
-- COPY_BUFFER TABLE (for batched copy count updates)
-- ============================================
CREATE TABLE IF NOT EXISTS copy_buffer (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    count INT DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_copy_buffer_created ON copy_buffer(created_at);
CREATE INDEX IF NOT EXISTS idx_copy_buffer_prompt ON copy_buffer(prompt_id);

-- ============================================
-- API_KEYS TABLE (for extension authentication)
-- ============================================
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

-- ============================================
-- CONTACT_MESSAGES TABLE
-- ============================================
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

-- ============================================
-- REPORTS TABLE
-- ============================================
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
-- TRIGGERS FOR AUTOMATIC TIMESTAMPS
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to tables with updated_at
DROP TRIGGER IF EXISTS trigger_profiles_updated ON profiles;
CREATE TRIGGER trigger_profiles_updated
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_prompts_updated ON prompts;
CREATE TRIGGER trigger_prompts_updated
    BEFORE UPDATE ON prompts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_collections_updated ON collections;
CREATE TRIGGER trigger_collections_updated
    BEFORE UPDATE ON collections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_contact_messages_updated ON contact_messages;
CREATE TRIGGER trigger_contact_messages_updated
    BEFORE UPDATE ON contact_messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_reports_updated ON reports;
CREATE TRIGGER trigger_reports_updated
    BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- TRIGGER: Auto-create profile on user signup
-- ============================================
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
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
