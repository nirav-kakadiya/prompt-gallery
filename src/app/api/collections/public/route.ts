import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/collections/public - Browse all public collections
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "12");
    const sort = searchParams.get("sort") || "popular"; // popular, newest, most_saved
    const query = searchParams.get("q") || "";

    const skip = (page - 1) * pageSize;

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

    // Build orderBy - use promptCount for now since saveCount might not exist yet
    let orderBy: object = { promptCount: "desc" };
    if (sort === "newest") {
      orderBy = { createdAt: "desc" };
    } else if (sort === "most_saved" || sort === "popular") {
      orderBy = [{ promptCount: "desc" }, { createdAt: "desc" }];
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
      orderBy,
      skip,
      take: pageSize,
    });

    // Transform response
    const transformedCollections = collections.map((collection) => ({
      ...collection,
      isSaved: false, // Will be updated once savedBy relation works
      _count: {
        ...collection._count,
        savedBy: 0, // Placeholder until savedBy relation works
      },
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
