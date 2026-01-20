import { NextRequest, NextResponse } from "next/server";
import { hashPassword, createToken, setAuthCookie } from "@/lib/auth";
import { dbFeatureFlags } from "@/lib/db/feature-flag";
import { createClient as createServerClient } from "@/lib/supabase/server";

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
    const { email, password, name, username } = body;

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

    if (password.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Password must be at least 8 characters",
          },
        },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase();
    const normalizedUsername = username?.toLowerCase() || null;

    // If Supabase is the primary backend, register via Supabase Auth
    if (dbFeatureFlags.primaryBackend === 'supabase') {
      const supabase = await createServerClient();
      
      // Check if username is taken (if provided)
      if (normalizedUsername) {
        const { data: existingProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('username', normalizedUsername)
          .single();
        
        if (existingProfile) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "USER_EXISTS",
                message: "Username already taken",
              },
            },
            { status: 409 }
          );
        }
      }
      
      // Register with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            name: name || null,
            username: normalizedUsername,
          },
        },
      });
      
      if (authError) {
        console.error("Supabase registration error:", authError);
        
        // Handle specific Supabase errors
        if (authError.message.includes('already registered')) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "USER_EXISTS",
                message: "Email already registered",
              },
            },
            { status: 409 }
          );
        }
        
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "REGISTRATION_ERROR",
              message: authError.message,
            },
          },
          { status: 400 }
        );
      }
      
      if (!authData.user) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "REGISTRATION_ERROR",
              message: "Failed to create user",
            },
          },
          { status: 500 }
        );
      }
      
      // Update profile with username and name
      // The profile is auto-created by Supabase trigger, we just need to update it
      if (normalizedUsername || name) {
        await supabase
          .from('profiles')
          .update({
            username: normalizedUsername,
            name: name || null,
          } as never)
          .eq('id', authData.user.id);
      }
      
      return NextResponse.json({
        success: true,
        data: {
          user: {
            id: authData.user.id,
            email: authData.user.email,
            name: name || null,
            username: normalizedUsername,
            image: null,
            role: 'user',
          },
          session: authData.session,
        },
      });
    }

    // SQLite registration (legacy/local development) - only if not on serverless
    const prisma = await getPrisma();
    
    if (!prisma) {
      // On serverless without SQLite and Supabase not primary, return error
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Registration service unavailable",
          },
        },
        { status: 500 }
      );
    }

    // Check if user exists in SQLite
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          ...(normalizedUsername ? [{ username: normalizedUsername }] : []),
        ],
      },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "USER_EXISTS",
            message:
              existingUser.email === normalizedEmail
                ? "Email already registered"
                : "Username already taken",
          },
        },
        { status: 409 }
      );
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: name || null,
        username: normalizedUsername,
      },
      select: {
        id: true,
        email: true,
        name: true,
        username: true,
        image: true,
        role: true,
        createdAt: true,
      },
    });

    // Create token and set cookie
    const token = await createToken({ userId: user.id, email: user.email });
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to register user",
        },
      },
      { status: 500 }
    );
  }
}
