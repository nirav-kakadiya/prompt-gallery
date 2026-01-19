import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/collections/public - Browse all public collections
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "12");
    const sort = searchParams.get("sort") || "popular"; // popular, newest, most_saved
    const query = searchParams.get("q") || "";

    const skip = (page - 1) * pageSize;

    // Get current user to check if they've saved collections
    const user = await getCurrentUser();

    // Build where clause
    const where = {
      isPublic: true,
      ...(query && {
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
        ],
      }),
    };

    // Build orderBy
    let orderBy: object = { saveCount: "desc" };
    if (sort === "newest") {
      orderBy = { createdAt: "desc" };
    } else if (sort === "most_saved") {
      orderBy = { saveCount: "desc" };
    } else if (sort === "popular") {
      orderBy = [{ saveCount: "desc" }, { promptCount: "desc" }];
    }

    // Get total count
    const total = await prisma.collection.count({ where });

    // Get collections
    const collections = await prisma.collection.findMany({
      where,
      include: {
        owner: {
          select: { id: true, name: true, username: true, image: true },
        },
        _count: { select: { prompts: true, savedBy: true } },
        prompts: {
          take: 4,
          include: {
            prompt: {
              select: { id: true, title: true, imageUrl: true, thumbnailUrl: true },
            },
          },
        },
        // Check if current user has saved this collection
        ...(user && {
          savedBy: {
            where: { userId: user.id },
            select: { userId: true },
          },
        }),
      },
      orderBy,
      skip,
      take: pageSize,
    });

    // Transform response to include isSaved flag
    const transformedCollections = collections.map((collection) => ({
      ...collection,
      isSaved: user ? collection.savedBy?.length > 0 : false,
      savedBy: undefined, // Remove the raw savedBy data
    }));

    return NextResponse.json({
      success: true,
      data: transformedCollections,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("Failed to fetch public collections:", error);
    return NextResponse.json(
      { error: "Failed to fetch public collections" },
      { status: 500 }
    );
  }
}
