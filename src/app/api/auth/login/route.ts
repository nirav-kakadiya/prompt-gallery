import { NextRequest, NextResponse } from "next/server";
import { verifyPassword, createToken, setAuthCookie } from "@/lib/auth";
import { dbFeatureFlags } from "@/lib/db/feature-flag";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";
import { 
  checkLegacyUser, 
  verifyLegacyPassword, 
  initiateMigration,
  isUserMigrated 
} from "@/lib/auth/migration";

/**
 * Check if SQLite/Prisma is available (not on serverless)
 */
const isSqliteAvailable = !(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

/**
 * Lazy-load Prisma only when SQLite is available
 */
async function getPrisma() {
  if (!isSqliteAvailable) return null;
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Email and password are required",
          },
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();

    // If Supabase is the primary backend, try Supabase auth first
    if (dbFeatureFlags.primaryBackend === 'supabase') {
      // Check if this is a legacy user that needs migration
      const legacyUser = await checkLegacyUser(normalizedEmail);
      
      if (legacyUser) {
        // Verify the old password
        const isValidLegacy = await verifyLegacyPassword(normalizedEmail, password);
        
        if (isValidLegacy) {
          // User has valid legacy credentials but hasn't migrated yet
          // Check if they've already started migration
          const alreadyMigrated = await isUserMigrated(normalizedEmail);
          
          if (!alreadyMigrated) {
            // Initiate migration - send password reset email
            const migrationResult = await initiateMigration(normalizedEmail);
            
            return NextResponse.json(
              {
                success: false,
                requiresMigration: true,
                error: {
                  code: "MIGRATION_REQUIRED",
                  message: "Your account needs to be migrated. A password reset email has been sent to your address. Please check your inbox and set a new password to continue.",
                },
              },
              { status: 401 }
            );
          }
        }
      }
      
      // Try Supabase authentication
      try {
        const supabase = await createServerClient();
        const { data, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        
        if (!error && data.user) {
          // Successful Supabase login
          // Get user profile with explicit column selection
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name, username, avatar_url, role')
            .eq('id', data.user.id)
            .single();
          
          // Type assertion to handle Supabase type inference
          const profile = profileData as Pick<Profile, 'name' | 'username' | 'avatar_url' | 'role'> | null;
          
          return NextResponse.json({
            success: true,
            data: {
              user: {
                id: data.user.id,
                email: data.user.email,
                name: profile?.name,
                username: profile?.username,
                image: profile?.avatar_url,
                role: profile?.role || 'user',
              },
              session: data.session,
            },
          });
        }
        
        // Supabase auth failed - if not a legacy user, return error
        if (!legacyUser) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "INVALID_CREDENTIALS",
                message: "Invalid email or password",
              },
            },
            { status: 401 }
          );
        }
      } catch (supabaseError) {
        console.error("Supabase auth error:", supabaseError);
        // Fall through to SQLite auth if Supabase fails
      }
    }

    // SQLite authentication (legacy or fallback) - only if not on serverless
    const prisma = await getPrisma();
    
    if (!prisma) {
      // On serverless without SQLite, if we reach here it means Supabase auth failed
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        },
        { status: 401 }
      );
    }
    
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !user.password) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        },
        { status: 401 }
      );
    }

    // Verify password
    const isValid = await verifyPassword(password, user.password);

    if (!isValid) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid email or password",
          },
        },
        { status: 401 }
      );
    }

    // Create token and set cookie
    const token = await createToken({ userId: user.id, email: user.email });
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.username,
          image: user.image,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to login",
        },
      },
      { status: 500 }
    );
  }
}
