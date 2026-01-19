import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/collections/[id] - Get a specific collection
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, username: true, image: true },
        },
        prompts: {
          orderBy: { addedAt: "desc" },
          include: {
            prompt: {
              include: {
                author: {
                  select: { id: true, name: true, username: true, image: true },
                },
              },
            },
          },
        },
        _count: {
          select: { prompts: true, savedBy: true },
        },
        // Check if current user has saved this collection (single query optimization)
        ...(user && {
          savedBy: {
            where: { userId: user.id },
            take: 1,
            select: { userId: true },
          },
        }),
      },
    });

    if (!collection) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Collection not found" } },
        { status: 404 }
      );
    }

    // Check if collection is private and user is not the owner
    if (!collection.isPublic && (!user || user.id !== collection.ownerId)) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Collection not found" } },
        { status: 404 }
      );
    }

    // Transform response
    const response = {
      ...collection,
      isSaved: user ? (collection.savedBy?.length ?? 0) > 0 : false,
      savedBy: undefined, // Remove raw savedBy data from response
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Failed to fetch collection:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch collection" } },
      { status: 500 }
    );
  }
}

// PUT /api/collections/[id] - Update a collection
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, isPublic } = body;

    // Check ownership in a single query
    const collection = await prisma.collection.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!collection) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Collection not found" } },
        { status: 404 }
      );
    }

    if (collection.ownerId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You can only edit your own collections" } },
        { status: 403 }
      );
    }

    const updated = await prisma.collection.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isPublic !== undefined && { isPublic }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Failed to update collection:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to update collection" } },
      { status: 500 }
    );
  }
}

// DELETE /api/collections/[id] - Delete a collection
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

    // Check ownership and delete in transaction for consistency
    const collection = await prisma.collection.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!collection) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Collection not found" } },
        { status: 404 }
      );
    }

    if (collection.ownerId !== user.id) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "You can only delete your own collections" } },
        { status: 403 }
      );
    }

    // Prisma cascade will handle related records
    await prisma.collection.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete collection:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to delete collection" } },
      { status: 500 }
    );
  }
}
