import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient as createServerClient } from "@/lib/supabase/server";

// PUT /api/users/password - Change password via Supabase Auth
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to change your password",
          },
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { newPassword, confirmPassword } = body;

    // Validate inputs
    if (!newPassword || !confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_FIELDS",
            message: "New password and confirmation are required",
          },
        },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PASSWORD_MISMATCH",
            message: "New passwords do not match",
          },
        },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PASSWORD_TOO_SHORT",
            message: "Password must be at least 8 characters",
          },
        },
        { status: 400 }
      );
    }

    // Update password via Supabase Auth
    const supabase = await createServerClient();
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      console.error("Supabase password update error:", error);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "PASSWORD_UPDATE_FAILED",
            message: error.message || "Failed to update password",
          },
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { message: "Password updated successfully" },
    });
  } catch (error) {
    console.error("Error changing password:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to change password",
        },
      },
      { status: 500 }
    );
  }
}
