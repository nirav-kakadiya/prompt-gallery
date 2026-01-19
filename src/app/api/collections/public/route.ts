import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

// GET /api/collections/public - Browse all public collections
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get("pageSize") || "12"))); // Limit max to 50
    const sort = searchParams.get("sort") || "popular";
    const query = searchParams.get("q")?.trim() || "";

    const skip = (page - 1) * pageSize;
    const user = await getCurrentUser();

    // Build where clause
    const where = {
      isPublic: true,
      promptCount: { gt: 0 }, // Only show collections with prompts
      ...(query && {
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
        ],
      }),
    };

    // Build orderBy based on sort option
    // Using _count for savedBy since we removed the denormalized counter
    type OrderBy = { [key: string]: "asc" | "desc" | object }[];
    let orderBy: OrderBy;

    switch (sort) {
      case "newest":
        orderBy = [{ createdAt: "desc" }];
        break;
      case "most_saved":
        orderBy = [{ savedBy: { _count: "desc" } }, { createdAt: "desc" }];
        break;
      case "popular":
      default:
        orderBy = [{ savedBy: { _count: "desc" } }, { promptCount: "desc" }, { createdAt: "desc" }];
        break;
    }

    // Execute count and find in parallel for better performance
    const [total, collections] = await Promise.all([
      prisma.collection.count({ where }),
      prisma.collection.findMany({
        where,
        include: {
          owner: {
            select: { id: true, name: true, username: true, image: true },
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
          // Check if current user has saved each collection
          ...(user && {
            savedBy: {
              where: { userId: user.id },
              take: 1,
              select: { userId: true },
            },
          }),
        },
        orderBy,
        skip,
        take: pageSize,
      }),
    ]);

    // Transform response
    const data = collections.map((collection) => ({
      id: collection.id,
      name: collection.name,
      description: collection.description,
      coverImageUrl: collection.coverImageUrl,
      isPublic: collection.isPublic,
      ownerId: collection.ownerId,
      promptCount: collection.promptCount,
      createdAt: collection.createdAt,
      updatedAt: collection.updatedAt,
      owner: collection.owner,
      _count: collection._count,
      prompts: collection.prompts,
      isSaved: user ? (collection.savedBy?.length ?? 0) > 0 : false,
    }));

    return NextResponse.json({
      success: true,
      data,
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
      { success: false, error: { code: "INTERNAL_ERROR", message: "Failed to fetch collections" } },
      { status: 500 }
    );
  }
}
