/**
 * Prompt Repository
 * 
 * Data access layer for prompts with dual-write support and caching.
 * Handles the transition from SQLite to Supabase with feature flags.
 */

import { cache, cacheKeys, cacheTTL } from '@/lib/cache/kv-cache';
import { dbFeatureFlags, getPrimaryBackend } from '@/lib/db/feature-flag';
import { checkAndLogDivergence } from '@/lib/db/divergence-logger';
import { prisma } from '@/lib/prisma';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { parseJSON } from '@/lib/utils';
import type { PromptType, SortOption, Prompt, PromptCard } from '@/types';

export interface PromptFilters {
    query?: string;
    types?: PromptType[];
    tags?: string[];
    category?: string;
    style?: string;
    sortBy?: SortOption;
    page?: number;
    limit?: number;
    authorId?: string;
}

export interface CreatePromptDTO {
    title: string;
    slug: string;
    promptText: string;
    type: PromptType;
    tags?: string[];
    category?: string;
    style?: string;
    metadata?: Record<string, unknown>;
    imageUrl?: string;
    thumbnailUrl?: string;
    videoUrl?: string;
    authorId?: string;
    status?: string;
}

interface BackendResult {
    backend: 'sqlite' | 'supabase';
    result: unknown;
    error?: string;
}

/**
 * Transform SQLite prompt to standard format
 */
function transformSqlitePrompt(prompt: any): PromptCard {
    return {
        id: prompt.id,
        title: prompt.title,
        slug: prompt.slug,
        promptText: prompt.promptText,
        type: prompt.type as PromptType,
        thumbnailUrl: prompt.thumbnailUrl || prompt.imageUrl,
        blurhash: prompt.blurhash,
        tags: parseJSON<string[]>(prompt.tags, []),
        author: prompt.author ? {
            id: prompt.author.id,
            name: prompt.author.name,
            username: prompt.author.username,
            image: prompt.author.image
        } : null,
        copyCount: prompt.copyCount,
        likeCount: prompt.likeCount,
        createdAt: prompt.createdAt.toISOString()
    };
}

/**
 * Transform Supabase prompt to standard format
 */
function transformSupabasePrompt(prompt: any): PromptCard {
    return {
        id: prompt.id,
        title: prompt.title,
        slug: prompt.slug,
        promptText: prompt.prompt_text,
        type: prompt.type as PromptType,
        thumbnailUrl: prompt.thumbnail_url || prompt.image_url,
        blurhash: prompt.blurhash,
        tags: prompt.tags?.map((t: any) => t.tag?.name || t.name) || [],
        author: prompt.author ? {
            id: prompt.author.id,
            name: prompt.author.name,
            username: prompt.author.username,
            image: prompt.author.avatar_url
        } : null,
        copyCount: prompt.copy_count,
        likeCount: prompt.like_count,
        createdAt: prompt.created_at
    };
}

export class PromptRepository {
    /**
     * Get published prompts with filters and caching
     */
    async getPublishedPrompts(filters: PromptFilters): Promise<{
        prompts: PromptCard[];
        total: number;
    }> {
        const cacheKey = cacheKeys.prompts(filters);
        const primary = getPrimaryBackend();
        
        return cache.getOrFetch(
            cacheKey,
            async () => {
                if (primary === 'supabase') {
                    return this.getFromSupabase(filters);
                }
                return this.getFromSqlite(filters);
            },
            { ttl: cacheTTL.prompts }
        );
    }
    
    /**
     * Get prompts from SQLite via Prisma
     */
    private async getFromSqlite(filters: PromptFilters): Promise<{
        prompts: PromptCard[];
        total: number;
    }> {
        const {
            query,
            types,
            tags,
            category,
            style,
            sortBy = 'newest',
            page = 1,
            limit = 20,
            authorId
        } = filters;
        
        // Build where clause
        const where: Record<string, unknown> = {
            status: 'published'
        };
        
        if (query) {
            where.OR = [
                { title: { contains: query } },
                { promptText: { contains: query } }
            ];
        }
        
        if (types && types.length > 0) {
            where.type = { in: types };
        }
        
        if (category) {
            where.category = category;
        }
        
        if (style) {
            where.style = style;
        }
        
        if (authorId) {
            where.authorId = authorId;
        }
        
        // Build orderBy
        let orderBy: Record<string, string> = { createdAt: 'desc' };
        switch (sortBy) {
            case 'oldest':
                orderBy = { createdAt: 'asc' };
                break;
            case 'popular':
            case 'most_copied':
                orderBy = { copyCount: 'desc' };
                break;
            case 'most_liked':
                orderBy = { likeCount: 'desc' };
                break;
            case 'alphabetical':
                orderBy = { title: 'asc' };
                break;
        }
        
        // Execute queries
        const [total, prompts] = await Promise.all([
            prisma.prompt.count({ where }),
            prisma.prompt.findMany({
                where,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
                include: {
                    author: {
                        select: {
                            id: true,
                            name: true,
                            username: true,
                            image: true
                        }
                    }
                }
            })
        ]);
        
        // Transform and filter by tags (post-query for SQLite)
        let transformedPrompts = prompts.map(transformSqlitePrompt);
        
        if (tags && tags.length > 0) {
            transformedPrompts = transformedPrompts.filter(p =>
                tags.some(tag => p.tags.includes(tag))
            );
        }
        
        return { prompts: transformedPrompts, total };
    }
    
