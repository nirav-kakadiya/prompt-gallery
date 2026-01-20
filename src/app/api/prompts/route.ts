import { NextRequest, NextResponse } from "next/server";
import { generateSlug, parseJSON } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { dbFeatureFlags } from "@/lib/db/feature-flag";
import { createClient as createServerClient } from "@/lib/supabase/server";
import type { PromptType, SortOption } from "@/types";

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

    // Use Supabase if it's the primary backend
    if (dbFeatureFlags.primaryBackend === 'supabase') {
      const supabase = await createServerClient();
      
      // Build Supabase query
      let supabaseQuery = supabase
        .from('prompts')
        .select(`
          id, title, slug, prompt_text, type, status,
          thumbnail_url, image_url, blurhash, category, style,
          copy_count, like_count, view_count, created_at,
          author:profiles!author_id(id, name, username, avatar_url)
        `, { count: 'exact' })
        .eq('status', 'published');
      
      // Search query
      if (query) {
        supabaseQuery = supabaseQuery.or(`title.ilike.%${query}%,prompt_text.ilike.%${query}%`);
      }
      
      // Type filter
      if (types.length > 0) {
        supabaseQuery = supabaseQuery.in('type', types);
      }
      
      // Category filter
      if (category) {
        supabaseQuery = supabaseQuery.eq('category', category);
      }
      
      // Style filter
      if (style) {
        supabaseQuery = supabaseQuery.eq('style', style);
      }
      
      // Sorting
      let orderColumn = 'created_at';
      let ascending = false;
      switch (sortBy) {
        case "oldest":
          orderColumn = 'created_at';
          ascending = true;
          break;
        case "popular":
        case "most_copied":
          orderColumn = 'copy_count';
          break;
        case "most_liked":
          orderColumn = 'like_count';
          break;
        case "alphabetical":
          orderColumn = 'title';
          ascending = true;
          break;
      }
      
      supabaseQuery = supabaseQuery
        .order(orderColumn, { ascending })
        .range((page - 1) * pageSize, page * pageSize - 1);
      
      const { data: prompts, count, error } = await supabaseQuery;
      
      if (error) {
        console.error("Supabase error fetching prompts:", error);
        throw error;
      }
      
      // Transform prompts - type assertion for Supabase
      const rawPrompts = prompts as any[] || [];
      const transformedPrompts = rawPrompts.map((prompt) => ({
        id: prompt.id,
        title: prompt.title,
        slug: prompt.slug,
        promptText: prompt.prompt_text,
        type: prompt.type,
        thumbnailUrl: prompt.thumbnail_url,
        imageUrl: prompt.image_url,
        blurhash: prompt.blurhash,
        tags: [], // Tags need separate query in Supabase
        category: prompt.category,
        style: prompt.style,
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
        data: transformedPrompts,
        meta: {
          page,
          pageSize,
          total: count || 0,
          totalPages: Math.ceil((count || 0) / pageSize),
        },
      });
    }

    // SQLite fallback (local development)
    const prisma = await getPrisma();
    if (!prisma) {
      return NextResponse.json({
        success: true,
        data: [],
        meta: { page, pageSize, total: 0, totalPages: 0 },
      });
    }

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
      imageUrl: prompt.imageUrl,
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

    // Use Supabase if it's the primary backend
    if (dbFeatureFlags.primaryBackend === 'supabase') {
      const supabase = await createServerClient();
      
      // Check for slug uniqueness
      const { data: existingPrompt } = await supabase
        .from('prompts')
        .select('slug')
        .eq('slug', slug)
        .single();
      
      if (existingPrompt) {
        slug = `${slug}-${Date.now().toString(36)}`;
      }
      
      // Create prompt
      const { data: prompt, error } = await supabase
        .from('prompts')
        .insert({
          title,
          slug,
          prompt_text: promptText,
          type,
          category,
          style,
          metadata: metadata || {},
          image_url: imageUrl || null,
          thumbnail_url: thumbnailUrl || null,
          video_url: videoUrl || null,
          status: 'published',
          published_at: new Date().toISOString(),
          author_id: user?.id || null,
        } as never)
        .select('id, slug, status')
        .single();
      
      if (error) {
        console.error("Supabase error creating prompt:", error);
        throw error;
      }
      
      // Insert tags via junction table
      if (tags.length > 0 && prompt) {
        for (const tagName of tags) {
          // Upsert tag
          const { data: tag } = await supabase
            .from('tags')
            .upsert({
              name: tagName,
              slug: tagName.toLowerCase().replace(/\s+/g, '-')
            } as never, { onConflict: 'name' })
            .select('id')
            .single();
          
          if (tag) {
            await supabase
              .from('prompt_tags')
              .insert({ prompt_id: (prompt as any).id, tag_id: (tag as any).id } as never);
          }
        }
      }
      
      return NextResponse.json(
        {
          success: true,
          data: {
            id: (prompt as any).id,
            slug: (prompt as any).slug,
            status: (prompt as any).status,
          },
        },
        { status: 201 }
      );
    }

    // SQLite fallback (local development)
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
