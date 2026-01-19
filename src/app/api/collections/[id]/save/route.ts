import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/collections/[id]/save - Save a collection
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Single query to check collection exists, is public, and not owned by user
    const collection = await prisma.collection.findUnique({
      where: { id },
      select: { id: true, isPublic: true, ownerId: true },
    });

    if (!collection) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Collection not found" } },
        { status: 404 }
      );
    }

    if (collection.ownerId === user.id) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "You cannot save your own collection" } },
        { status: 400 }
      );
    }

    if (!collection.isPublic) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "This collection is private" } },
        { status: 403 }
      );
    }

    // Use upsert to handle race conditions - single atomic operation
    await prisma.savedCollection.upsert({
      where: {
        userId_collectionId: {
          userId: user.id,
          collectionId: id,
        },
      },
      create: {
        userId: user.id,
        collectionId: id,
      },
      update: {}, // No update needed, just prevent duplicate error
    });

    return NextResponse.json({ success: true, saved: true });
  } catch (error) {
    console.error("Failed to save collection:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to save collection" } },
      { status: 500 }
    );
  }
}

// DELETE /api/collections/[id]/save - Unsave a collection
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } },
        { status: 401 }
      );
    }

    const { id } = await params;

    // Use deleteMany to avoid error if not exists - single atomic operation
    const result = await prisma.savedCollection.deleteMany({
      where: {
        userId: user.id,
        collectionId: id,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Collection was not saved" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, saved: false });
  } catch (error) {
    console.error("Failed to unsave collection:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to unsave collection" } },
      { status: 500 }
    );
  }
}
