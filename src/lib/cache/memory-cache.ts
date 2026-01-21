/**
 * Simple in-memory cache with TTL support
 * Works in both development and production (serverless-aware)
 * Falls back gracefully when Vercel KV is not configured
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// Use global to persist across hot reloads in dev
const globalCache = globalThis as unknown as {
  __memoryCache?: Map<string, CacheEntry<unknown>>;
};

if (!globalCache.__memoryCache) {
  globalCache.__memoryCache = new Map();
}

const cache = globalCache.__memoryCache;

export const memoryCache = {
  /**
   * Get cached data or fetch fresh
   */
  async getOrFetch<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttlSeconds = 60
  ): Promise<T> {
    const now = Date.now();
    const existing = cache.get(key) as CacheEntry<T> | undefined;

    if (existing && existing.expiresAt > now) {
      return existing.data;
    }

    // Fetch fresh data
    const data = await fetcher();

    // Store in cache
    cache.set(key, {
      data,
      expiresAt: now + ttlSeconds * 1000,
    });

    return data;
  },

  /**
   * Get cached data without fetching
   */
  get<T>(key: string): T | null {
    const entry = cache.get(key) as CacheEntry<T> | undefined;
    if (entry && entry.expiresAt > Date.now()) {
      return entry.data;
    }
    return null;
  },

  /**
   * Set cache data directly
   */
  set<T>(key: string, data: T, ttlSeconds = 60): void {
    cache.set(key, {
      data,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  },

  /**
   * Delete a specific cache key
   */
  del(key: string): void {
    cache.delete(key);
  },

  /**
   * Invalidate all keys matching a pattern
   */
  invalidatePattern(pattern: string): number {
    let count = 0;
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key);
        count++;
      }
    }
    return count;
  },

  /**
   * Clear all cache
   */
  clear(): void {
    cache.clear();
  },

  /**
   * Get cache stats
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: cache.size,
      keys: Array.from(cache.keys()),
    };
  },
};

// Cache key generators
export const cacheKeys = {
  prompts: (filters: Record<string, unknown>) =>
    `prompts:${JSON.stringify(filters)}`,
  prompt: (idOrSlug: string) => `prompt:${idOrSlug}`,
  trending: (period: string, sortBy: string) => `trending:${period}:${sortBy}`,
  categories: () => "categories:all",
  collections: (params: string) => `collections:${params}`,
};

// TTLs in seconds
export const cacheTTL = {
  prompts: 30,      // 30 seconds for listings
  prompt: 60,       // 1 minute for single prompt
  trending: 120,    // 2 minutes for trending
  categories: 300,  // 5 minutes for categories
  collections: 60,  // 1 minute for collections
};

export default memoryCache;
