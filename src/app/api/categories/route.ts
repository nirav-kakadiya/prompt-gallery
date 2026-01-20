import { NextResponse } from "next/server";
import { dbFeatureFlags } from "@/lib/db/feature-flag";
import { createClient as createServerClient } from "@/lib/supabase/server";

/**
 * Check if SQLite/Prisma is available (not on serverless)
 */
const isSqliteAvailable = !(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

/**
 * Lazy-load Prisma only when SQLite is available
 */
async function getPrisma() {
  if (!isSqliteAvailable) return null;
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

// GET /api/categories - List all categories with prompt counts
export async function GET() {
  try {
    // Use Supabase if it's the primary backend
    if (dbFeatureFlags.primaryBackend === 'supabase') {
      const supabase = await createServerClient();
      
      const { data: categories, error } = await supabase
        .from('categories')
        .select('id, name, slug, description, icon, prompt_count')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      return NextResponse.json({
        success: true,
        data: (categories || []).map((cat: any) => ({
          id: cat.id,
          name: cat.name,
          slug: cat.slug,
          description: cat.description,
          icon: cat.icon,
          promptCount: cat.prompt_count || 0,
        })),
      });
    }

    // SQLite fallback
    const prisma = await getPrisma();
    if (!prisma) {
      return NextResponse.json({
        success: true,
        data: [],
      });
    }

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
