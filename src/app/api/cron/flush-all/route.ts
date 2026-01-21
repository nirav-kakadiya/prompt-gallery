/**
 * Cron Job: Flush All Counts & Cleanup Buffers
 *
 * Consolidated cron job for Vercel free tier (1 cron/day limit).
 * Runs daily and performs all maintenance operations:
 * 1. Flush buffered view counts to prompts table
 * 2. Flush buffered copy counts to prompts table
 * 3. Cleanup stale buffer entries
 *
 * Schedule: 0 0 * * * (daily at midnight UTC)
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

interface FlushResult {
    prompts_updated: number;
    count_flushed: number;
}

export async function GET(request: Request) {
    // Verify Vercel cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.error('[Cron] Unauthorized flush-all attempt');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    const results = {
        views: { prompts_updated: 0, flushed: 0, error: null as string | null },
        copies: { prompts_updated: 0, flushed: 0, error: null as string | null },
        cleanup: { views_deleted: 0, copies_deleted: 0, error: null as string | null }
    };

    try {
        const supabase = createAdminClient();

        // 1. Flush view counts
        try {
            const { data, error } = await supabase.rpc('flush_view_counts') as {
                data: { prompts_updated: number; views_flushed: number }[] | null;
                error: Error | null;
            };
            if (error) {
                results.views.error = error.message;
                console.error('[Cron] Flush views failed:', error);
            } else {
                const result = data?.[0];
                results.views.prompts_updated = result?.prompts_updated ?? 0;
                results.views.flushed = result?.views_flushed ?? 0;
            }
        } catch (e) {
            results.views.error = e instanceof Error ? e.message : 'Unknown error';
        }

        // 2. Flush copy counts
        try {
            const { data, error } = await supabase.rpc('flush_copy_counts') as {
                data: { prompts_updated: number; copies_flushed: number }[] | null;
                error: Error | null;
            };
            if (error) {
                results.copies.error = error.message;
                console.error('[Cron] Flush copies failed:', error);
            } else {
                const result = data?.[0];
                results.copies.prompts_updated = result?.prompts_updated ?? 0;
                results.copies.flushed = result?.copies_flushed ?? 0;
            }
        } catch (e) {
            results.copies.error = e instanceof Error ? e.message : 'Unknown error';
        }

        // 3. Cleanup stale buffer entries
        try {
            const [viewResult, copyResult] = await Promise.all([
                supabase.rpc('cleanup_view_buffer'),
                supabase.rpc('cleanup_copy_buffer')
            ]);
            results.cleanup.views_deleted = viewResult.error ? 0 : (viewResult.data ?? 0);
            results.cleanup.copies_deleted = copyResult.error ? 0 : (copyResult.data ?? 0);
            if (viewResult.error) {
                console.error('[Cron] View buffer cleanup failed:', viewResult.error);
            }
            if (copyResult.error) {
                console.error('[Cron] Copy buffer cleanup failed:', copyResult.error);
            }
        } catch (e) {
            results.cleanup.error = e instanceof Error ? e.message : 'Unknown error';
        }

        const duration = Date.now() - startTime;
        const hasErrors = results.views.error || results.copies.error || results.cleanup.error;

        console.log('[Cron] Flush-all completed:', {
            views: results.views,
            copies: results.copies,
            cleanup: results.cleanup,
            duration_ms: duration
        });

        return NextResponse.json({
            success: !hasErrors,
            results,
            duration_ms: duration,
            timestamp: new Date().toISOString()
        }, { status: hasErrors ? 207 : 200 }); // 207 Multi-Status if partial failure

    } catch (error) {
        console.error('[Cron] Flush-all exception:', error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date().toISOString()
            },
            { status: 500 }
        );
    }
}
