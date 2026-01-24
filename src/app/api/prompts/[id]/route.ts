import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { memoryCache, cacheTTL } from "@/lib/cache/memory-cache";

// GET /api/prompts/[id] - Get single prompt
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();
    const cacheKey = `api:prompt:${id}:${user?.id || "anon"}`;

    // Try cache first
    const cached = await memoryCache.getOrFetch(
      cacheKey,
      async () => {
        // Try to find by ID or slug
        const prompt = await prisma.prompt.findFirst({
          where: {
            OR: [{ id }, { slug: id }],
          },
          include: {
            author: {
              select: {
                id: true,
                name: true,
                username: true,
                avatarUrl: true,
                bio: true,
                promptCount: true,
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

        if (!prompt) return null;

        // Check visibility: private prompts only visible to author
        if (!prompt.isPublic && prompt.authorId !== user?.id) {
          return { restricted: true };
        }

        // Get related prompts in parallel with returning (don't block)
        const relatedPrompts = await prisma.prompt.findMany({
          where: {
            id: { not: prompt.id },
            status: "published",
            isPublic: true,
            type: prompt.type,
          },
          take: 4,
          orderBy: { copyCount: "desc" },
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnailUrl: true,
            type: true,
          },
        });

        return { prompt, relatedPrompts };
      },
      cacheTTL.prompts
    );

    if (!cached) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Prompt not found",
          },
        },
        { status: 404 }
      );
    }

    // Handle private prompt accessed by non-owner
    if ("restricted" in cached && cached.restricted) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "This prompt is private",
          },
        },
        { status: 403 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { prompt, relatedPrompts } = cached as any;

    // Fire and forget view count update (don't await)
    prisma.prompt.update({
      where: { id: prompt.id },
      data: { viewCount: { increment: 1 } },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      data: {
        id: prompt.id,
        title: prompt.title,
        slug: prompt.slug,
        promptText: prompt.promptText,
        type: prompt.type,
        status: prompt.status,
        imageUrl: prompt.imageUrl,
        thumbnailUrl: prompt.thumbnailUrl,
        videoUrl: prompt.videoUrl,
        blurhash: prompt.blurhash,
        tags: prompt.promptTags.map((pt: { tag: { name: string } }) => pt.tag.name),
        category: prompt.category,
        style: prompt.style,
        author: prompt.author ? {
          id: prompt.author.id,
          name: prompt.author.name,
          username: prompt.author.username,
          image: prompt.author.avatarUrl,
          bio: prompt.author.bio,
          promptCount: prompt.author.promptCount,
        } : null,
        metadata: prompt.metadata || {},
        isPublic: prompt.isPublic,
        viewCount: prompt.viewCount + 1,
        copyCount: prompt.copyCount,
        likeCount: prompt.likeCount,
        createdAt: prompt.createdAt.toISOString(),
        updatedAt: prompt.updatedAt.toISOString(),
        publishedAt: prompt.publishedAt?.toISOString() || null,
        relatedPrompts,
      },
    });
  } catch (error) {
    console.error("Error fetching prompt:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to fetch prompt",
        },
      },
      { status: 500 }
    );
  }
}

// PUT /api/prompts/[id] - Update prompt
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to update prompts",
          },
        },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const { title, promptText, type, tags, category, style, metadata, isPublic } = body;

    const prompt = await prisma.prompt.findUnique({ where: { id } });

    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Prompt not found",
          },
        },
        { status: 404 }
      );
    }

    // Check if user is the author
    if (prompt.authorId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You can only edit your own prompts",
          },
        },
        { status: 403 }
      );
    }

    const updatedPrompt = await prisma.prompt.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(promptText && { promptText }),
        ...(type && { type }),
        ...(category !== undefined && { category }),
        ...(style !== undefined && { style }),
        ...(metadata && { metadata }),
        ...(isPublic !== undefined && { isPublic }),
      },
    });

    // Update tags if provided
    if (tags) {
      // Remove existing tags
      await prisma.promptTag.deleteMany({
        where: { promptId: id },
      });

      // Add new tags
      for (const tagName of tags) {
        const tag = await prisma.tag.upsert({
          where: { name: tagName },
          create: {
            name: tagName,
            slug: tagName.toLowerCase().replace(/\s+/g, '-'),
          },
          update: {},
        });

        await prisma.promptTag.create({
          data: {
            promptId: id,
            tagId: tag.id,
          },
        }).catch(() => {});
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updatedPrompt.id,
        slug: updatedPrompt.slug,
      },
    });
  } catch (error) {
    console.error("Error updating prompt:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to update prompt",
        },
      },
      { status: 500 }
    );
  }
}

// DELETE /api/prompts/[id] - Delete prompt
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Check authentication
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "UNAUTHORIZED",
            message: "You must be logged in to delete prompts",
          },
        },
        { status: 401 }
      );
    }

    const { id } = await params;

    const prompt = await prisma.prompt.findUnique({ where: { id } });

    if (!prompt) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "Prompt not found",
          },
        },
        { status: 404 }
      );
    }

    // Check if user is the author
    if (prompt.authorId !== user.id) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "You can only delete your own prompts",
          },
        },
        { status: 403 }
      );
    }

    await prisma.prompt.delete({ where: { id } });

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error("Error deleting prompt:", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to delete prompt",
        },
      },
      { status: 500 }
    );
  }
}
