/**
 * Supabase Auth for Browser Extension
 * 
 * Browser extensions cannot use cookie-based auth.
 * This module implements PKCE OAuth flow for secure authentication.
 */

import { createClient, type SupabaseClient, type Session, type User } from '@supabase/supabase-js';
import type { AuthState } from '@/types';

// Extension-specific Supabase client
let supabaseClient: SupabaseClient | null = null;

/**
 * Get or create the Supabase client for the extension
 */
export function getSupabaseClient(): SupabaseClient {
    if (!supabaseClient) {
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseAnonKey) {
            throw new Error('Supabase credentials not configured');
        }
        
        supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
            auth: {
                // Use localStorage for session persistence in extension
                storage: {
                    getItem: async (key: string) => {
                        const result = await chrome.storage.local.get(key);
                        return result[key] || null;
                    },
                    setItem: async (key: string, value: string) => {
                        await chrome.storage.local.set({ [key]: value });
                    },
                    removeItem: async (key: string) => {
                        await chrome.storage.local.remove(key);
                    }
                },
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false
            }
        });
    }
    
    return supabaseClient;
}

/**
 * Sign in with email and password
 */
export async function signInWithPassword(
    email: string, 
    password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) {
        return { 
            success: false, 
            error: error.message 
        };
    }
    
    if (data.user) {
        return { 
            success: true, 
            user: data.user 
        };
    }
    
    return { 
        success: false, 
        error: 'Unknown error occurred' 
    };
}

/**
 * Sign in with OAuth provider using PKCE flow
 * This opens a browser window for authentication
 */
export async function signInWithOAuth(
    provider: 'google' | 'github' = 'google'
): Promise<{ success: boolean; user?: User; error?: string }> {
    const supabase = getSupabaseClient();
    
    try {
        // Get the OAuth URL with PKCE
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                skipBrowserRedirect: true,
                redirectTo: chrome.identity.getRedirectURL()
            }
        });
        
        if (error || !data.url) {
            return { 
                success: false, 
                error: error?.message || 'Failed to get OAuth URL' 
            };
        }
        
        // Open the auth URL in a browser window
        return new Promise((resolve) => {
            chrome.identity.launchWebAuthFlow(
                { 
                    url: data.url, 
                    interactive: true 
                },
                async (redirectUrl) => {
                    if (chrome.runtime.lastError) {
                        resolve({ 
                            success: false, 
                            error: chrome.runtime.lastError.message 
                        });
                        return;
                    }
                    
                    if (!redirectUrl) {
                        resolve({ 
                            success: false, 
                            error: 'No redirect URL received' 
                        });
                        return;
                    }
                    
                    try {
                        // Extract tokens from the redirect URL
                        const url = new URL(redirectUrl);
                        const hashParams = new URLSearchParams(url.hash.slice(1));
                        const queryParams = new URLSearchParams(url.search);
                        
                        const accessToken = hashParams.get('access_token') || queryParams.get('access_token');
                        const refreshToken = hashParams.get('refresh_token') || queryParams.get('refresh_token');
                        
                        if (accessToken && refreshToken) {
                            // Set the session
                            const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
                                access_token: accessToken,
                                refresh_token: refreshToken
                            });
                            
                            if (sessionError) {
                                resolve({ 
                                    success: false, 
                                    error: sessionError.message 
                                });
                                return;
                            }
                            
                            resolve({ 
                                success: true, 
                                user: sessionData.user ?? undefined 
                            });
                        } else {
                            // Try to exchange code for session (PKCE flow)
                            const code = queryParams.get('code');
                            if (code) {
                                const { data: exchangeData, error: exchangeError } = 
                                    await supabase.auth.exchangeCodeForSession(code);
                                
                                if (exchangeError) {
                                    resolve({ 
                                        success: false, 
                                        error: exchangeError.message 
                                    });
                                    return;
                                }
                                
                                resolve({ 
                                    success: true, 
                                    user: exchangeData.user ?? undefined 
                                });
                            } else {
                                resolve({ 
                                    success: false, 
                                    error: 'No tokens or code in redirect URL' 
                                });
                            }
                        }
                    } catch (e) {
                        resolve({ 
                            success: false, 
                            error: e instanceof Error ? e.message : 'Failed to process auth response' 
                        });
                    }
                }
            );
        });
    } catch (error) {
        return { 
            success: false, 
            error: error instanceof Error ? error.message : 'OAuth sign-in failed' 
        };
    }
}

/**
 * Sign in with magic link (passwordless)
 */
export async function signInWithMagicLink(email: string): Promise<{ success: boolean; error?: string }> {
    const supabase = getSupabaseClient();
    
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
            emailRedirectTo: chrome.identity.getRedirectURL()
        }
    });
    
    if (error) {
        return { success: false, error: error.message };
    }
    
    return { success: true };
}

/**
 * Sign out
 */
export async function signOut(): Promise<void> {
    const supabase = getSupabaseClient();
    await supabase.auth.signOut();
}

/**
 * Get current session
 */
export async function getSession(): Promise<Session | null> {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getSession();
    return data.session;
}

/**
 * Get current user
 */
export async function getUser(): Promise<User | null> {
    const supabase = getSupabaseClient();
    const { data } = await supabase.auth.getUser();
    return data.user;
}

/**
 * Check authentication state
 */
export async function checkAuth(): Promise<AuthState> {
    const session = await getSession();
    const user = await getUser();
    
    if (session && user) {
        return {
            isAuthenticated: true,
            user: {
                id: user.id,
                email: user.email || '',
                name: user.user_metadata?.name || user.user_metadata?.full_name || null,
                username: user.user_metadata?.username || null,
                image: user.user_metadata?.avatar_url || null,
                role: user.user_metadata?.role || 'user'
            },
            token: session.access_token
        };
    }
    
    return {
        isAuthenticated: false,
        user: null,
        token: null
    };
}

/**
 * Listen for auth state changes
 */
export function onAuthStateChange(
    callback: (session: Session | null) => void
): () => void {
    const supabase = getSupabaseClient();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
            callback(session);
        }
    );
    
    return () => subscription.unsubscribe();
}

export default {
    getSupabaseClient,
    signInWithPassword,
    signInWithOAuth,
    signInWithMagicLink,
    signOut,
    getSession,
    getUser,
    checkAuth,
    onAuthStateChange
};
