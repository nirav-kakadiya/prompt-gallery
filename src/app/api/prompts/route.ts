import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSlug } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { memoryCache, cacheKeys, cacheTTL } from "@/lib/cache/memory-cache";
import { analyzePromptWithLLM } from "@/lib/vertex-ai";
import { analyzePrompt, cleanMetadata } from "@/lib/prompt-analyzer";
import type { PromptType, SortOption } from "@/types";

// GET /api/prompts - List prompts with filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse query parameters
    const query = searchParams.get("q") || "";
    const types = searchParams.getAll("type") as PromptType[];
    const tags = searchParams.getAll("tag");
    const category = searchParams.get("category");
    const style = searchParams.get("style");
    const authorId = searchParams.get("authorId");
    const sortBy = (searchParams.get("sort") || "newest") as SortOption;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 500);

    // Create cache key from all params
    const cacheKey = cacheKeys.prompts({ query, types, tags, category, style, authorId, sortBy, page, pageSize });

    // Try to get from cache first
    const result = await memoryCache.getOrFetch(
      cacheKey,
      async () => {
        // Build where clause
        const where: Record<string, unknown> = {
          status: "published",
        };

        // Search query
        if (query) {
          where.OR = [
            { title: { contains: query, mode: "insensitive" } },
            { promptText: { contains: query, mode: "insensitive" } },
          ];
        }

        // Type filter
        if (types.length > 0) {
          where.type = { in: types };
        }

        // Category filter
        if (category) {
          where.category = category;
        }

        // Style filter
        if (style) {
          where.style = style;
        }

        // Tag filter - filter in DB query for correct pagination
        if (tags.length > 0) {
          where.promptTags = {
            some: {
              tag: {
                name: { in: tags }
              }
            }
          };
        }

        // Author filter
        if (authorId) {
          where.authorId = authorId;
        }

        // Build orderBy - use array for stable sorting with secondary sort by id
        let orderBy: Record<string, string>[] = [{ createdAt: "desc" }, { id: "desc" }];
        switch (sortBy) {
          case "newest":
            orderBy = [{ createdAt: "desc" }, { id: "desc" }];
            break;
          case "oldest":
            orderBy = [{ createdAt: "asc" }, { id: "asc" }];
            break;
          case "popular":
          case "most_copied":
            orderBy = [{ copyCount: "desc" }, { createdAt: "desc" }];
            break;
          case "most_liked":
            orderBy = [{ likeCount: "desc" }, { createdAt: "desc" }];
            break;
          case "alphabetical":
            orderBy = [{ title: "asc" }, { createdAt: "desc" }];
            break;
        }

        // Get total count and prompts in parallel
        const [total, prompts] = await Promise.all([
          prisma.prompt.count({ where }),
          prisma.prompt.findMany({
            where,
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
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
          }),
        ]);

        // Transform prompts
        const transformedPrompts = prompts.map((prompt) => ({
          id: prompt.id,
          title: prompt.title,
          slug: prompt.slug,
          promptText: prompt.promptText,
          type: prompt.type,
          thumbnailUrl: prompt.thumbnailUrl,
          imageUrl: prompt.imageUrl,
          blurhash: prompt.blurhash,
          tags: prompt.promptTags.map((pt) => pt.tag.name),
          category: prompt.category,
          style: prompt.style,
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

        return {
          data: transformedPrompts,
          meta: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          },
        };
      },
      cacheTTL.prompts
    );

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Error fetching prompts:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch prompts",
        },
      },
      { status: 500 }
    );
  }
}

