import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { dbFeatureFlags } from "./db/feature-flag";
import { createClient as createServerClient } from "./supabase/server";

/**
 * Check if SQLite/Prisma is available (not on serverless)
 */
const isSqliteAvailable = !(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

/**
 * Lazy-load Prisma only when SQLite is available
 */
async function getPrisma() {
  if (!isSqliteAvailable) return null;
  const { prisma } = await import("./prisma");
  return prisma;
}

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

// Get current user from cookie or Supabase session
export async function getCurrentUser() {
  try {
    // If Supabase is primary, try to get user from Supabase session first
    if (dbFeatureFlags.primaryBackend === 'supabase') {
      const supabase = await createServerClient();
      const { data: { user: supabaseUser } } = await supabase.auth.getUser();
      
      if (supabaseUser) {
        // Get profile data from Supabase
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, email, name, username, avatar_url, bio, role, prompt_count, total_copies, total_likes, created_at')
          .eq('id', supabaseUser.id)
          .single();
        
        if (profile) {
          return {
            id: profile.id,
            email: profile.email || supabaseUser.email,
            name: profile.name,
            username: profile.username,
            image: profile.avatar_url,
            bio: profile.bio,
            role: profile.role || 'user',
            promptCount: profile.prompt_count || 0,
            totalCopies: profile.total_copies || 0,
            totalLikes: profile.total_likes || 0,
            createdAt: profile.created_at,
          };
        }
        
        // Return basic user info if no profile exists yet
        return {
          id: supabaseUser.id,
          email: supabaseUser.email,
          name: supabaseUser.user_metadata?.name || null,
          username: supabaseUser.user_metadata?.username || null,
          image: null,
          bio: null,
          role: 'user',
          promptCount: 0,
          totalCopies: 0,
          totalLikes: 0,
          createdAt: supabaseUser.created_at,
        };
      }
    }

    // Fallback to JWT-based auth (for SQLite/local development)
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload) return null;

    // Try to get user from SQLite if available
    const prisma = await getPrisma();
    if (!prisma) return null;

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        image: true,
        bio: true,
        role: true,
        promptCount: true,
        totalCopies: true,
        totalLikes: true,
        createdAt: true,
      },
    });

    return user;
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
