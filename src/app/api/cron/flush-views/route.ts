/**
 * Cron Job: Flush View Counts
 * 
 * Runs every 5 minutes via Vercel Cron.
 * Aggregates buffered view counts and updates prompts table.
 * 
 * Schedule: *​/5 * * * * (every 5 minutes)
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Verify Vercel cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.error('[Cron] Unauthorized flush-views attempt');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    
    try {
        const supabase = createAdminClient();
        const { data, error } = await supabase.rpc('flush_view_counts');

        if (error) {
            console.error('[Cron] Flush views failed:', error);
            return NextResponse.json(
                { 
                    success: false, 
                    error: error.message,
                    timestamp: new Date().toISOString()
                }, 
                { status: 500 }
            );
        }

        const result = data?.[0] || { prompts_updated: 0, views_flushed: 0 };
        const duration = Date.now() - startTime;

        console.log('[Cron] Flush views completed:', {
            prompts_updated: result.prompts_updated,
            views_flushed: result.views_flushed,
            duration_ms: duration
        });

        return NextResponse.json({ 
            success: true, 
            prompts_updated: result.prompts_updated,
            views_flushed: result.views_flushed,
            duration_ms: duration,
            timestamp: new Date().toISOString() 
        });
    } catch (error) {
        console.error('[Cron] Flush views exception:', error);
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