// POST /api/prompts - Create a new prompt
export async function POST(request: NextRequest) {
  try {
    // Get current user (optional - prompts can be created anonymously)
    const user = await getCurrentUser();

    const body = await request.json();

    const {
      title,
      promptText,
      type,
      tags = [],
      category,
      style,
      metadata = {},
      imageUrl,
      thumbnailUrl,
      videoUrl,
    } = body;

    // Validation
    const validationErrors = [];

    if (!title) validationErrors.push({ field: "title", message: "Title is required" });
    if (!promptText) validationErrors.push({ field: "promptText", message: "Prompt text is required" });
    if (!type) validationErrors.push({ field: "type", message: "Type is required" });

    // Max length validation
    if (title && title.length > 200) {
      validationErrors.push({ field: "title", message: "Title must be 200 characters or less" });
    }
    if (promptText && promptText.length > 50000) {
      validationErrors.push({ field: "promptText", message: "Prompt text must be 50,000 characters or less" });
    }
    if (tags && tags.length > 10) {
      validationErrors.push({ field: "tags", message: "Maximum 10 tags allowed" });
    }

    if (validationErrors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: validationErrors,
          },
        },
        { status: 400 }
      );
    }

    // Generate slug
    let slug = generateSlug(title);

    // Check for slug uniqueness
    const existingPrompt = await prisma.prompt.findUnique({ where: { slug } });
    if (existingPrompt) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    // Analyze prompt using LLM (with pattern-matching fallback)
    let finalCategory = category;
    let finalStyle = style;
    let finalMetadata = metadata || {};
    let allTags = [...tags];
    let analysisFormat = "user_provided";

    // Only call LLM if we need to extract data (category, style, or tags not provided)
    const needsAnalysis = !category || !style || tags.length === 0;

    if (needsAnalysis) {
      // Try LLM analysis first (more accurate)
      const llmAnalysis = await analyzePromptWithLLM(promptText);

      if (llmAnalysis.success) {
        analysisFormat = "llm";
        finalCategory = category || llmAnalysis.category || null;
        finalStyle = style || llmAnalysis.style || null;
        finalMetadata = {
          ...(llmAnalysis.metadata || {}),
          ...metadata,
        };
        // Merge tags: user-provided + LLM-suggested (deduplicated)
        const llmTags = llmAnalysis.tags || [];
        allTags = [...new Set([...tags, ...llmTags])].slice(0, 10);
      } else {
        // Fallback to pattern-matching if LLM fails
        console.warn("[Prompts API] LLM analysis failed, falling back to pattern matching");
        const patternAnalysis = analyzePrompt(promptText);
        analysisFormat = "pattern";
        finalCategory = category || patternAnalysis.suggestedCategory || null;
        finalStyle = style || patternAnalysis.suggestedStyle || null;
        finalMetadata = {
          ...cleanMetadata(patternAnalysis.metadata),
          ...metadata,
        };
        allTags = [...new Set([...tags, ...patternAnalysis.suggestedTags])].slice(0, 10);
      }
    }

    // Create prompt with author if user is authenticated
    const prompt = await prisma.prompt.create({
      data: {
        title,
        slug,
        promptText,
        type,
        category: finalCategory,
        style: finalStyle,
        metadata: finalMetadata,
        imageUrl: imageUrl || null,
        thumbnailUrl: thumbnailUrl || null,
        videoUrl: videoUrl || null,
        status: "published",
        publishedAt: new Date(),
        ...(user && { authorId: user.id }),
      },
    });

    // Create tags (includes user-provided + auto-extracted tags)
    if (allTags.length > 0) {
      for (const tagName of allTags) {
        // Upsert tag
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          create: {
            name: tagName,
            slug: tagName.toLowerCase().replace(/\s+/g, '-'),
          },
          update: {},
        });

        // Create junction
        await prisma.promptTag.create({
          data: {
            promptId: prompt.id,
            tagId: tag.id,
          },
        }).catch(() => {
          // Ignore duplicate key errors
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: prompt.id,
          slug: prompt.slug,
          status: prompt.status,
          // Return analyzed data so frontend knows what was extracted
          analyzed: {
            category: finalCategory,
            style: finalStyle,
            tags: allTags,
            format: analysisFormat, // "llm", "pattern", or "user_provided"
          },
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating prompt:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to create prompt",
        },
      },
      { status: 500 }
    );
  }
}
