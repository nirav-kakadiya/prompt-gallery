/**
 * Cron Job: Cleanup Buffers
 * 
 * Runs every hour via Vercel Cron.
 * Removes stale entries from view_buffer and copy_buffer tables.
 * Prevents buffer tables from growing indefinitely.
 * 
 * Schedule: 0 * * * * (every hour at minute 0)
 */

import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
    // Verify Vercel cron secret
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        console.error('[Cron] Unauthorized cleanup-buffers attempt');
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const startTime = Date.now();
    
    try {
        const supabase = createAdminClient();
        
        // Cleanup both buffers in parallel
        const [viewResult, copyResult] = await Promise.all([
            supabase.rpc('cleanup_view_buffer'),
            supabase.rpc('cleanup_copy_buffer')
        ]);

        const viewsDeleted = viewResult.error ? 0 : (viewResult.data ?? 0);
        const copiesDeleted = copyResult.error ? 0 : (copyResult.data ?? 0);
        
        if (viewResult.error) {
            console.error('[Cron] View buffer cleanup failed:', viewResult.error);
        }
        if (copyResult.error) {
            console.error('[Cron] Copy buffer cleanup failed:', copyResult.error);
        }

        const duration = Date.now() - startTime;

        console.log('[Cron] Buffer cleanup completed:', {
            views_deleted: viewsDeleted,
            copies_deleted: copiesDeleted,
            duration_ms: duration
        });

        return NextResponse.json({ 
            success: true, 
            views_deleted: viewsDeleted,
            copies_deleted: copiesDeleted,
            duration_ms: duration,
            timestamp: new Date().toISOString() 
        });
    } catch (error) {
        console.error('[Cron] Buffer cleanup exception:', error);
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
