import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { validateUsername, looksLikeEmail } from "@/lib/username-utils";
import { generateAvatarUrl, getAvatarStyles } from "@/lib/profile-utils";

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
    const { name, username, bio, avatarStyle, avatarUrl: customAvatarUrl } = body;

    // Validate username if provided
    let normalizedUsername: string | undefined = undefined;
    if (username !== undefined) {
      if (username === null || username === '') {
        // Allow clearing username
        normalizedUsername = undefined;
      } else {
        // Check if it looks like an email
        if (looksLikeEmail(username)) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "INVALID_USERNAME",
                message: "Username cannot be an email address",
              },
            },
            { status: 400 }
          );
        }

        // Validate format and reserved names
        const validation = validateUsername(username);
        if (!validation.valid) {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "INVALID_USERNAME",
                message: validation.error,
              },
            },
            { status: 400 }
          );
        }

        normalizedUsername = validation.normalized;

        // Check if username is already taken by another user (case-insensitive)
        if (normalizedUsername) {
          const existingProfile = await prisma.profile.findFirst({
            where: {
              username: { equals: normalizedUsername, mode: 'insensitive' },
              id: { not: user.id },
            },
          });

          if (existingProfile) {
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
        }
      }
    }

    // Validate name length if provided
    if (name !== undefined && name !== null && name.length > 100) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Name must be 100 characters or less",
          },
        },
        { status: 400 }
      );
    }

    // Validate bio length if provided
    if (bio !== undefined && bio !== null && bio.length > 500) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Bio must be 500 characters or less",
          },
        },
        { status: 400 }
      );
    }

    // Handle avatar update
    let newAvatarUrl: string | undefined = undefined;
    if (avatarStyle !== undefined) {
      // Validate avatar style
      const validStyles = getAvatarStyles();
      if (!validStyles.includes(avatarStyle)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: `Invalid avatar style. Valid styles: ${validStyles.join(', ')}`,
            },
          },
          { status: 400 }
        );
      }
      // Generate new DiceBear avatar with selected style
      newAvatarUrl = generateAvatarUrl(user.id, avatarStyle);
    } else if (customAvatarUrl !== undefined) {
      // Allow custom avatar URL (validate it's a valid URL)
      if (customAvatarUrl === null || customAvatarUrl === '') {
        // Reset to default DiceBear avatar
        newAvatarUrl = generateAvatarUrl(user.id);
      } else {
        // Validate URL format
        try {
          const url = new URL(customAvatarUrl);
          // Only allow HTTPS URLs for security
          if (url.protocol !== 'https:') {
            return NextResponse.json(
              {
                success: false,
                error: {
                  code: "VALIDATION_ERROR",
                  message: "Avatar URL must use HTTPS",
                },
              },
              { status: 400 }
            );
          }
          // Limit URL length
          if (customAvatarUrl.length > 500) {
            return NextResponse.json(
              {
                success: false,
                error: {
                  code: "VALIDATION_ERROR",
                  message: "Avatar URL is too long",
                },
              },
              { status: 400 }
            );
          }
          newAvatarUrl = customAvatarUrl;
        } catch {
          return NextResponse.json(
            {
              success: false,
              error: {
                code: "VALIDATION_ERROR",
                message: "Invalid avatar URL",
              },
            },
            { status: 400 }
          );
        }
      }
    }

    const updatedProfile = await prisma.profile.update({
      where: { id: user.id },
      data: {
        ...(name !== undefined && { name: name || null }),
        ...(normalizedUsername !== undefined && { username: normalizedUsername || null }),
        ...(bio !== undefined && { bio: bio || null }),
        ...(newAvatarUrl !== undefined && { avatarUrl: newAvatarUrl }),
      },
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

    return NextResponse.json({
      success: true,
      data: {
        ...updatedProfile,
        image: updatedProfile.avatarUrl, // For backwards compatibility
      },
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
