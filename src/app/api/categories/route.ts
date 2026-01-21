import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/categories - List all categories with prompt counts
export async function GET() {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      success: true,
      data: categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
        promptCount: category.promptCount,
      })),
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
