-- Supabase PostgreSQL Functions for Prompt Gallery
-- Cost-optimized database functions to reduce round trips

-- ============================================
-- FUNCTION: Toggle Like (4 queries -> 1)
-- ============================================
CREATE OR REPLACE FUNCTION toggle_like(p_prompt_id UUID, p_user_id UUID)
RETURNS TABLE(liked BOOLEAN, like_count INT) AS $$
DECLARE
    v_existing_like UUID;
    v_new_count INT;
    v_author_id UUID;
BEGIN
    -- Check existing like
    SELECT id INTO v_existing_like 
    FROM likes 
    WHERE prompt_id = p_prompt_id AND user_id = p_user_id;
    
    -- Get author for stats update
    SELECT author_id INTO v_author_id FROM prompts WHERE id = p_prompt_id;
    
    IF v_existing_like IS NOT NULL THEN
        -- Unlike: remove the like
        DELETE FROM likes WHERE id = v_existing_like;
        
        -- Decrement prompt like count
        UPDATE prompts 
        SET like_count = GREATEST(0, prompts.like_count - 1)
        WHERE id = p_prompt_id 
        RETURNING prompts.like_count INTO v_new_count;
        
        -- Decrement author's total likes
        IF v_author_id IS NOT NULL THEN
            UPDATE profiles 
            SET total_likes = GREATEST(0, total_likes - 1)
            WHERE id = v_author_id;
        END IF;
        
        RETURN QUERY SELECT FALSE, v_new_count;
    ELSE
        -- Like: create new like
        INSERT INTO likes (prompt_id, user_id) 
        VALUES (p_prompt_id, p_user_id);
        
        -- Increment prompt like count
        UPDATE prompts 
        SET like_count = like_count + 1 
        WHERE id = p_prompt_id 
        RETURNING prompts.like_count INTO v_new_count;
        
        -- Increment author's total likes
        IF v_author_id IS NOT NULL THEN
            UPDATE profiles 
            SET total_likes = total_likes + 1
            WHERE id = v_author_id;
        END IF;
        
        RETURN QUERY SELECT TRUE, v_new_count;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Flush View Counts (called by Vercel Cron)
-- ============================================
CREATE OR REPLACE FUNCTION flush_view_counts() 
RETURNS TABLE(prompts_updated INT, views_flushed BIGINT) AS $$
DECLARE
    v_prompts_updated INT := 0;
    v_views_flushed BIGINT := 0;
BEGIN
    -- Only flush data older than 1 minute (avoid race conditions with recent views)
    WITH flushed AS (
        DELETE FROM view_buffer
        WHERE created_at < NOW() - INTERVAL '1 minute'
        RETURNING prompt_id, count
    ),
    aggregated AS (
        SELECT prompt_id, SUM(count)::BIGINT as total
        FROM flushed
        GROUP BY prompt_id
    ),
    updated AS (
        UPDATE prompts p
        SET view_count = p.view_count + a.total::INT,
            updated_at = NOW()
        FROM aggregated a
        WHERE p.id = a.prompt_id
        RETURNING 1
    )
    SELECT 
        (SELECT COUNT(*)::INT FROM updated),
        (SELECT COALESCE(SUM(total), 0) FROM aggregated)
    INTO v_prompts_updated, v_views_flushed;
    
    RETURN QUERY SELECT v_prompts_updated, v_views_flushed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Flush Copy Counts (called by Vercel Cron)
-- ============================================
CREATE OR REPLACE FUNCTION flush_copy_counts() 
RETURNS TABLE(prompts_updated INT, copies_flushed BIGINT) AS $$
DECLARE
    v_prompts_updated INT := 0;
    v_copies_flushed BIGINT := 0;
BEGIN
    WITH flushed AS (
        DELETE FROM copy_buffer
        WHERE created_at < NOW() - INTERVAL '1 minute'
        RETURNING prompt_id, count
    ),
    aggregated AS (
        SELECT prompt_id, SUM(count)::BIGINT as total
        FROM flushed
        GROUP BY prompt_id
    ),
    updated AS (
        UPDATE prompts p
        SET copy_count = p.copy_count + a.total::INT,
            updated_at = NOW()
        FROM aggregated a
        WHERE p.id = a.prompt_id
        RETURNING p.author_id, a.total
    ),
    author_updates AS (
        UPDATE profiles pr
        SET total_copies = pr.total_copies + u.total::INT
        FROM updated u
        WHERE pr.id = u.author_id AND u.author_id IS NOT NULL
        RETURNING 1
    )
    SELECT 
        (SELECT COUNT(*)::INT FROM updated),
        (SELECT COALESCE(SUM(total), 0) FROM aggregated)
    INTO v_prompts_updated, v_copies_flushed;
    
    RETURN QUERY SELECT v_prompts_updated, v_copies_flushed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Cleanup View Buffer (called hourly)
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_view_buffer() 
RETURNS INT AS $$
DECLARE
    v_deleted INT;
BEGIN
    DELETE FROM view_buffer 
    WHERE created_at < NOW() - INTERVAL '1 hour';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Cleanup Copy Buffer (called hourly)
-- ============================================
CREATE OR REPLACE FUNCTION cleanup_copy_buffer() 
RETURNS INT AS $$
DECLARE
    v_deleted INT;
