/**
 * Database Backend Feature Flags
 * 
 * Controls which database backend(s) are active for the application.
 * Enables gradual migration from SQLite to Supabase with dual-write support.
 * 
 * Migration phases:
 * 1. DB_BACKEND=sqlite     - Original behavior, SQLite only
 * 2. DB_BACKEND=both       - Dual-write mode, write to both DBs, read from SQLite
 * 3. DB_BACKEND=supabase   - Full Supabase mode, SQLite as fallback only
 * 
 * Note: On Vercel/serverless environments, SQLite is not available due to
 * lack of persistent filesystem. The code auto-detects this and uses Supabase.
 */

export type DbBackend = 'sqlite' | 'supabase' | 'both';

/**
 * Detect if running on Vercel or other serverless environment
 * where SQLite is not available
 */
const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

/**
 * Current database backend configuration
 * - On Vercel/serverless: Always use 'supabase' (SQLite not available)
 * - Locally: Respect DB_BACKEND env var, defaulting to 'sqlite'
 */
export const dbBackend: DbBackend = isServerless
    ? 'supabase'
    : (process.env.DB_BACKEND as DbBackend) || 'sqlite';

/**
 * Check if Supabase should be used for writes
 */
export function useSupabase(): boolean {
    return dbBackend === 'supabase' || dbBackend === 'both';
}

/**
 * Check if SQLite should be used for writes
 */
export function useSqlite(): boolean {
    return dbBackend === 'sqlite' || dbBackend === 'both';
}

/**
 * Check if we're in dual-write mode
 */
export function isDualWriteMode(): boolean {
    return dbBackend === 'both';
}

/**
 * Get the primary backend for reads
 * In 'both' mode, reads come from SQLite (known stable)
 * Once confident, switch to 'supabase' for reads from Supabase
 */
export function getPrimaryBackend(): 'sqlite' | 'supabase' {
    if (dbBackend === 'supabase') {
        return 'supabase';
    }
    // In 'sqlite' or 'both' mode, SQLite is primary for reads
    return 'sqlite';
}

/**
 * Check if realtime features should be enabled
 * Only enabled when Supabase is the primary backend
 */
export function isRealtimeEnabled(): boolean {
    return dbBackend === 'supabase';
}

/**
 * Feature flag configuration object for easy access
 */
export const dbFeatureFlags = {
    get backend() {
        return dbBackend;
    },
    get useSupabase() {
        return useSupabase();
    },
    get useSqlite() {
        return useSqlite();
    },
    get isDualWrite() {
        return isDualWriteMode();
    },
    get primaryBackend() {
        return getPrimaryBackend();
    },
    get realtimeEnabled() {
        return isRealtimeEnabled();
    }
} as const;

export default dbFeatureFlags;
