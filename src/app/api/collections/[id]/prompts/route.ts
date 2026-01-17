import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/collections/[id]/prompts - Add prompt to collection
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { promptId } = body;

    if (!promptId) {
      return NextResponse.json(
        { error: "Prompt ID is required" },
        { status: 400 }
      );
    }

    // Check collection ownership
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

    // Check if prompt exists
    const prompt = await prisma.prompt.findUnique({
      where: { id: promptId },
      select: { id: true },
    });

    if (!prompt) {
      return NextResponse.json({ error: "Prompt not found" }, { status: 404 });
    }

    // Add prompt to collection (using junction table)
    await prisma.collectionPrompt.create({
      data: {
        collectionId: id,
        promptId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to add prompt to collection:", error);
    return NextResponse.json(
      { error: "Failed to add prompt to collection" },
      { status: 500 }
    );
  }
}

// DELETE /api/collections/[id]/prompts - Remove prompt from collection
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const promptId = searchParams.get("promptId");

    if (!promptId) {
      return NextResponse.json(
        { error: "Prompt ID is required" },
        { status: 400 }
      );
    }

    // Check collection ownership
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

    // Remove prompt from collection (using junction table)
    await prisma.collectionPrompt.delete({
      where: {
        collectionId_promptId: {
          collectionId: id,
          promptId,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove prompt from collection:", error);
    return NextResponse.json(
      { error: "Failed to remove prompt from collection" },
      { status: 500 }
    );
  }
}
