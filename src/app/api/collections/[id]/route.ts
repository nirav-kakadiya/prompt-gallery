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

    const collection = await prisma.collection.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, username: true, image: true },
        },
        prompts: {
          include: {
            prompt: {
              include: {
                author: { select: { id: true, name: true, username: true, image: true } },
              },
            },
          },
        },
        _count: { select: { prompts: true } },
      },
    });

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    // Check if collection is private and user is not the owner
    if (!collection.isPublic) {
      const user = await getCurrentUser();
      if (!user || user.id !== collection.ownerId) {
        return NextResponse.json(
          { error: "Collection not found" },
          { status: 404 }
        );
      }
    }

    return NextResponse.json(collection);
  } catch (error) {
    console.error("Failed to fetch collection:", error);
    return NextResponse.json(
      { error: "Failed to fetch collection" },
      { status: 500 }
    );
  }
}

// PUT /api/collections/[id] - Update a collection
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, description, isPublic } = body;

    // Check ownership
    const collection = await prisma.collection.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    if (collection.ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updated = await prisma.collection.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(isPublic !== undefined && { isPublic }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Failed to update collection:", error);
    return NextResponse.json(
      { error: "Failed to update collection" },
      { status: 500 }
    );
  }
}

// DELETE /api/collections/[id] - Delete a collection
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check ownership
    const collection = await prisma.collection.findUnique({
      where: { id },
      select: { ownerId: true },
    });

    if (!collection) {
      return NextResponse.json(
        { error: "Collection not found" },
        { status: 404 }
      );
    }

    if (collection.ownerId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.collection.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete collection:", error);
    return NextResponse.json(
      { error: "Failed to delete collection" },
      { status: 500 }
    );
  }
}
