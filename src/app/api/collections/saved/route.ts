import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/collections/saved - Get user's saved collections
export async function GET() {
  try {
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if SavedCollection table exists by trying to query it
    // If it fails, return empty array (table not yet created)
    try {
      const savedCollections = await prisma.savedCollection.findMany({
        where: { userId: user.id },
        include: {
          collection: {
            include: {
              owner: {
                select: { id: true, name: true, username: true, image: true },
              },
              _count: { select: { prompts: true } },
              prompts: {
                take: 4,
                include: {
                  prompt: {
                    select: { id: true, title: true, imageUrl: true, thumbnailUrl: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { savedAt: "desc" },
      });

      // Transform to return the collections directly with isSaved = true
      const collections = savedCollections.map((sc) => ({
        ...sc.collection,
        isSaved: true,
        savedAt: sc.savedAt,
        _count: {
          ...sc.collection._count,
          savedBy: 0,
        },
      }));

      return NextResponse.json({
        success: true,
        data: collections,
      });
    } catch {
      // SavedCollection table might not exist yet
      return NextResponse.json({
        success: true,
        data: [],
      });
    }
  } catch (error) {
    console.error("Failed to fetch saved collections:", error);
    return NextResponse.json(
      { error: "Failed to fetch saved collections" },
      { status: 500 }
    );
  }
}
