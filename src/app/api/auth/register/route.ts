import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createToken, setAuthCookie } from "@/lib/auth";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { validateUsername, looksLikeEmail } from "@/lib/username-utils";
import { generateUniqueUsername, generateAvatarUrl, isUsernameAvailable } from "@/lib/profile-utils";

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

    // Validate username format and reserved names
    if (username) {
      if (looksLikeEmail(username)) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "Username cannot be an email address",
            },
          },
          { status: 400 }
        );
      }

      const usernameValidation = validateUsername(username);
      if (!usernameValidation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: usernameValidation.error,
            },
          },
          { status: 400 }
        );
      }
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Determine username - use provided or auto-generate later
    let finalUsername: string | null = null;
    if (username) {
      const usernameResult = validateUsername(username);
      finalUsername = usernameResult.normalized || null;

      // Check if provided username is taken
      if (finalUsername) {
        const isAvailable = await isUsernameAvailable(finalUsername);
        if (!isAvailable) {
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
    }

    const supabase = await createServerClient();

    // Register with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: normalizedEmail,
      password,
      options: {
        data: {
          name: name || null,
          username: finalUsername,
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

    // Auto-generate username if not provided
    if (!finalUsername) {
      finalUsername = await generateUniqueUsername({
        email: normalizedEmail,
        name: name || undefined,
        userId: authData.user.id,
      });
    }

    // Generate DiceBear avatar URL
    const avatarUrl = generateAvatarUrl(authData.user.id);

    // Create or update profile with auto-generated defaults
    // Try to update first (in case Supabase trigger created it)
    const profile = await prisma.profile.findUnique({
      where: { id: authData.user.id },
      select: { id: true }
    });

    if (profile) {
      // Update existing profile
      await prisma.profile.update({
        where: { id: authData.user.id },
        data: {
          email: normalizedEmail,
          username: finalUsername,
          name: name || null,
          avatarUrl: avatarUrl,
        },
      });
    } else {
      // Create new profile
      await prisma.profile.create({
        data: {
          id: authData.user.id,
          email: normalizedEmail,
          username: finalUsername,
          name: name || null,
          avatarUrl: avatarUrl,
        },
      });
    }

    // Create JWT token for fallback auth
    const token = await createToken({ userId: authData.user.id, email: normalizedEmail });
    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name: name || null,
          username: finalUsername,
          image: avatarUrl,
          role: 'user',
        },
        session: authData.session,
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
