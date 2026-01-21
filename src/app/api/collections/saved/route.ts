import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/collections/saved - Get user's saved collections
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in" } },
        { status: 401 }
      );
    }

    const savedCollections = await prisma.savedCollection.findMany({
      where: { userId: user.id },
      include: {
        collection: {
          include: {
            owner: {
              select: { id: true, name: true, username: true, avatarUrl: true },
            },
            _count: {
              select: { prompts: true, savedBy: true },
            },
            prompts: {
              take: 4,
              orderBy: { addedAt: "desc" },
              include: {
                prompt: {
                  select: {
                    id: true,
                    title: true,
                    imageUrl: true,
                    thumbnailUrl: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { savedAt: "desc" },
    });

    // Transform to return collections with isSaved flag
    const data = savedCollections.map((sc) => ({
      ...sc.collection,
      isSaved: true,
      savedAt: sc.savedAt,
    }));

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Failed to fetch saved collections:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch saved collections" } },
      { status: 500 }
    );
  }
}
