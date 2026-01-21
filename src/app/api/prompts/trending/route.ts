import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { memoryCache, cacheKeys, cacheTTL } from "@/lib/cache/memory-cache";

// GET /api/prompts/trending - Get trending prompts
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "week"; // today, week, month, all
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
    const sortBy = searchParams.get("sortBy") || "views"; // views, copies, likes

    // Cache key based on params
    const cacheKey = cacheKeys.trending(period, sortBy) + `:${limit}`;

    const result = await memoryCache.getOrFetch(
      cacheKey,
      async () => {
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
                avatarUrl: true,
              },
            },
            promptTags: {
              include: {
                tag: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        });

        // Format prompts
        const formattedPrompts = prompts.map((prompt) => ({
          id: prompt.id,
          title: prompt.title,
          slug: prompt.slug,
          promptText: prompt.promptText,
          type: prompt.type,
          status: prompt.status,
          thumbnailUrl: prompt.thumbnailUrl,
          imageUrl: prompt.imageUrl,
          blurhash: prompt.blurhash,
          category: prompt.category,
          style: prompt.style,
          tags: prompt.promptTags.map((pt) => pt.tag.name),
          author: prompt.author ? {
            id: prompt.author.id,
            name: prompt.author.name,
            username: prompt.author.username,
            image: prompt.author.avatarUrl,
          } : null,
          copyCount: prompt.copyCount,
          likeCount: prompt.likeCount,
          viewCount: prompt.viewCount,
          createdAt: prompt.createdAt.toISOString(),
        }));

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

        return {
          prompts: formattedPrompts,
          trendingTags,
          period,
        };
      },
      cacheTTL.trending
    );

    return NextResponse.json({
      success: true,
      data: result,
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
