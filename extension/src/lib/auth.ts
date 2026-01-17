import type { User, AuthState } from '@/types';
import { login as apiLogin, logout as apiLogout, getCurrentUser } from './api';
import { setAuthToken, setUser, clearAuth, getAuthState } from './storage';

// Login and store credentials
export async function login(email: string, password: string): Promise<{
  success: boolean;
  user?: User;
  error?: string;
}> {
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

  return {
    success: false,
    error: result.error?.message || 'Login failed',
  };
}

// Logout and clear credentials
export async function logout(): Promise<void> {
  await apiLogout();
  await clearAuth();
}

// Check if user is authenticated
export async function checkAuth(): Promise<AuthState> {
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
