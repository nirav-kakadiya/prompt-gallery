"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
  id: string;
  email: string;
  name: string | null;
  username: string | null;
  image: string | null;
  bio: string | null;
  role: string;
  promptCount?: number;
  totalCopies?: number;
  totalLikes?: number;
  createdAt?: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: true,
      isAuthenticated: false,
      setUser: (user) =>
        set({
          user,
          isAuthenticated: !!user,
          isLoading: false,
        }),
      setLoading: (isLoading) => set({ isLoading }),
      logout: () =>
        set({
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);

// Auth API functions
export async function login(email: string, password: string) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || "Login failed");
  }
  return data.data;
}

export async function register(
  email: string,
  password: string,
  name?: string,
  username?: string
) {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name, username }),
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || "Registration failed");
  }
  return data.data;
}

export async function logout() {
  const response = await fetch("/api/auth/logout", {
    method: "POST",
  });
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || "Logout failed");
  }
  return data.data;
}

export async function fetchCurrentUser() {
  const response = await fetch("/api/auth/me");
  const data = await response.json();
  if (!data.success) {
    return null;
  }
  return data.data.user;
}
