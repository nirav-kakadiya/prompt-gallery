import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST /api/admin/link-prompts - Link orphaned prompts to a user
export async function POST(request: NextRequest) {
  try {
    // Check admin secret
    const adminSecret = request.headers.get("x-admin-secret");
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { legacyEmail, newUserId } = body;

    if (!legacyEmail || !newUserId) {
      return NextResponse.json(
        { success: false, error: "legacyEmail and newUserId are required" },
        { status: 400 }
      );
    }

    // Check if profile exists
    let profile = await prisma.profile.findUnique({
      where: { id: newUserId },
      select: { id: true, email: true, username: true, name: true }
    });

    if (!profile) {
      // Create profile if it doesn't exist
      profile = await prisma.profile.create({
        data: {
          id: newUserId,
          email: legacyEmail,
        },
        select: { id: true, email: true, username: true, name: true }
      });
    }

    // Find orphaned prompts with the legacy email
    const orphanedPrompts = await prisma.prompt.findMany({
      where: {
        legacyAuthorEmail: { equals: legacyEmail, mode: "insensitive" }
      },
      select: { id: true, title: true, authorId: true, legacyAuthorEmail: true }
    });

    // Update prompts to link to new user
    const result = await prisma.prompt.updateMany({
      where: {
        legacyAuthorEmail: { equals: legacyEmail, mode: "insensitive" }
      },
      data: {
        authorId: newUserId
      }
    });

    // Also update collections with legacy email
    const collectionsResult = await prisma.collection.updateMany({
      where: {
        legacyOwnerEmail: { equals: legacyEmail, mode: "insensitive" }
      },
      data: {
        ownerId: newUserId
      }
    });

    // Update profile prompt count
    const totalPrompts = await prisma.prompt.count({
      where: { authorId: newUserId }
    });

    await prisma.profile.update({
      where: { id: newUserId },
      data: { promptCount: totalPrompts }
    });

    return NextResponse.json({
      success: true,
      data: {
        profile,
        promptsFound: orphanedPrompts.length,
        promptsLinked: result.count,
        collectionsLinked: collectionsResult.count,
        totalPrompts
      }
    });
  } catch (error) {
    console.error("Error linking prompts:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// PUT /api/admin/link-prompts - Update user profile
export async function PUT(request: NextRequest) {
  try {
    const adminSecret = request.headers.get("x-admin-secret");
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { userId, name, username, avatarUrl } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "userId is required" },
        { status: 400 }
      );
    }

    const profile = await prisma.profile.update({
      where: { id: userId },
      data: {
        ...(name !== undefined && { name }),
        ...(username !== undefined && { username }),
        ...(avatarUrl !== undefined && { avatarUrl }),
      }
    });

    return NextResponse.json({ success: true, data: profile });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}

// GET /api/admin/link-prompts - Check orphaned prompts
export async function GET(request: NextRequest) {
  try {
    const adminSecret = request.headers.get("x-admin-secret");
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (email) {
      // Find prompts with specific legacy email
      const prompts = await prisma.prompt.findMany({
        where: {
          legacyAuthorEmail: { equals: email, mode: "insensitive" }
        },
        select: { id: true, title: true, authorId: true, legacyAuthorEmail: true }
      });

      return NextResponse.json({
        success: true,
        data: { email, count: prompts.length, prompts }
      });
    }

    // Find all prompts without author
    const orphanedPrompts = await prisma.prompt.groupBy({
      by: ["legacyAuthorEmail"],
      where: {
        authorId: null,
        legacyAuthorEmail: { not: null }
      },
      _count: true
    });

    return NextResponse.json({
      success: true,
      data: { orphanedByEmail: orphanedPrompts }
    });
  } catch (error) {
    console.error("Error checking orphaned prompts:", error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
