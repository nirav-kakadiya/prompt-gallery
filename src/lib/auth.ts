import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "./prisma";
import { createClient as createServerClient } from "./supabase/server";
import { ensureProfileWithDefaults } from "./profile-utils";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "your-secret-key-change-in-production"
);

const COOKIE_NAME = "auth-token";

export interface JWTPayload {
  userId: string;
  email: string;
  [key: string]: unknown;
}

// Hash password
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

// Verify password
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword);
}

// Create JWT token
export async function createToken(payload: JWTPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

// Verify JWT token
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}

// Set auth cookie
export async function setAuthCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

// Remove auth cookie
export async function removeAuthCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

// Get current user from Supabase session or JWT
export async function getCurrentUser() {
  try {
    // Try to get user from Supabase session first
    const supabase = await createServerClient();
    const { data: { user: supabaseUser } } = await supabase.auth.getUser();
    
    if (supabaseUser) {
      // Get profile data from Prisma (connected to Supabase PostgreSQL)
      let profile = await prisma.profile.findUnique({
        where: { id: supabaseUser.id },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          avatarUrl: true,
          bio: true,
          role: true,
          promptCount: true,
          totalCopies: true,
          totalLikes: true,
          createdAt: true,
        },
      });

      if (profile) {
        // Fill in missing avatar or username for existing users
        if (!profile.avatarUrl || !profile.username) {
          const updated = await ensureProfileWithDefaults({
            userId: profile.id,
            email: profile.email || supabaseUser.email || undefined,
            name: profile.name || supabaseUser.user_metadata?.name || undefined,
          });
          // Re-fetch to get all fields including the updated ones
          profile = await prisma.profile.findUnique({
            where: { id: supabaseUser.id },
            select: {
              id: true,
              email: true,
              name: true,
              username: true,
              avatarUrl: true,
              bio: true,
              role: true,
              promptCount: true,
              totalCopies: true,
              totalLikes: true,
              createdAt: true,
            },
          });
        }

        return {
          id: profile!.id,
          email: profile!.email || supabaseUser.email,
          name: profile!.name,
          username: profile!.username,
          image: profile!.avatarUrl,
          bio: profile!.bio,
          role: profile!.role || 'user',
          promptCount: profile!.promptCount || 0,
          totalCopies: profile!.totalCopies || 0,
          totalLikes: profile!.totalLikes || 0,
          createdAt: profile!.createdAt.toISOString(),
        };
      }

      // Create profile for Supabase user if it doesn't exist yet
      const newProfile = await ensureProfileWithDefaults({
        userId: supabaseUser.id,
        email: supabaseUser.email || undefined,
        name: supabaseUser.user_metadata?.name || undefined,
      });

      return {
        id: newProfile.id,
        email: supabaseUser.email,
        name: newProfile.name,
        username: newProfile.username,
        image: newProfile.avatarUrl,
        bio: null,
        role: 'user',
        promptCount: 0,
        totalCopies: 0,
        totalLikes: 0,
        createdAt: supabaseUser.created_at,
      };
    }

    // Fallback to JWT-based auth
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) return null;

    // Get user from Prisma
    let profile = await prisma.profile.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        avatarUrl: true,
        bio: true,
        role: true,
        promptCount: true,
        totalCopies: true,
        totalLikes: true,
        createdAt: true,
      },
    });

    if (!profile) return null;

    // Fill in missing avatar or username for existing users
    if (!profile.avatarUrl || !profile.username) {
      await ensureProfileWithDefaults({
        userId: profile.id,
        email: profile.email || payload.email || undefined,
        name: profile.name || undefined,
      });
      // Re-fetch to get updated fields
      profile = await prisma.profile.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          email: true,
          name: true,
          username: true,
          avatarUrl: true,
          bio: true,
          role: true,
          promptCount: true,
          totalCopies: true,
          totalLikes: true,
          createdAt: true,
        },
      });
      if (!profile) return null;
    }

    return {
      id: profile.id,
      email: profile.email,
      name: profile.name,
      username: profile.username,
      image: profile.avatarUrl,
      bio: profile.bio,
      role: profile.role || 'user',
      promptCount: profile.promptCount || 0,
      totalCopies: profile.totalCopies || 0,
      totalLikes: profile.totalLikes || 0,
      createdAt: profile.createdAt.toISOString(),
    };
  } catch (error) {
    console.error("getCurrentUser error:", error);
    return null;
  }
}

// Get token from request headers (for API routes)
export function getTokenFromHeaders(headers: Headers): string | null {
  const authHeader = headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}
