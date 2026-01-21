/**
 * Admin: Database Health Monitoring
 *
 * Health check for database, cache, and buffer status.
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createAdminClient } from '@/lib/supabase/admin';
import { cache } from '@/lib/cache/kv-cache';

interface HealthMetrics {
    database: {
        status: string;
        latency: number;
        promptCount?: number;
        error?: string;
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
        database: { status: 'unknown', latency: 0 },
        cache: { status: 'unknown', hit_rate: 0, total_requests: 0, hits: 0 },
        view_buffer: { pending_flushes: 0 },
        copy_buffer: { pending_flushes: 0 },
        recommendation: '',
        timestamp: new Date().toISOString()
    };

    // Test database (Prisma → PostgreSQL)
    const dbStart = Date.now();
    try {
        const count = await prisma.prompt.count();
        metrics.database = {
            status: 'healthy',
            latency: Date.now() - dbStart,
            promptCount: count
        };
    } catch (e) {
        metrics.database = {
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

    // Generate recommendation
    const dbHealthy = metrics.database.status === 'healthy';
    const cacheHealthy = metrics.cache.status === 'healthy';
    const goodCacheRate = metrics.cache.hit_rate > 70;

    if (!dbHealthy) {
        metrics.recommendation = 'CRITICAL: Database is down!';
    } else if (!cacheHealthy) {
        metrics.recommendation = 'Warning: Cache is not healthy, performance may be degraded';
    } else if (!goodCacheRate) {
        metrics.recommendation = 'Monitor cache hit rate - currently below 70%';
    } else {
        metrics.recommendation = 'System is healthy';
    }

    return NextResponse.json(metrics);
}
