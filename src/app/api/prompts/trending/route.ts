import { NextRequest, NextResponse } from "next/server";
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

// GET /api/prompts/trending - Get trending prompts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "week"; // today, week, month, all
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const sortBy = searchParams.get("sortBy") || "views"; // views, copies, likes

    // Calculate date filter based on period
    let dateFilter: Date | undefined;
    const now = new Date();
    switch (period) {
      case "today":
        dateFilter = new Date(now.setHours(0, 0, 0, 0));
        break;
      case "week":
        dateFilter = new Date(now.setDate(now.getDate() - 7));
        break;
      case "month":
        dateFilter = new Date(now.setMonth(now.getMonth() - 1));
        break;
      case "all":
      default:
        dateFilter = undefined;
    }

    // Use Supabase if it's the primary backend
    if (dbFeatureFlags.primaryBackend === 'supabase') {
      const supabase = await createServerClient();
      
      // Determine sort column
      let orderColumn = 'view_count';
      switch (sortBy) {
        case "copies":
          orderColumn = 'copy_count';
          break;
        case "likes":
          orderColumn = 'like_count';
          break;
        case "views":
        default:
          orderColumn = 'view_count';
      }
      
      let query = supabase
        .from('prompts')
        .select(`
          id, title, slug, prompt_text, type, status,
          thumbnail_url, image_url, blurhash, category, style,
          copy_count, like_count, view_count, created_at,
          author:profiles!author_id(id, name, username, avatar_url)
        `)
        .eq('status', 'published');
      
      if (dateFilter) {
        query = query.gte('created_at', dateFilter.toISOString());
      }
      
      query = query
        .order(orderColumn, { ascending: false })
        .limit(limit);
      
      const { data: prompts, error } = await query;
      
      if (error) throw error;
      
      // Transform prompts
      const formattedPrompts = (prompts as any[] || []).map((prompt) => ({
        id: prompt.id,
        title: prompt.title,
        slug: prompt.slug,
        promptText: prompt.prompt_text,
        type: prompt.type,
        status: prompt.status,
        thumbnailUrl: prompt.thumbnail_url,
        imageUrl: prompt.image_url,
        blurhash: prompt.blurhash,
        category: prompt.category,
        style: prompt.style,
        tags: [], // Tags would need separate query
        author: prompt.author ? {
          id: prompt.author.id,
          name: prompt.author.name,
          username: prompt.author.username,
          image: prompt.author.avatar_url,
        } : null,
        copyCount: prompt.copy_count || 0,
        likeCount: prompt.like_count || 0,
        viewCount: prompt.view_count || 0,
        createdAt: prompt.created_at,
      }));
      
      return NextResponse.json({
        success: true,
        data: {
          prompts: formattedPrompts,
          trendingTags: [], // Would need separate query for tags
          period,
        },
      });
    }

    // SQLite fallback
    const prisma = await getPrisma();
    if (!prisma) {
      return NextResponse.json({
        success: true,
        data: {
          prompts: [],
          trendingTags: [],
          period,
        },
      });
    }

    // Determine sort field
    let orderBy: Record<string, "desc"> = {};
    switch (sortBy) {
      case "copies":
        orderBy = { copyCount: "desc" };
        break;
      case "likes":
        orderBy = { likeCount: "desc" };
        break;
      case "views":
      default:
        orderBy = { viewCount: "desc" };
    }

    const prompts = await prisma.prompt.findMany({
      where: {
        status: "published",
        ...(dateFilter && { createdAt: { gte: dateFilter } }),
      },
      orderBy,
      take: limit,
      include: {
        author: {
          select: {
            id: true,
            name: true,
            username: true,
            image: true,
          },
        },
      },
    });

    // Parse tags
    const formattedPrompts = prompts.map((prompt) => {
      let tags: string[] = [];
      try {
        tags = JSON.parse(prompt.tags);
      } catch {
        tags = [];
      }
      return {
        ...prompt,
        tags,
      };
    });

    // Get trending tags
    const allTags = formattedPrompts.flatMap((p) => p.tags);
    const tagCounts = allTags.reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const trendingTags = Object.entries(tagCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([tag, count]) => ({ tag, count }));

    return NextResponse.json({
      success: true,
      data: {
        prompts: formattedPrompts,
        trendingTags,
        period,
      },
    });
  } catch (error) {
    console.error("Error fetching trending prompts:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch trending prompts",
        },
      },
      { status: 500 }
    );
  }
}
