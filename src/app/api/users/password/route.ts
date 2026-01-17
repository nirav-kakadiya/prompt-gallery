import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, hashPassword, verifyPassword } from "@/lib/auth";

// PUT /api/users/password - Change password
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
    const { currentPassword, newPassword, confirmPassword } = body;

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "MISSING_FIELDS",
            message: "All password fields are required",
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

    // Get user with password
    const userWithPassword = await prisma.user.findUnique({
      where: { id: user.id },
      select: { password: true },
    });

    if (!userWithPassword?.password) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NO_PASSWORD",
            message: "Your account uses OAuth login. Password change is not available.",
          },
        },
        { status: 400 }
      );
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, userWithPassword.password);
    if (!isValidPassword) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INVALID_PASSWORD",
            message: "Current password is incorrect",
          },
        },
        { status: 400 }
      );
    }

    // Hash new password and update
    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

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
