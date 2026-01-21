import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { createToken } from "@/lib/auth";

// CORS headers for extension requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Handle preflight requests
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

// POST /api/extension/auth - Authenticate extension user via Supabase
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validation
    if (!email?.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Email is required" } },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!password) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Password is required" } },
        { status: 400, headers: corsHeaders }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Authenticate via Supabase
    const supabase = await createServerClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error || !data.user) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } },
        { status: 401, headers: corsHeaders }
      );
    }

    // Get profile data
    const profile = await prisma.profile.findUnique({
      where: { id: data.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        avatarUrl: true,
        role: true,
      },
    });

    // Generate JWT token for extension use
    const token = await createToken({ 
      userId: data.user.id, 
      email: normalizedEmail 
    });

    const userData = {
      id: data.user.id,
      name: profile?.name || data.user.user_metadata?.name,
      email: profile?.email || data.user.email,
      username: profile?.username,
      image: profile?.avatarUrl,
      role: profile?.role || 'user',
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          user: userData,
          token,
          session: data.session,
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error authenticating extension user:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Authentication failed" } },
      { status: 500, headers: corsHeaders }
    );
  }
}

// GET /api/extension/auth - Get current user (session check)
export async function GET() {
  try {
    const { getCurrentUser } = await import("@/lib/auth");
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Not logged in" } },
        { status: 401, headers: corsHeaders }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            username: user.username,
            image: user.image,
          },
        },
      },
      { headers: corsHeaders }
    );
  } catch (error) {
    console.error("Error checking auth status:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to check auth status" } },
      { status: 500, headers: corsHeaders }
    );
  }
}
