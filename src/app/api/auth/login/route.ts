import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createToken, setAuthCookie } from "@/lib/auth";
import { createClient as createServerClient } from "@/lib/supabase/server";

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

    // Use Supabase authentication
    try {
      const supabase = await createServerClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      
      if (!error && data.user) {
        // Successful Supabase login
        // Get user profile from Prisma (connected to Supabase PostgreSQL)
        const profile = await prisma.profile.findUnique({
          where: { id: data.user.id },
          select: {
            name: true,
            username: true,
            avatarUrl: true,
            role: true,
          },
        });
        
        // Create JWT token for fallback auth
        const token = await createToken({ userId: data.user.id, email: normalizedEmail });
        await setAuthCookie(token);
        
        return NextResponse.json({
          success: true,
          data: {
            user: {
              id: data.user.id,
              email: data.user.email,
              name: profile?.name,
              username: profile?.username,
              image: profile?.avatarUrl,
              role: profile?.role || 'user',
            },
            session: data.session,
            token,
          },
        });
      }
      
      // Supabase auth failed
      console.error("Supabase login failed:", error?.message);
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
    } catch (supabaseError) {
      console.error("Supabase auth error:", supabaseError);
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