BEGIN
    DELETE FROM copy_buffer 
    WHERE created_at < NOW() - INTERVAL '1 hour';
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Buffer a view (instead of direct update)
-- ============================================
CREATE OR REPLACE FUNCTION buffer_view(p_prompt_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO view_buffer (prompt_id, count)
    VALUES (p_prompt_id, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Buffer a copy (instead of direct update)
-- ============================================
CREATE OR REPLACE FUNCTION buffer_copy(p_prompt_id UUID)
RETURNS VOID AS $$
BEGIN
    INSERT INTO copy_buffer (prompt_id, count)
    VALUES (p_prompt_id, 1);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Get prompt with author and tags (single query)
-- ============================================
CREATE OR REPLACE FUNCTION get_prompt_by_slug(p_slug TEXT, p_user_id UUID DEFAULT NULL)
RETURNS TABLE(
    id UUID,
    title TEXT,
    slug TEXT,
    prompt_text TEXT,
    type TEXT,
    status TEXT,
    image_url TEXT,
    thumbnail_url TEXT,
    video_url TEXT,
    blurhash TEXT,
    category TEXT,
    style TEXT,
    metadata JSONB,
    view_count INT,
    copy_count INT,
    like_count INT,
    created_at TIMESTAMPTZ,
    published_at TIMESTAMPTZ,
    author_id UUID,
    author_username TEXT,
    author_name TEXT,
    author_avatar TEXT,
    tags TEXT[],
    is_liked BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.slug,
        p.prompt_text,
        p.type,
        p.status,
        p.image_url,
        p.thumbnail_url,
        p.video_url,
        p.blurhash,
        p.category,
        p.style,
        p.metadata,
        p.view_count,
        p.copy_count,
        p.like_count,
        p.created_at,
        p.published_at,
        pr.id AS author_id,
        pr.username AS author_username,
        pr.name AS author_name,
        pr.avatar_url AS author_avatar,
        ARRAY(
            SELECT t.name 
            FROM prompt_tags pt 
            JOIN tags t ON t.id = pt.tag_id 
            WHERE pt.prompt_id = p.id
        ) AS tags,
        CASE 
            WHEN p_user_id IS NULL THEN FALSE
            ELSE EXISTS(SELECT 1 FROM likes l WHERE l.prompt_id = p.id AND l.user_id = p_user_id)
        END AS is_liked
    FROM prompts p
    LEFT JOIN profiles pr ON pr.id = p.author_id
    WHERE p.slug = p_slug;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCTION: Update tag counts after prompt changes
-- ============================================
CREATE OR REPLACE FUNCTION update_tag_counts()
RETURNS TRIGGER AS $$
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
CREATE TRIGGER trigger_prompt_tags_count
    AFTER INSERT OR DELETE ON prompt_tags
    FOR EACH ROW EXECUTE FUNCTION update_tag_counts();

-- ============================================
-- FUNCTION: Update collection prompt count
-- ============================================
CREATE OR REPLACE FUNCTION update_collection_prompt_count()
RETURNS TRIGGER AS $$
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
CREATE TRIGGER trigger_collection_prompts_count
    AFTER INSERT OR DELETE ON collection_prompts
    FOR EACH ROW EXECUTE FUNCTION update_collection_prompt_count();

-- ============================================
-- FUNCTION: Update user prompt count
-- ============================================
CREATE OR REPLACE FUNCTION update_user_prompt_count()
RETURNS TRIGGER AS $$
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
CREATE TRIGGER trigger_prompts_user_count
    AFTER INSERT OR DELETE OR UPDATE OF author_id ON prompts
    FOR EACH ROW EXECUTE FUNCTION update_user_prompt_count();

-- ============================================
-- FUNCTION: Search prompts with full-text search
-- ============================================
CREATE OR REPLACE FUNCTION search_prompts(
    p_query TEXT,
    p_type TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_limit INT DEFAULT 20,
    p_offset INT DEFAULT 0
)
RETURNS TABLE(
    id UUID,
    title TEXT,
    slug TEXT,
    prompt_text TEXT,
    type TEXT,
    thumbnail_url TEXT,
    blurhash TEXT,
    like_count INT,
    copy_count INT,
    created_at TIMESTAMPTZ,
    author_id UUID,
    author_username TEXT,
    author_avatar TEXT,
    rank REAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.slug,
        p.prompt_text,
        p.type,
        p.thumbnail_url,
        p.blurhash,
        p.like_count,
        p.copy_count,
        p.created_at,
        pr.id AS author_id,
        pr.username AS author_username,
        pr.avatar_url AS author_avatar,
        ts_rank(
            to_tsvector('english', COALESCE(p.title, '') || ' ' || COALESCE(p.prompt_text, '')),
            websearch_to_tsquery('english', p_query)
        ) AS rank
    FROM prompts p
    LEFT JOIN profiles pr ON pr.id = p.author_id
    WHERE 
        p.status = 'published'
        AND to_tsvector('english', COALESCE(p.title, '') || ' ' || COALESCE(p.prompt_text, '')) 
            @@ websearch_to_tsquery('english', p_query)
        AND (p_type IS NULL OR p.type = p_type)
        AND (p_category IS NULL OR p.category = p_category)
    ORDER BY rank DESC, p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
