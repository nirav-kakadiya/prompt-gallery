/**
 * Data Divergence Logger
 * 
 * Tracks and logs data divergence between SQLite and Supabase
 * during dual-write migration period. Essential for identifying
 * sync issues before fully switching to Supabase.
 */

import { kv } from '@vercel/kv';

interface DivergenceLog {
    operation: string;
    timestamp: string;
    sqliteResult: unknown;
    supabaseResult: unknown;
    diff: string[];
    severity: 'warning' | 'error';
}

interface BackendResult {
    backend: 'sqlite' | 'supabase';
    result: unknown;
    error?: string;
}

/**
 * Compare two results and find differences
 */
function findDifferences(
    sqlite: Record<string, unknown> | null,
    supabase: Record<string, unknown> | null,
    ignoreFields: string[] = ['id', 'created_at', 'updated_at', 'createdAt', 'updatedAt']
): string[] {
    const diff: string[] = [];
    
    if (!sqlite && !supabase) return diff;
    if (!sqlite) return ['sqlite result is null'];
    if (!supabase) return ['supabase result is null'];
    
    const allKeys = new Set([
        ...Object.keys(sqlite),
        ...Object.keys(supabase)
    ]);
    
    for (const key of allKeys) {
        // Skip ignored fields (timestamps, auto-generated IDs)
        if (ignoreFields.includes(key)) continue;
        
        const sqliteVal = sqlite[key];
        const supabaseVal = supabase[key];
        
        // Convert snake_case to camelCase for comparison
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        const supabaseCamelVal = supabase[camelKey];
        
        // Compare values (handle both snake_case and camelCase)
        const sqliteStr = JSON.stringify(sqliteVal);
        const supabaseStr = JSON.stringify(supabaseVal ?? supabaseCamelVal);
        
        if (sqliteStr !== supabaseStr) {
            diff.push(`${key}: sqlite=${sqliteStr} vs supabase=${supabaseStr}`);
        }
    }
    
    return diff;
}

/**
 * Log data divergence between SQLite and Supabase
 */
export async function logDataDivergence(
    operation: string,
    results: BackendResult[],
    compareFields?: string[]
): Promise<void> {
    const sqlite = results.find(r => r.backend === 'sqlite');
    const supabase = results.find(r => r.backend === 'supabase');
    
    // Check for errors first
    const hasError = sqlite?.error || supabase?.error;
    
    // Find specific differences
    const diff = findDifferences(
        sqlite?.result as Record<string, unknown> | null,
        supabase?.result as Record<string, unknown> | null,
        compareFields ? undefined : ['id', 'created_at', 'updated_at', 'createdAt', 'updatedAt']
    );
    
    // Add error info to diff
    if (sqlite?.error) diff.push(`sqlite error: ${sqlite.error}`);
    if (supabase?.error) diff.push(`supabase error: ${supabase.error}`);
    
    const log: DivergenceLog = {
        operation,
        timestamp: new Date().toISOString(),
        sqliteResult: sqlite?.result ?? null,
        supabaseResult: supabase?.result ?? null,
        diff,
        severity: hasError ? 'error' : 'warning'
    };
    
    try {
        // Store in Vercel KV with 7-day TTL
        const key = `divergence:${Date.now()}:${operation.replace(/\./g, '-')}`;
        await kv.set(key, log, { ex: 60 * 60 * 24 * 7 });
        
        // Increment divergence counter for monitoring
        await kv.incr('metrics:divergence_count');
        
        // Log to console for immediate visibility
        console.error('[DATA DIVERGENCE]', {
            operation,
            diff,
            severity: log.severity
        });
    } catch (error) {
        // Don't let logging failures affect the main operation
        console.error('[Divergence Logger] Failed to log divergence:', error);
    }
}

/**
 * Check for divergence and log if found
 */
export async function checkAndLogDivergence(
    operation: string,
    results: BackendResult[],
    compareFields: string[] = ['title', 'slug', 'prompt_text', 'promptText', 'type', 'status']
): Promise<boolean> {
    const sqlite = results.find(r => r.backend === 'sqlite');
    const supabase = results.find(r => r.backend === 'supabase');
    
    // Check for errors
    if (sqlite?.error || supabase?.error) {
        await logDataDivergence(operation, results);
        return true;
    }
    
    // Compare key fields
    const sqliteResult = sqlite?.result as Record<string, unknown> | undefined;
    const supabaseResult = supabase?.result as Record<string, unknown> | undefined;
    
    if (!sqliteResult || !supabaseResult) {
        if (sqliteResult !== supabaseResult) {
            await logDataDivergence(operation, results);
            return true;
        }
        return false;
    }
    
    // Check for differences in specified fields
    const hasDivergence = compareFields.some(field => {
        const sqliteVal = sqliteResult[field];
        // Also check snake_case version
        const snakeField = field.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        const supabaseVal = supabaseResult[field] ?? supabaseResult[snakeField];
        return JSON.stringify(sqliteVal) !== JSON.stringify(supabaseVal);
    });
    
    if (hasDivergence) {
        await logDataDivergence(operation, results);
        return true;
    }
    
    return false;
}

/**
 * Get recent divergence logs for monitoring
 */
export async function getRecentDivergence(limit = 10): Promise<DivergenceLog[]> {
    try {
        const keys = await kv.keys('divergence:*');
        // Sort by timestamp (keys contain timestamp)
        const sortedKeys = keys.sort().reverse().slice(0, limit);
        
        if (sortedKeys.length === 0) return [];
        
        const logs = await Promise.all(
            sortedKeys.map(key => kv.get<DivergenceLog>(key))
        );
        
        return logs.filter((log): log is DivergenceLog => log !== null);
    } catch (error) {
        console.error('[Divergence Logger] Failed to get recent logs:', error);
        return [];
    }
}

/**
 * Get divergence count for monitoring
 */
export async function getDivergenceCount(): Promise<number> {
    try {
        return await kv.get<number>('metrics:divergence_count') ?? 0;
    } catch (error) {
        console.error('[Divergence Logger] Failed to get count:', error);
        return 0;
    }
}

/**
 * Reset divergence counter (e.g., after investigation)
 */
export async function resetDivergenceCount(): Promise<void> {
    try {
        await kv.set('metrics:divergence_count', 0);
    } catch (error) {
        console.error('[Divergence Logger] Failed to reset count:', error);
    }
}

export default {
    logDataDivergence,
    checkAndLogDivergence,
    getRecentDivergence,
    getDivergenceCount,
    resetDivergenceCount
};
