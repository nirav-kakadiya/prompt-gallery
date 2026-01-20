/**
 * Admin: Database Health Monitoring
 * 
 * Comprehensive health check for both databases, cache,
 * realtime connections, and data divergence tracking.
 */

import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/lib/supabase/admin';
import { dbFeatureFlags, dbBackend } from '@/lib/db/feature-flag';
import { getRecentDivergence, getDivergenceCount } from '@/lib/db/divergence-logger';
import { cache } from '@/lib/cache/kv-cache';

interface HealthMetrics {
    currentBackend: string;
    featureFlags: {
        useSupabase: boolean;
        useSqlite: boolean;
        isDualWrite: boolean;
        realtimeEnabled: boolean;
    };
    databases: {
        sqlite: { 
            status: string; 
            latency: number; 
            promptCount?: number;
            error?: string;
        };
        supabase: { 
            status: string; 
            latency: number; 
            promptCount?: number;
            error?: string;
        };
    };
    cache: {
        status: string;
        hit_rate: number;
        total_requests: number;
        hits: number;
    };
    view_buffer: {
        pending_flushes: number;
    };
    copy_buffer: {
        pending_flushes: number;
    };
    divergence: {
        count_last_24h: number;
        recent_errors: string[];
    };
    recommendation: string;
    timestamp: string;
}

export async function GET(request: Request) {
    // Verify admin access
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ADMIN_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const metrics: HealthMetrics = {
        currentBackend: dbBackend,
        featureFlags: {
            useSupabase: dbFeatureFlags.useSupabase,
            useSqlite: dbFeatureFlags.useSqlite,
            isDualWrite: dbFeatureFlags.isDualWrite,
            realtimeEnabled: dbFeatureFlags.realtimeEnabled
        },
        databases: {
            sqlite: { status: 'unknown', latency: 0 },
            supabase: { status: 'unknown', latency: 0 }
        },
        cache: { status: 'unknown', hit_rate: 0, total_requests: 0, hits: 0 },
        view_buffer: { pending_flushes: 0 },
        copy_buffer: { pending_flushes: 0 },
        divergence: { count_last_24h: 0, recent_errors: [] },
        recommendation: '',
        timestamp: new Date().toISOString()
    };
    
    // Test SQLite
    const sqliteStart = Date.now();
    try {
        const count = await prisma.prompt.count();
        metrics.databases.sqlite = { 
            status: 'healthy', 
            latency: Date.now() - sqliteStart,
            promptCount: count
        };
    } catch (e) {
        metrics.databases.sqlite = { 
            status: 'error', 
            latency: -1,
            error: e instanceof Error ? e.message : 'Unknown error'
        };
    }
    
    // Test Supabase
    const supaStart = Date.now();
    try {
        const supabase = createAdminClient();
        const { count, error } = await supabase
            .from('prompts')
            .select('*', { count: 'exact', head: true });
        
        if (error) throw error;
        metrics.databases.supabase = { 
            status: 'healthy', 
            latency: Date.now() - supaStart,
            promptCount: count ?? 0
        };
    } catch (e) {
        metrics.databases.supabase = { 
            status: 'error', 
            latency: -1,
            error: e instanceof Error ? e.message : 'Unknown error'
        };
    }
    
    // Cache metrics from Vercel KV
    try {
        const cacheMetrics = await cache.getMetrics();
        const isHealthy = await cache.healthCheck();
        metrics.cache = {
            status: isHealthy ? 'healthy' : 'error',
            hits: cacheMetrics.hits,
            total_requests: cacheMetrics.requests,
            hit_rate: cacheMetrics.requests > 0 
                ? (cacheMetrics.hits / cacheMetrics.requests) * 100 
                : 0
        };
    } catch (e) {
        metrics.cache = { 
            status: 'error', 
            hit_rate: 0, 
            total_requests: 0, 
            hits: 0 
        };
    }
    
    // View buffer size
    try {
        const supabase = createAdminClient();
        const { count } = await supabase
            .from('view_buffer')
            .select('*', { count: 'exact', head: true });
        metrics.view_buffer.pending_flushes = count ?? 0;
    } catch (e) {
        // Ignore - table might not exist yet
    }
    
    // Copy buffer size
    try {
        const supabase = createAdminClient();
        const { count } = await supabase
            .from('copy_buffer')
            .select('*', { count: 'exact', head: true });
        metrics.copy_buffer.pending_flushes = count ?? 0;
    } catch (e) {
        // Ignore - table might not exist yet
    }
    
    // Divergence count
    try {
        const divergenceCount = await getDivergenceCount();
        const recentLogs = await getRecentDivergence(5);
        
        metrics.divergence = {
            count_last_24h: divergenceCount,
            recent_errors: recentLogs.map(log => 
                `${log.operation}: ${log.diff?.slice(0, 2).join(', ')}${log.diff?.length > 2 ? '...' : ''}`
            )
        };
    } catch (e) {
        // Ignore - metrics might not be available
    }
    
    // Generate recommendation
    const supabaseHealthy = metrics.databases.supabase.status === 'healthy';
    const sqliteHealthy = metrics.databases.sqlite.status === 'healthy';
    const cacheHealthy = metrics.cache.status === 'healthy';
    const lowDivergence = metrics.divergence.count_last_24h < 10;
    const goodCacheRate = metrics.cache.hit_rate > 70;
    
    if (!sqliteHealthy && !supabaseHealthy) {
        metrics.recommendation = 'CRITICAL: Both databases are down!';
    } else if (supabaseHealthy && lowDivergence && goodCacheRate && cacheHealthy) {
        metrics.recommendation = 'Safe to use Supabase as primary';
    } else if (!supabaseHealthy) {
        metrics.recommendation = 'Stay on SQLite - Supabase connection issues';
    } else if (!lowDivergence) {
        metrics.recommendation = 'Stay on SQLite - Data divergence detected, investigate before proceeding';
    } else if (!cacheHealthy) {
        metrics.recommendation = 'Warning: Cache is not healthy, performance may be degraded';
    } else if (!goodCacheRate) {
        metrics.recommendation = 'Monitor cache hit rate - currently below 70%';
    } else {
        metrics.recommendation = 'System is healthy, proceed with caution';
    }
    
    return NextResponse.json(metrics);
}
