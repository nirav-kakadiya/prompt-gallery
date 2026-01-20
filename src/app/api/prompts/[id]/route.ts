import { NextRequest, NextResponse } from "next/server";
import { parseJSON } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
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

// GET /api/prompts/[id] - Get single prompt
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Use Supabase if it's the primary backend
    if (dbFeatureFlags.primaryBackend === 'supabase') {
      const supabase = await createServerClient();
      
      // Try to find by ID or slug
      const { data: prompt, error } = await supabase
        .from('prompts')
        .select(`
          id, title, slug, prompt_text, type, status,
          image_url, thumbnail_url, video_url, blurhash,
          category, style, metadata, view_count, copy_count, like_count,
          created_at, updated_at, published_at,
          author:profiles!author_id(id, name, username, avatar_url, bio, prompt_count)
        `)
        .or(`id.eq.${id},slug.eq.${id}`)
        .single();
      
      if (error || !prompt) {
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
      
      // Buffer view count (using RPC function)
      await supabase.rpc('buffer_view', { p_prompt_id: (prompt as any).id } as never);
      
      // Get tags for this prompt
      const { data: tagsData } = await supabase
        .from('prompt_tags')
        .select('tag:tags(name)')
        .eq('prompt_id', (prompt as any).id);
      
      const tags = (tagsData as any[] || []).map(t => t.tag?.name).filter(Boolean);
      
      // Get related prompts
      const { data: relatedPrompts } = await supabase
        .from('prompts')
        .select('id, title, slug, thumbnail_url, type')
        .neq('id', (prompt as any).id)
        .eq('status', 'published')
        .eq('type', (prompt as any).type)
        .order('copy_count', { ascending: false })
        .limit(6);
      
      const p = prompt as any;
      return NextResponse.json({
        success: true,
        data: {
          id: p.id,
          title: p.title,
          slug: p.slug,
          promptText: p.prompt_text,
          type: p.type,
          status: p.status,
          imageUrl: p.image_url,
          thumbnailUrl: p.thumbnail_url,
          videoUrl: p.video_url,
          blurhash: p.blurhash,
          tags,
          category: p.category,
          style: p.style,
          author: p.author ? {
            id: p.author.id,
            name: p.author.name,
            username: p.author.username,
            image: p.author.avatar_url,
            bio: p.author.bio,
            promptCount: p.author.prompt_count,
          } : null,
          metadata: p.metadata || {},
          viewCount: (p.view_count || 0) + 1,
          copyCount: p.copy_count || 0,
          likeCount: p.like_count || 0,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
          publishedAt: p.published_at,
          relatedPrompts: (relatedPrompts || []).map((rp: any) => ({
            id: rp.id,
            title: rp.title,
            slug: rp.slug,
            thumbnailUrl: rp.thumbnail_url,
            type: rp.type,
          })),
        },
      });
    }

    // SQLite fallback (local development)
    const prisma = await getPrisma();
    if (!prisma) {
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
            image: true,
            bio: true,
            promptCount: true,
          },
        },
      },
    });

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

    // Increment view count
    await prisma.prompt.update({
      where: { id: prompt.id },
      data: { viewCount: { increment: 1 } },
    });

    // Get related prompts (same type, similar tags)
    const promptTags = parseJSON<string[]>(prompt.tags, []);
    const relatedPrompts = await prisma.prompt.findMany({
      where: {
        id: { not: prompt.id },
        status: "published",
        type: prompt.type,
      },
      take: 6,
      orderBy: { copyCount: "desc" },
      select: {
        id: true,
        title: true,
        slug: true,
        thumbnailUrl: true,
        type: true,
      },
    });

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
        tags: promptTags,
        category: prompt.category,
        style: prompt.style,
        author: prompt.author,
        metadata: parseJSON(prompt.metadata, {}),
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

    const { title, promptText, type, tags, category, style, metadata } = body;

    // Use Supabase if it's the primary backend
    if (dbFeatureFlags.primaryBackend === 'supabase') {
      const supabase = await createServerClient();
      
      // Find prompt
      const { data: prompt } = await supabase
        .from('prompts')
        .select('id, author_id')
        .eq('id', id)
        .single();
      
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
      if ((prompt as any).author_id !== user.id) {
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
      
      // Update prompt
      const updateData: Record<string, unknown> = {};
      if (title) updateData.title = title;
      if (promptText) updateData.prompt_text = promptText;
      if (type) updateData.type = type;
      if (category !== undefined) updateData.category = category;
      if (style !== undefined) updateData.style = style;
      if (metadata) updateData.metadata = metadata;
      
      const { data: updatedPrompt, error } = await supabase
        .from('prompts')
        .update(updateData as never)
        .eq('id', id)
        .select('id, slug')
        .single();
      
      if (error) throw error;
      
      return NextResponse.json({
        success: true,
        data: {
          id: (updatedPrompt as any).id,
          slug: (updatedPrompt as any).slug,
        },
      });
    }

    // SQLite fallback
    const prisma = await getPrisma();
    if (!prisma) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Database not available",
          },
        },
        { status: 500 }
      );
    }

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
        ...(tags && { tags: JSON.stringify(tags) }),
        ...(category !== undefined && { category }),
        ...(style !== undefined && { style }),
        ...(metadata && { metadata: JSON.stringify(metadata) }),
      },
    });

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

    // Use Supabase if it's the primary backend
    if (dbFeatureFlags.primaryBackend === 'supabase') {
      const supabase = await createServerClient();
      
      // Find prompt
      const { data: prompt } = await supabase
        .from('prompts')
        .select('id, author_id')
        .eq('id', id)
        .single();
      
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
      if ((prompt as any).author_id !== user.id) {
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
      
      // Delete prompt (cascade will handle related records)
      const { error } = await supabase
        .from('prompts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      return NextResponse.json({
        success: true,
        data: { id },
      });
    }

    // SQLite fallback
    const prisma = await getPrisma();
    if (!prisma) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Database not available",
          },
        },
        { status: 500 }
      );
    }

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

    // Decrement author's prompt count
    if (prompt.authorId) {
      await prisma.user.update({
        where: { id: prompt.authorId },
        data: { promptCount: { decrement: 1 } },
      });
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