    /**
     * Get prompts from Supabase
     */
    private async getFromSupabase(filters: PromptFilters): Promise<{
        prompts: PromptCard[];
        total: number;
    }> {
        const {
            query,
            types,
            tags,
            category,
            style,
            sortBy = 'newest',
            page = 1,
            limit = 20,
            authorId
        } = filters;
        
        const supabase = await createServerClient();
        const offset = (page - 1) * limit;
        
        // Build query
        let dbQuery = supabase
            .from('prompts')
            .select(`
                id, title, slug, prompt_text, type,
                thumbnail_url, image_url, blurhash, like_count, copy_count,
                created_at,
                author:profiles!author_id(id, username, name, avatar_url),
                tags:prompt_tags(tag:tags(name, slug))
            `, { count: 'exact' })
            .eq('status', 'published');
        
        // Apply filters
        if (query) {
            dbQuery = dbQuery.textSearch('title', query, {
                type: 'websearch',
                config: 'english'
            });
        }
        
        if (types && types.length > 0) {
            dbQuery = dbQuery.in('type', types);
        }
        
        if (category) {
            dbQuery = dbQuery.eq('category', category);
        }
        
        if (style) {
            dbQuery = dbQuery.eq('style', style);
        }
        
        if (authorId) {
            dbQuery = dbQuery.eq('author_id', authorId);
        }
        
        // Apply sorting
        switch (sortBy) {
            case 'oldest':
                dbQuery = dbQuery.order('created_at', { ascending: true });
                break;
            case 'popular':
            case 'most_copied':
                dbQuery = dbQuery.order('copy_count', { ascending: false });
                break;
            case 'most_liked':
                dbQuery = dbQuery.order('like_count', { ascending: false });
                break;
            case 'alphabetical':
                dbQuery = dbQuery.order('title', { ascending: true });
                break;
            default:
                dbQuery = dbQuery.order('created_at', { ascending: false });
        }
        
        // Apply pagination
        dbQuery = dbQuery.range(offset, offset + limit - 1);
        
        const { data, count, error } = await dbQuery;
        
        if (error) {
            console.error('[PromptRepository] Supabase query failed:', error);
            throw new Error(`Failed to fetch prompts: ${error.message}`);
        }
        
        // Transform prompts
        let transformedPrompts = (data || []).map(transformSupabasePrompt);
        
        // Filter by tags if specified (tags in Supabase use junction table)
        if (tags && tags.length > 0) {
            transformedPrompts = transformedPrompts.filter(p =>
                tags.some(tag => p.tags.includes(tag))
            );
        }
        
        return {
            prompts: transformedPrompts,
            total: count || 0
        };
    }
    
    /**
     * Get a single prompt by ID or slug
     */
    async getPromptBySlug(slug: string, userId?: string): Promise<Prompt | null> {
        const cacheKey = cacheKeys.prompt(slug);
        const primary = getPrimaryBackend();
        
        return cache.getOrFetch(
            cacheKey,
            async () => {
                if (primary === 'supabase') {
                    return this.getPromptFromSupabase(slug, userId);
                }
                return this.getPromptFromSqlite(slug);
            },
            { ttl: cacheTTL.prompt }
        );
    }
    
