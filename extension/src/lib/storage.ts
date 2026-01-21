import type { PendingPrompt, User, AuthState } from '@/types';
import { STORAGE_KEYS } from '@/types';

// Re-export for convenience
export { STORAGE_KEYS };

// Get value from chrome storage
export async function getStorage<T>(key: string): Promise<T | null> {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(result[key] ?? null);
    });
  });
}

// Set value in chrome storage
export async function setStorage<T>(key: string, value: T): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

// Remove value from chrome storage
export async function removeStorage(key: string): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.remove(key, resolve);
  });
}

// Clear all storage
export async function clearStorage(): Promise<void> {
  return new Promise((resolve) => {
    chrome.storage.local.clear(resolve);
  });
}

// Auth-specific helpers
export async function getAuthToken(): Promise<string | null> {
  return getStorage<string>(STORAGE_KEYS.AUTH_TOKEN);
}

export async function setAuthToken(token: string): Promise<void> {
  return setStorage(STORAGE_KEYS.AUTH_TOKEN, token);
}

export async function getUser(): Promise<User | null> {
  return getStorage<User>(STORAGE_KEYS.USER);
}

export async function setUser(user: User): Promise<void> {
  return setStorage(STORAGE_KEYS.USER, user);
}

export async function getAuthState(): Promise<AuthState> {
  const [token, user] = await Promise.all([
    getAuthToken(),
    getUser(),
  ]);

  return {
    isAuthenticated: !!token && !!user,
    user,
    token,
  };
}

export async function clearAuth(): Promise<void> {
  await Promise.all([
    removeStorage(STORAGE_KEYS.AUTH_TOKEN),
    removeStorage(STORAGE_KEYS.USER),
  ]);
}

// Pending prompt helpers
export async function getPendingPrompt(): Promise<PendingPrompt | null> {
  return getStorage<PendingPrompt>(STORAGE_KEYS.PENDING_PROMPT);
}

export async function setPendingPrompt(prompt: PendingPrompt): Promise<void> {
  return setStorage(STORAGE_KEYS.PENDING_PROMPT, prompt);
}

export async function clearPendingPrompt(): Promise<void> {
  return removeStorage(STORAGE_KEYS.PENDING_PROMPT);
}
