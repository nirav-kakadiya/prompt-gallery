import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateSlug, parseJSON } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
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
    const sortBy = (searchParams.get("sort") || "newest") as SortOption;
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = Math.min(parseInt(searchParams.get("pageSize") || "20"), 100);

    // Build where clause
    const where: Record<string, unknown> = {
      status: "published",
    };

    // Search query
    if (query) {
      where.OR = [
        { title: { contains: query } },
        { promptText: { contains: query } },
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

    // Build orderBy
    let orderBy: Record<string, string> = { createdAt: "desc" };
    switch (sortBy) {
      case "oldest":
        orderBy = { createdAt: "asc" };
        break;
      case "popular":
      case "most_copied":
        orderBy = { copyCount: "desc" };
        break;
      case "most_liked":
        orderBy = { likeCount: "desc" };
        break;
      case "alphabetical":
        orderBy = { title: "asc" };
        break;
    }

    // Get total count
    const total = await prisma.prompt.count({ where });

    // Get prompts
    const prompts = await prisma.prompt.findMany({
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
            image: true,
          },
        },
      },
    });

    // Transform prompts
    const transformedPrompts = prompts.map((prompt) => ({
      id: prompt.id,
      title: prompt.title,
      slug: prompt.slug,
      promptText: prompt.promptText,
      type: prompt.type,
      thumbnailUrl: prompt.thumbnailUrl,
      imageUrl: prompt.imageUrl, // Fallback for cards if thumbnailUrl is not set
      blurhash: prompt.blurhash,
      tags: parseJSON<string[]>(prompt.tags, []),
      category: prompt.category,
      style: prompt.style,
      author: prompt.author,
      copyCount: prompt.copyCount,
      likeCount: prompt.likeCount,
      viewCount: prompt.viewCount,
      createdAt: prompt.createdAt.toISOString(),
    }));

    // Filter by tags (post-query since SQLite doesn't support array contains)
    const filteredPrompts = tags.length > 0
      ? transformedPrompts.filter((p) =>
          tags.some((tag) => p.tags.includes(tag))
        )
      : transformedPrompts;

    return NextResponse.json({
      success: true,
      data: filteredPrompts,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
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
    if (!title || !promptText || !type) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Missing required fields",
            details: [
              !title && { field: "title", message: "Title is required" },
              !promptText && { field: "promptText", message: "Prompt text is required" },
              !type && { field: "type", message: "Type is required" },
            ].filter(Boolean),
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

    // Create prompt with author if user is authenticated
    const prompt = await prisma.prompt.create({
      data: {
        title,
        slug,
        promptText,
        type,
        tags: JSON.stringify(tags),
        category,
        style,
        metadata: JSON.stringify(metadata),
        imageUrl: imageUrl || null,
        thumbnailUrl: thumbnailUrl || null,
        videoUrl: videoUrl || null,
        status: "published",
        publishedAt: new Date(),
        ...(user && { authorId: user.id }),
      },
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

    // Update author's prompt count if user is authenticated
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: { promptCount: { increment: 1 } },
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          id: prompt.id,
          slug: prompt.slug,
          status: prompt.status,
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