    private async getPromptFromSqlite(slug: string): Promise<Prompt | null> {
        const prompt = await prisma.prompt.findUnique({
            where: { slug },
            include: {
                author: {
                    select: {
                        id: true,
                        name: true,
                        username: true,
                        image: true
                    }
                }
            }
        });
        
        if (!prompt) return null;
        
        return {
            id: prompt.id,
            title: prompt.title,
            slug: prompt.slug,
            promptText: prompt.promptText,
            type: prompt.type as PromptType,
            status: prompt.status as any,
            imageUrl: prompt.imageUrl,
            thumbnailUrl: prompt.thumbnailUrl,
            videoUrl: prompt.videoUrl,
            blurhash: prompt.blurhash,
            tags: parseJSON<string[]>(prompt.tags, []),
            category: prompt.category,
            style: prompt.style,
            authorId: prompt.authorId,
            author: prompt.author ? {
                id: prompt.author.id,
                name: prompt.author.name,
                username: prompt.author.username,
                image: prompt.author.image
            } : null,
            metadata: parseJSON(prompt.metadata, {}),
            viewCount: prompt.viewCount,
            copyCount: prompt.copyCount,
            likeCount: prompt.likeCount,
            createdAt: prompt.createdAt.toISOString(),
            updatedAt: prompt.updatedAt.toISOString(),
            publishedAt: prompt.publishedAt?.toISOString() || null
        };
    }
    
    private async getPromptFromSupabase(slug: string, userId?: string): Promise<Prompt | null> {
        const supabase = await createServerClient();
        
        // Use the optimized function if user ID is provided
        if (userId) {
            const { data, error } = await supabase
                .rpc('get_prompt_by_slug', { p_slug: slug, p_user_id: userId });
            
            if (error || !data || data.length === 0) return null;
            
            const p = data[0];
            return {
                id: p.id,
                title: p.title,
                slug: p.slug,
                promptText: p.prompt_text,
                type: p.type as PromptType,
                status: p.status as any,
                imageUrl: p.image_url,
                thumbnailUrl: p.thumbnail_url,
                videoUrl: p.video_url,
                blurhash: p.blurhash,
                tags: p.tags || [],
                category: p.category,
                style: p.style,
                authorId: p.author_id,
                author: p.author_id ? {
                    id: p.author_id,
                    name: p.author_name,
                    username: p.author_username,
                    image: p.author_avatar
                } : null,
                metadata: p.metadata as any || {},
                viewCount: p.view_count,
                copyCount: p.copy_count,
                likeCount: p.like_count,
                isLiked: p.is_liked,
                createdAt: p.created_at,
                updatedAt: p.created_at,
                publishedAt: p.published_at
            };
        }
        
        // Regular query without user context
        const { data, error } = await supabase
            .from('prompts')
            .select(`
                *,
                author:profiles!author_id(id, username, name, avatar_url),
                tags:prompt_tags(tag:tags(name))
            `)
            .eq('slug', slug)
            .single();
        
        if (error || !data) return null;
        
        return {
            id: data.id,
            title: data.title,
            slug: data.slug,
            promptText: data.prompt_text,
            type: data.type as PromptType,
            status: data.status as any,
            imageUrl: data.image_url,
            thumbnailUrl: data.thumbnail_url,
            videoUrl: data.video_url,
            blurhash: data.blurhash,
            tags: data.tags?.map((t: any) => t.tag?.name) || [],
            category: data.category,
            style: data.style,
            authorId: data.author_id,
            author: data.author ? {
                id: data.author.id,
                name: data.author.name,
                username: data.author.username,
                image: data.author.avatar_url
            } : null,
            metadata: data.metadata as any || {},
            viewCount: data.view_count,
            copyCount: data.copy_count,
            likeCount: data.like_count,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
            publishedAt: data.published_at
        };
    }
    
