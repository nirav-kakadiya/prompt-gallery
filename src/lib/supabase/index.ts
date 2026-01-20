/**
 * Supabase Client Exports
 * 
 * Centralized exports for all Supabase-related functionality.
 */

// Client-side
export { createClient, getSupabaseClient, supabase } from './client';

// Server-side
export { 
    createClient as createServerClient, 
    getUser, 
    getSession, 
    isAuthenticated 
} from './server';

// Admin (service role)
export { 
    createAdminClient, 
    getAdminClient, 
    adminAuth 
} from './admin';

// Types
export type { 
    Database, 
    Tables, 
    InsertTables, 
    UpdateTables,
    Profile,
    Prompt,
    Tag,
    Collection,
    Like,
    Json
} from './types';
