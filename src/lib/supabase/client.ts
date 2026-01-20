/**
 * Supabase Browser Client
 * 
 * Client-side Supabase instance for use in React components.
 * Uses @supabase/ssr for proper cookie handling with Next.js App Router.
 */

import { createBrowserClient } from '@supabase/ssr';
import type { Database } from './types';

/**
 * Create a Supabase client for browser/client-side use
 * This client handles auth state and cookies automatically
 */
export function createClient() {
    return createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}

/**
 * Singleton instance for client-side use
 * Safe to use in React components and hooks
 */
let browserClient: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
    if (!browserClient) {
        browserClient = createClient();
    }
    return browserClient;
}

/**
 * Alias for common import pattern
 */
export const supabase = typeof window !== 'undefined' 
    ? getSupabaseClient() 
    : null;

export default createClient;
