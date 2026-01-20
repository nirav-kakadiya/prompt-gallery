/**
 * Vercel KV Cache Layer
 * 
 * Serverless-compatible caching using Redis (Vercel KV).
 * In-memory caching does NOT work in serverless environments
 * because each request may hit a different instance.
 */

import { kv } from '@vercel/kv';

interface CacheOptions {
    /** Time to live in seconds (default: 60) */
    ttl?: number;
    /** Optional tags for grouped invalidation */
    tags?: string[];
}

interface CacheMetrics {
    hits: number;
    requests: number;
}

/**
 * Cache wrapper for Vercel KV with metrics tracking
 */
export const cache = {
    /**
     * Get cached data or fetch fresh data
     * Automatically tracks cache hit rate for monitoring
     */
    async getOrFetch<T>(
        key: string,
        fetcher: () => Promise<T>,
        options: CacheOptions = {}
    ): Promise<T> {
        const { ttl = 60 } = options;

        // Track total requests (fire and forget)
        kv.incr('metrics:cache_requests').catch(() => {
            // Silently fail - metrics shouldn't break the app
        });

        try {
            const cached = await kv.get<T>(key);
            if (cached !== null) {
                // Track cache hit
                kv.incr('metrics:cache_hits').catch(() => {});
                return cached;
            }
        } catch (error) {
            console.warn('[Cache] Read failed, fetching fresh:', error);
        }

        // Cache miss - fetch fresh data
        const data = await fetcher();

        try {
            await kv.set(key, data, { ex: ttl });
        } catch (error) {
            console.warn('[Cache] Write failed:', error);
        }

        return data;
    },

    /**
     * Get cached data without fetching
     */
    async get<T>(key: string): Promise<T | null> {
        try {
            return await kv.get<T>(key);
        } catch (error) {
            console.warn('[Cache] Get failed:', error);
            return null;
        }
    },

    /**
     * Set cache data directly
     */
    async set<T>(key: string, data: T, ttlSeconds = 60): Promise<void> {
        try {
            await kv.set(key, data, { ex: ttlSeconds });
        } catch (error) {
            console.warn('[Cache] Set failed:', error);
        }
    },

    /**
     * Delete a specific cache key
     */
    async del(key: string): Promise<void> {
        try {
            await kv.del(key);
        } catch (error) {
            console.warn('[Cache] Delete failed:', error);
        }
    },

    /**
     * Invalidate all cache keys matching a pattern
     * Use with caution - KEYS operation can be slow
     */
    async invalidatePattern(pattern: string): Promise<number> {
        try {
            const keys = await kv.keys(`*${pattern}*`);
            if (keys.length > 0) {
                await kv.del(...keys);
            }
            return keys.length;
        } catch (error) {
            console.warn('[Cache] Pattern invalidation failed:', error);
            return 0;
        }
    },

    /**
     * Invalidate multiple specific keys
     */
    async invalidateKeys(...keys: string[]): Promise<void> {
        if (keys.length === 0) return;
        try {
            await kv.del(...keys);
        } catch (error) {
            console.warn('[Cache] Keys invalidation failed:', error);
        }
    },

    /**
     * Get cache metrics for monitoring
     */
    async getMetrics(): Promise<CacheMetrics> {
        try {
            const [hits, requests] = await Promise.all([
                kv.get<number>('metrics:cache_hits'),
                kv.get<number>('metrics:cache_requests')
            ]);
            return {
                hits: hits ?? 0,
                requests: requests ?? 0
            };
        } catch (error) {
            console.warn('[Cache] Metrics fetch failed:', error);
            return { hits: 0, requests: 0 };
        }
    },

    /**
     * Reset cache metrics (useful for daily/weekly resets)
     */
    async resetMetrics(): Promise<void> {
        try {
            await Promise.all([
                kv.set('metrics:cache_hits', 0),
                kv.set('metrics:cache_requests', 0)
            ]);
        } catch (error) {
            console.warn('[Cache] Metrics reset failed:', error);
        }
    },

    /**
     * Increment a counter (useful for tracking)
     */
    async incr(key: string): Promise<number> {
        try {
            return await kv.incr(key);
        } catch (error) {
            console.warn('[Cache] Increment failed:', error);
            return 0;
        }
    },

    /**
     * Check if KV is connected and working
     */
    async healthCheck(): Promise<boolean> {
        try {
            const testKey = 'health:check';
            await kv.set(testKey, 'ok', { ex: 10 });
            const result = await kv.get(testKey);
            return result === 'ok';
        } catch (error) {
            console.error('[Cache] Health check failed:', error);
            return false;
        }
    }
};

// Cache key generators for consistent naming
export const cacheKeys = {
    prompts: (filters: object) => 
        `prompts:${JSON.stringify(filters)}`,
    
    prompt: (idOrSlug: string) => 
        `prompt:${idOrSlug}`,
    
    userPrompts: (userId: string, page: number) => 
        `user-prompts:${userId}:${page}`,
    
    collections: (userId: string) => 
        `collections:${userId}`,
    
    collection: (id: string) => 
        `collection:${id}`,
    
    tags: () => 
        'tags:all',
    
    categories: () => 
        'categories:all',
    
    trending: (period: string) => 
        `trending:${period}`,
    
    userLikes: (userId: string) => 
        `user-likes:${userId}`
};

// Default TTLs (in seconds) for different data types
export const cacheTTL = {
    /** Gallery listings - short TTL for freshness */
    prompts: 30,
    /** Individual prompt - slightly longer */
    prompt: 60,
    /** User-specific data - medium TTL */
    userPrompts: 60,
    /** Collections - longer TTL */
    collections: 120,
    /** Static data - long TTL */
    tags: 300,
    categories: 300,
    /** Trending - updates periodically */
    trending: 180
};

export default cache;
