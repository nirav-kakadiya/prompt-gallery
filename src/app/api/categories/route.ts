import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/categories - List all categories with prompt counts
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });

    // Get prompt counts for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const count = await prisma.prompt.count({
          where: {
            category: category.slug,
            status: "published",
          },
        });
        return {
          ...category,
          promptCount: count,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: categoriesWithCounts,
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
