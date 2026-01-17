import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

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

// POST /api/extension/auth - Authenticate extension user
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

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        username: true,
        image: true,
        password: true,
        role: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } },
        { status: 401, headers: corsHeaders }
      );
    }

    // Check if user has a password (might be OAuth user)
    if (!user.password) {
      return NextResponse.json(
        { success: false, error: { code: "NO_PASSWORD", message: "Please log in via the website first to set a password" } },
        { status: 401, headers: corsHeaders }
      );
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_CREDENTIALS", message: "Invalid email or password" } },
        { status: 401, headers: corsHeaders }
      );
    }

    // Return user data (excluding password)
    // Note: For production, implement proper JWT token generation
    const userData = {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      image: user.image,
      role: user.role,
    };

    return NextResponse.json(
      {
        success: true,
        data: {
          user: userData,
          // In production, generate and return a proper JWT token
          // token: generateJWT(user.id),
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
export async function GET(request: NextRequest) {
  try {
    // For now, we'll use cookie-based auth
    // In production, validate JWT token from Authorization header
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
