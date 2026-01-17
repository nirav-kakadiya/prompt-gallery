import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/users/profile - Get current user profile
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to view your profile",
          },
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch profile",
        },
      },
      { status: 500 }
    );
  }
}

// PUT /api/users/profile - Update current user profile
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to update your profile",
          },
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, username, bio } = body;

    // Validate username if provided
    if (username) {
      // Check if username is already taken by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          username,
          id: { not: user.id },
        },
      });

      if (existingUser) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "USERNAME_TAKEN",
              message: "This username is already taken",
            },
          },
          { status: 400 }
        );
      }

      // Validate username format (alphanumeric, underscore, hyphen)
      if (!/^[a-zA-Z0-9_-]{3,30}$/.test(username)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "INVALID_USERNAME",
              message: "Username must be 3-30 characters and can only contain letters, numbers, underscores, and hyphens",
            },
          },
          { status: 400 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(name !== undefined && { name }),
        ...(username !== undefined && { username }),
        ...(bio !== undefined && { bio }),
      },
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

    return NextResponse.json({
      success: true,
      data: updatedUser,
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update profile",
        },
      },
      { status: 500 }
    );
  }
}
