/**
 * Supabase Admin Client
 * 
 * Server-side admin client using the service role key.
 * IMPORTANT: This bypasses Row Level Security (RLS).
 * Only use for:
 * - Admin operations
 * - Cron jobs
 * - Background tasks
 * - Data migrations
 * 
 * NEVER expose to the client or use in client-facing routes without
 * proper authorization checks.
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

/**
 * Create an admin Supabase client that bypasses RLS
 * Uses the service role key - keep this server-side only!
 */
export function createAdminClient() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error(
            'Missing Supabase credentials. Ensure NEXT_PUBLIC_SUPABASE_URL and ' +
            'SUPABASE_SERVICE_ROLE_KEY are set in environment variables.'
        );
    }
    
    return createClient<Database>(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}

/**
 * Get or create a singleton admin client
 * Useful for cron jobs and background processes
 */
let adminClient: ReturnType<typeof createAdminClient> | null = null;

export function getAdminClient() {
    if (!adminClient) {
        adminClient = createAdminClient();
    }
    return adminClient;
}

/**
 * Admin-only user operations
 */
export const adminAuth = {
    /**
     * Create a user (for migration purposes)
     */
    async createUser(email: string, password?: string, metadata?: Record<string, unknown>) {
        const admin = getAdminClient();
        return admin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: metadata
        });
    },
    
    /**
     * Delete a user
     */
    async deleteUser(userId: string) {
        const admin = getAdminClient();
        return admin.auth.admin.deleteUser(userId);
    },
    
    /**
     * Generate a password reset link
     */
    async generateResetLink(email: string) {
        const admin = getAdminClient();
        return admin.auth.admin.generateLink({
            type: 'recovery',
            email
        });
    },
    
    /**
     * Update user metadata
     */
    async updateUser(userId: string, updates: {
        email?: string;
        password?: string;
        user_metadata?: Record<string, unknown>;
    }) {
        const admin = getAdminClient();
        return admin.auth.admin.updateUserById(userId, updates);
    },
    
    /**
     * List all users (paginated)
     */
    async listUsers(page = 1, perPage = 50) {
        const admin = getAdminClient();
        return admin.auth.admin.listUsers({
            page,
            perPage
        });
    }
};

export default createAdminClient;
