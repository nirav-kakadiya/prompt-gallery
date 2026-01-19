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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if collection exists and is public
    const collection = await prisma.collection.findUnique({
      where: { id },
      select: { id: true, isPublic: true, ownerId: true },
    });

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Can't save your own collection
    if (collection.ownerId === user.id) {
      return NextResponse.json(
        { error: "You cannot save your own collection" },
        { status: 400 }
      );
    }

    // Must be public to save
    if (!collection.isPublic) {
      return NextResponse.json(
        { error: "This collection is private" },
        { status: 403 }
      );
    }

    try {
      // Check if already saved
      const existing = await prisma.savedCollection.findUnique({
        where: {
          userId_collectionId: {
            userId: user.id,
            collectionId: id,
          },
        },
      });

      if (existing) {
        return NextResponse.json(
          { error: "Collection already saved" },
          { status: 400 }
        );
      }

      // Save the collection
      await prisma.savedCollection.create({
        data: {
          userId: user.id,
          collectionId: id,
        },
      });

      // Try to increment saveCount if the field exists
      try {
        await prisma.collection.update({
          where: { id },
          data: { saveCount: { increment: 1 } },
        });
      } catch {
        // saveCount field might not exist yet
      }

      return NextResponse.json({ success: true, saved: true });
    } catch (error) {
      // SavedCollection table might not exist yet
      console.error("Save collection error:", error);
      return NextResponse.json(
        { error: "Save feature not available yet. Please restart the server." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Failed to save collection:", error);
    return NextResponse.json(
      { error: "Failed to save collection" },
      { status: 500 }
    );
  }
}

// DELETE /api/collections/[id]/save - Unsave a collection
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    try {
      // Check if saved
      const existing = await prisma.savedCollection.findUnique({
        where: {
          userId_collectionId: {
            userId: user.id,
            collectionId: id,
          },
        },
      });

      if (!existing) {
        return NextResponse.json(
          { error: "Collection not saved" },
          { status: 400 }
        );
      }

      // Unsave the collection
      await prisma.savedCollection.delete({
        where: {
          userId_collectionId: {
            userId: user.id,
            collectionId: id,
          },
        },
      });

      // Try to decrement saveCount if the field exists
      try {
        await prisma.collection.update({
          where: { id },
          data: { saveCount: { decrement: 1 } },
        });
      } catch {
        // saveCount field might not exist yet
      }

      return NextResponse.json({ success: true, saved: false });
    } catch (error) {
      // SavedCollection table might not exist yet
      console.error("Unsave collection error:", error);
      return NextResponse.json(
        { error: "Save feature not available yet. Please restart the server." },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Failed to unsave collection:", error);
    return NextResponse.json(
      { error: "Failed to unsave collection" },
      { status: 500 }
    );
  }
}