    /**
     * Create a new prompt with dual-write support
     */
    async create(data: CreatePromptDTO): Promise<{ id: string; slug: string }> {
        const results: BackendResult[] = [];
        
        // Write to SQLite if enabled
        if (dbFeatureFlags.useSqlite) {
            try {
                const result = await prisma.prompt.create({
                    data: {
                        title: data.title,
                        slug: data.slug,
                        promptText: data.promptText,
                        type: data.type,
                        tags: JSON.stringify(data.tags || []),
                        category: data.category,
                        style: data.style,
                        metadata: JSON.stringify(data.metadata || {}),
                        imageUrl: data.imageUrl,
                        thumbnailUrl: data.thumbnailUrl,
                        videoUrl: data.videoUrl,
                        authorId: data.authorId,
                        status: data.status || 'published',
                        publishedAt: data.status === 'published' ? new Date() : undefined
                    }
                });
                results.push({ backend: 'sqlite', result });
                
                // Update author prompt count
                if (data.authorId) {
                    await prisma.user.update({
                        where: { id: data.authorId },
                        data: { promptCount: { increment: 1 } }
                    });
                }
            } catch (error) {
                console.error('[PromptRepository] SQLite write failed:', error);
                results.push({ backend: 'sqlite', result: null, error: String(error) });
            }
        }
        
        // Write to Supabase if enabled
        if (dbFeatureFlags.useSupabase) {
            try {
                const supabase = await createServerClient();
                
                const { data: result, error } = await supabase
                    .from('prompts')
                    .insert({
                        title: data.title,
                        slug: data.slug,
                        prompt_text: data.promptText,
                        type: data.type,
                        category: data.category,
                        style: data.style,
                        metadata: data.metadata || {},
                        image_url: data.imageUrl,
                        thumbnail_url: data.thumbnailUrl,
                        video_url: data.videoUrl,
                        author_id: data.authorId,
                        status: data.status || 'published',
                        published_at: data.status === 'published' ? new Date().toISOString() : undefined
                    })
                    .select('id, slug')
                    .single();
                
                if (error) {
                    console.error('[PromptRepository] Supabase write failed:', error);
                    results.push({ backend: 'supabase', result: null, error: error.message });
                } else {
                    results.push({ backend: 'supabase', result });
                    
                    // Insert tags via junction table
                    if (data.tags && data.tags.length > 0 && result) {
                        for (const tagName of data.tags) {
                            // Upsert tag
                            const { data: tag } = await supabase
                                .from('tags')
                                .upsert({
                                    name: tagName,
                                    slug: tagName.toLowerCase().replace(/\s+/g, '-')
                                }, { onConflict: 'name' })
                                .select('id')
                                .single();
                            
                            if (tag) {
                                await supabase
                                    .from('prompt_tags')
                                    .insert({ prompt_id: result.id, tag_id: tag.id });
                            }
                        }
                    }
                }
            } catch (error) {
                console.error('[PromptRepository] Supabase exception:', error);
                results.push({ backend: 'supabase', result: null, error: String(error) });
            }
        }
        
        // Check for divergence in dual-write mode
        if (dbFeatureFlags.isDualWrite && results.length === 2) {
            await checkAndLogDivergence('prompt.create', results);
        }
        
        // Invalidate cache
        await cache.invalidatePattern('prompts:');
        
        // Return result from primary backend
        const primaryResult = results.find(r => r.backend === getPrimaryBackend());
        if (!primaryResult?.result) {
            throw new Error('Failed to create prompt');
        }
        
        const result = primaryResult.result as { id: string; slug: string };
        return { id: result.id, slug: result.slug };
    }
    
    /**
     * Buffer a view (for batched updates)
     */
    async bufferView(promptId: string): Promise<void> {
        if (dbFeatureFlags.useSupabase) {
            try {
                const supabase = await createServerClient();
                await supabase.rpc('buffer_view', { p_prompt_id: promptId });
            } catch (error) {
                console.error('[PromptRepository] Failed to buffer view:', error);
            }
        }
        
        // For SQLite, we still do direct updates (no cron available)
        if (dbFeatureFlags.useSqlite && !dbFeatureFlags.useSupabase) {
            await prisma.prompt.update({
                where: { id: promptId },
                data: { viewCount: { increment: 1 } }
            });
        }
    }
    
    /**
     * Buffer a copy (for batched updates)
     */
    async bufferCopy(promptId: string): Promise<void> {
        if (dbFeatureFlags.useSupabase) {
            try {
                const supabase = await createServerClient();
                await supabase.rpc('buffer_copy', { p_prompt_id: promptId });
            } catch (error) {
                console.error('[PromptRepository] Failed to buffer copy:', error);
            }
        }
        
        // For SQLite, do direct update
        if (dbFeatureFlags.useSqlite && !dbFeatureFlags.useSupabase) {
            await prisma.prompt.update({
                where: { id: promptId },
                data: { copyCount: { increment: 1 } }
            });
        }
    }
    
    /**
     * Invalidate all prompt-related caches
     */
    async invalidateCache(): Promise<void> {
        await Promise.all([
            cache.invalidatePattern('prompts:'),
            cache.invalidatePattern('prompt:'),
            cache.invalidatePattern('trending:')
        ]);
    }
}

// Export singleton instance
export const promptRepository = new PromptRepository();
export default promptRepository;
