import type { User, AuthState } from '@/types';
import { login as apiLogin, logout as apiLogout, getCurrentUser } from './api';
import { setAuthToken, setUser, clearAuth, getAuthState } from './storage';
import {
  signInWithPassword as supabaseSignIn,
  signInWithOAuth,
  signOut as supabaseSignOut,
  checkAuth as supabaseCheckAuth,
  getSession
} from './supabase-auth';

// Feature flag - set to true when Supabase is primary
const USE_SUPABASE_AUTH = import.meta.env.VITE_USE_SUPABASE_AUTH === 'true';

// Login and store credentials
export async function login(email: string, password: string): Promise<{
  success: boolean;
  user?: User;
  error?: string;
  requiresMigration?: boolean;
}> {
  // Try Supabase auth if enabled
  if (USE_SUPABASE_AUTH) {
    const result = await supabaseSignIn(email, password);
    
    if (result.success && result.user) {
      const authState = await supabaseCheckAuth();
      return {
        success: true,
        user: authState.user || undefined
      };
    }
    
    // If Supabase fails, fall through to legacy auth
    // This handles migration period where user might not have migrated yet
  }

  // Legacy API login
  const result = await apiLogin(email, password);

  if (result.success && result.data) {
    // Store auth data
    if (result.data.token) {
      await setAuthToken(result.data.token);
    }
    await setUser(result.data.user);

    return {
      success: true,
      user: result.data.user,
    };
  }

  // Check for migration required response
  if (result.error?.code === 'MIGRATION_REQUIRED') {
    return {
      success: false,
      requiresMigration: true,
      error: result.error.message
    };
  }

  return {
    success: false,
    error: result.error?.message || 'Login failed',
  };
}

// Login with OAuth (Google, GitHub)
export async function loginWithOAuth(provider: 'google' | 'github' = 'google'): Promise<{
  success: boolean;
  user?: User;
  error?: string;
}> {
  if (!USE_SUPABASE_AUTH) {
    return {
      success: false,
      error: 'OAuth login is not available with legacy authentication'
    };
  }

  const result = await signInWithOAuth(provider);
  
  if (result.success && result.user) {
    const authState = await supabaseCheckAuth();
    return {
      success: true,
      user: authState.user || undefined
    };
  }

  return {
    success: false,
    error: result.error || 'OAuth login failed'
  };
}

// Logout and clear credentials
export async function logout(): Promise<void> {
  if (USE_SUPABASE_AUTH) {
    await supabaseSignOut();
  }
  
  await apiLogout();
  await clearAuth();
}

// Check if user is authenticated
export async function checkAuth(): Promise<AuthState> {
  // Check Supabase session first if enabled
  if (USE_SUPABASE_AUTH) {
    const session = await getSession();
    
    if (session) {
      const authState = await supabaseCheckAuth();
      
      // Sync with local storage
      if (authState.isAuthenticated && authState.user) {
        await setUser(authState.user);
        if (authState.token) {
          await setAuthToken(authState.token);
        }
      }
      
      return authState;
    }
  }

  // Fall back to stored credentials
  const state = await getAuthState();

  // If we have stored credentials, verify they're still valid
  if (state.isAuthenticated && state.token) {
    const result = await getCurrentUser();

    if (!result.success) {
      // Token is invalid, clear auth
      await clearAuth();
      return {
        isAuthenticated: false,
        user: null,
        token: null,
      };
    }

    // Update stored user data
    if (result.data?.user) {
      await setUser(result.data.user);
      return {
        isAuthenticated: true,
        user: result.data.user,
        token: state.token,
      };
    }
  }

  return state;
}

// Re-export for convenience
export { getAuthState, clearAuth };
