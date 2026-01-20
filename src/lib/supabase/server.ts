/**
 * Supabase Server Client
 * 
 * Server-side Supabase instance for use in:
 * - Server Components
 * - Route Handlers (API Routes)
 * - Server Actions
 * 
 * Uses @supabase/ssr for proper SSR cookie handling with Next.js App Router.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from './types';

/**
 * Create a Supabase client for server-side use
 * Handles cookies properly for SSR in Next.js App Router
 */
export async function createClient() {
    const cookieStore = await cookies();
    
    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // The `setAll` method was called from a Server Component.
                        // This can be ignored if you have middleware refreshing
                        // user sessions.
                    }
                },
            },
        }
    );
}

/**
 * Get the current authenticated user from the server
 * Returns null if not authenticated
 */
export async function getUser() {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
        return null;
    }
    
    return user;
}

/**
 * Get the current session from the server
 * Returns null if not authenticated
 */
export async function getSession() {
    const supabase = await createClient();
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
        return null;
    }
    
    return session;
}

/**
 * Check if the current user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
    const user = await getUser();
    return user !== null;
}

export default createClient;
