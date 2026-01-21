import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { memoryCache } from "@/lib/cache/memory-cache";

// Cache categories for 10 minutes (they rarely change)
const CATEGORIES_CACHE_TTL = 10 * 60 * 1000;

// GET /api/categories - List all categories with prompt counts
export async function GET() {
  try {
    const data = await memoryCache.getOrFetch(
      "categories:all",
      async () => {
        const categories = await prisma.category.findMany({
          orderBy: { name: "asc" },
        });

        return categories.map((category) => ({
          id: category.id,
          name: category.name,
          slug: category.slug,
          description: category.description,
          icon: category.icon,
          promptCount: category.promptCount,
        }));
      },
      CATEGORIES_CACHE_TTL
    );

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch categories",
        },
      },
      { status: 500 }
    );
  }
}
