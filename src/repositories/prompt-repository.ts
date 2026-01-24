/**
 * Prompt Repository
 *
 * Centralized data access layer for prompts.
 * Provides a clean abstraction over Prisma for better scalability and testability.
 */

import { prisma } from "@/lib/prisma";
import { cache, cacheKeys, cacheTTL } from "@/lib/cache/kv-cache";
import { hashPromptText } from "@/lib/utils";
import type { PromptType, SortOption, Prompt, PromptCard, PaginationMeta } from "@/types";
import { Prisma } from "@prisma/client";

// Custom error for duplicate prompts
export class DuplicatePromptError extends Error {
  constructor(message = "A prompt with this text already exists") {
    super(message);
    this.name = "DuplicatePromptError";
  }
}

// Input types for repository methods
export interface ListPromptsInput {
  query?: string;
  types?: PromptType[];
  tags?: string[];
  category?: string;
  style?: string;
  sortBy?: SortOption;
  page?: number;
  pageSize?: number;
  status?: string;
  /** If provided, includes private prompts owned by this author */
  currentUserId?: string;
}

export interface CreatePromptInput {
  title: string;
  slug: string;
  promptText: string;
  type: PromptType;
  category?: string;
  style?: string;
  metadata?: Prisma.InputJsonValue;
  imageUrl?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  authorId?: string;
  status?: string;
  isPublic?: boolean;
}

export interface UpdatePromptInput {
  title?: string;
  promptText?: string;
  type?: PromptType;
  category?: string;
  style?: string;
  metadata?: Prisma.InputJsonValue;
  imageUrl?: string;
  thumbnailUrl?: string;
  videoUrl?: string;
  status?: string;
  isPublic?: boolean;
}

// Response types
export interface ListPromptsResult {
  prompts: PromptCard[];
  meta: PaginationMeta;
}

export interface PromptWithRelations {
  prompt: Prompt;
  relatedPrompts: Array<{
    id: string;
    title: string;
    slug: string;
    thumbnailUrl: string | null;
    type: string;
  }>;
}

/**
 * Prompt Repository class
 * Handles all database operations for prompts
 */
export class PromptRepository {
  /**
   * List prompts with filtering, sorting, and pagination
   */
  async list(input: ListPromptsInput = {}): Promise<ListPromptsResult> {
    const {
      query = "",
      types = [],
      tags = [],
      category,
      style,
      sortBy = "newest",
      page = 1,
      pageSize = 20,
      status = "published",
      currentUserId,
    } = input;

    // Create cache key (include currentUserId for proper caching)
    const cacheKey = cacheKeys.prompts({ query, types, tags, category, style, sortBy, page, pageSize }) +
      (currentUserId ? `:user:${currentUserId}` : ":public");

    return cache.getOrFetch(
      cacheKey,
      async () => {
        // Build where clause with AND conditions
        const andConditions: Prisma.PromptWhereInput[] = [{ status }];

        // Visibility filter: show public prompts OR private prompts owned by current user
        if (currentUserId) {
          andConditions.push({
            OR: [
              { isPublic: true },
              { authorId: currentUserId },
            ],
          });
        } else {
          andConditions.push({ isPublic: true });
        }

        // Search query
        if (query) {
          andConditions.push({
            OR: [
              { title: { contains: query, mode: "insensitive" } },
              { promptText: { contains: query, mode: "insensitive" } },
            ],
          });
        }

        const where: Prisma.PromptWhereInput = { AND: andConditions };

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

        // Tag filter
        if (tags.length > 0) {
          where.promptTags = {
            some: {
              tag: {
                name: { in: tags },
              },
            },
          };
        }

        // Build orderBy
        const orderBy = this.buildOrderBy(sortBy);

        // Execute queries in parallel
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
                    select: { name: true },
                  },
                },
              },
            },
          }),
        ]);

        // Transform to PromptCard format
        const transformedPrompts: PromptCard[] = prompts.map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          promptText: p.promptText,
          type: p.type as PromptType,
          thumbnailUrl: p.thumbnailUrl,
          blurhash: p.blurhash,
          tags: p.promptTags.map((pt) => pt.tag.name),
          author: p.author
            ? {
                id: p.author.id,
                name: p.author.name,
                username: p.author.username,
                image: p.author.avatarUrl,
              }
            : null,
          copyCount: p.copyCount,
          likeCount: p.likeCount,
          isPublic: p.isPublic,
          createdAt: p.createdAt.toISOString(),
        }));

        return {
          prompts: transformedPrompts,
          meta: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          },
        };
      },
      { ttl: cacheTTL.prompts }
    );
  }

  /**
   * Get a single prompt by ID or slug
   */
  async findByIdOrSlug(idOrSlug: string): Promise<PromptWithRelations | null> {
    const cacheKey = cacheKeys.prompt(idOrSlug);

    return cache.getOrFetch(
      cacheKey,
      async () => {
        const prompt = await prisma.prompt.findFirst({
          where: {
            OR: [{ id: idOrSlug }, { slug: idOrSlug }],
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
                  select: { name: true },
                },
              },
            },
          },
        });

        if (!prompt) return null;

        // Get related prompts (only public ones)
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

        // Transform to Prompt type
        const transformedPrompt: Prompt = {
          id: prompt.id,
          title: prompt.title,
          slug: prompt.slug,
          promptText: prompt.promptText,
          type: prompt.type as PromptType,
          status: prompt.status as Prompt["status"],
          imageUrl: prompt.imageUrl,
          thumbnailUrl: prompt.thumbnailUrl,
          videoUrl: prompt.videoUrl,
          blurhash: prompt.blurhash,
          tags: prompt.promptTags.map((pt) => pt.tag.name),
          category: prompt.category,
          style: prompt.style,
          authorId: prompt.authorId,
          author: prompt.author
            ? {
                id: prompt.author.id,
                name: prompt.author.name,
                username: prompt.author.username,
                image: prompt.author.avatarUrl,
              }
            : null,
          metadata: (prompt.metadata as Prompt["metadata"]) || {},
          isPublic: prompt.isPublic,
          viewCount: prompt.viewCount,
          copyCount: prompt.copyCount,
          likeCount: prompt.likeCount,
          createdAt: prompt.createdAt.toISOString(),
          updatedAt: prompt.updatedAt.toISOString(),
          publishedAt: prompt.publishedAt?.toISOString() || null,
        };

        return { prompt: transformedPrompt, relatedPrompts };
      },
      { ttl: cacheTTL.prompt }
    );
  }

  /**
   * Create a new prompt
   * @throws {DuplicatePromptError} if prompt with same text already exists
   */
  async create(input: CreatePromptInput): Promise<{ id: string; slug: string }> {
    // Compute hash for duplicate detection
    const promptTextHash = hashPromptText(input.promptText);

    try {
      const prompt = await prisma.prompt.create({
        data: {
          title: input.title,
          slug: input.slug,
          promptText: input.promptText,
          promptTextHash,
          type: input.type,
          category: input.category || null,
          style: input.style || null,
          metadata: input.metadata || {},
          imageUrl: input.imageUrl || null,
          thumbnailUrl: input.thumbnailUrl || null,
          videoUrl: input.videoUrl || null,
          status: input.status || "published",
          isPublic: input.isPublic ?? true,
          publishedAt: new Date(),
          ...(input.authorId && { authorId: input.authorId }),
        },
      });

      // Invalidate cache
      await cache.invalidatePattern("prompts:");

      return { id: prompt.id, slug: prompt.slug };
    } catch (error) {
      // Handle unique constraint violation (duplicate prompt)
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        (error.meta?.target as string[])?.includes("prompt_text_hash")
      ) {
        throw new DuplicatePromptError();
      }
      throw error;
    }
  }

  /**
   * Update an existing prompt
   */
  async update(id: string, input: UpdatePromptInput): Promise<{ id: string; slug: string }> {
    const prompt = await prisma.prompt.update({
      where: { id },
      data: {
        ...(input.title && { title: input.title }),
        ...(input.promptText && { promptText: input.promptText }),
        ...(input.type && { type: input.type }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.style !== undefined && { style: input.style }),
        ...(input.metadata && { metadata: input.metadata }),
        ...(input.imageUrl !== undefined && { imageUrl: input.imageUrl }),
        ...(input.thumbnailUrl !== undefined && { thumbnailUrl: input.thumbnailUrl }),
        ...(input.videoUrl !== undefined && { videoUrl: input.videoUrl }),
        ...(input.status && { status: input.status }),
        ...(input.isPublic !== undefined && { isPublic: input.isPublic }),
      },
    });

    // Invalidate cache
    await Promise.all([
      cache.del(cacheKeys.prompt(id)),
      cache.del(cacheKeys.prompt(prompt.slug)),
      cache.invalidatePattern("prompts:"),
    ]);

    return { id: prompt.id, slug: prompt.slug };
  }

  /**
   * Delete a prompt
   */
  async delete(id: string): Promise<void> {
    const prompt = await prisma.prompt.findUnique({ where: { id } });

    await prisma.prompt.delete({ where: { id } });

    // Invalidate cache
    if (prompt) {
      await Promise.all([
        cache.del(cacheKeys.prompt(id)),
        cache.del(cacheKeys.prompt(prompt.slug)),
        cache.invalidatePattern("prompts:"),
      ]);
    }
  }

  /**
   * Increment view count (fire and forget)
   */
  async incrementViewCount(id: string): Promise<void> {
    prisma.prompt
      .update({
        where: { id },
        data: { viewCount: { increment: 1 } },
      })
      .catch(() => {});
  }

  /**
   * Increment copy count (fire and forget)
   */
  async incrementCopyCount(id: string): Promise<void> {
    prisma.prompt
      .update({
        where: { id },
        data: { copyCount: { increment: 1 } },
      })
      .catch(() => {});
  }

  /**
   * Check if slug exists
   */
  async slugExists(slug: string): Promise<boolean> {
    const prompt = await prisma.prompt.findUnique({ where: { slug } });
    return !!prompt;
  }

  /**
   * Get prompts by author
   * @param authorId - The author's ID
   * @param page - Page number
   * @param pageSize - Number of prompts per page
   * @param currentUserId - If provided and matches authorId, includes private prompts
   */
  async findByAuthor(authorId: string, page = 1, pageSize = 20, currentUserId?: string): Promise<ListPromptsResult> {
    const isOwner = currentUserId === authorId;
    const cacheKey = cacheKeys.userPrompts(authorId, page) + (isOwner ? ":owner" : ":public");

    return cache.getOrFetch(
      cacheKey,
      async () => {
        const where: Prisma.PromptWhereInput = {
          authorId,
          status: "published",
          // Only show private prompts if viewing own profile
          ...(isOwner ? {} : { isPublic: true }),
        };

        const [total, prompts] = await Promise.all([
          prisma.prompt.count({ where }),
          prisma.prompt.findMany({
            where,
            orderBy: { createdAt: "desc" },
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
                    select: { name: true },
                  },
                },
              },
            },
          }),
        ]);

        const transformedPrompts: PromptCard[] = prompts.map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          promptText: p.promptText,
          type: p.type as PromptType,
          thumbnailUrl: p.thumbnailUrl,
          blurhash: p.blurhash,
          tags: p.promptTags.map((pt) => pt.tag.name),
          author: p.author
            ? {
                id: p.author.id,
                name: p.author.name,
                username: p.author.username,
                image: p.author.avatarUrl,
              }
            : null,
          copyCount: p.copyCount,
          likeCount: p.likeCount,
          isPublic: p.isPublic,
          createdAt: p.createdAt.toISOString(),
        }));

        return {
          prompts: transformedPrompts,
          meta: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          },
        };
      },
      { ttl: cacheTTL.userPrompts }
    );
  }

  /**
   * Get trending prompts
   */
  async getTrending(period: "day" | "week" | "month" = "week", limit = 10): Promise<PromptCard[]> {
    const cacheKey = cacheKeys.trending(period);

    return cache.getOrFetch(
      cacheKey,
      async () => {
        const dateThreshold = new Date();
        switch (period) {
          case "day":
            dateThreshold.setDate(dateThreshold.getDate() - 1);
            break;
          case "week":
            dateThreshold.setDate(dateThreshold.getDate() - 7);
            break;
          case "month":
            dateThreshold.setMonth(dateThreshold.getMonth() - 1);
            break;
        }

        const prompts = await prisma.prompt.findMany({
          where: {
            status: "published",
            isPublic: true,
            createdAt: { gte: dateThreshold },
          },
          orderBy: [{ copyCount: "desc" }, { likeCount: "desc" }, { viewCount: "desc" }],
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
                  select: { name: true },
                },
              },
            },
          },
        });

        return prompts.map((p) => ({
          id: p.id,
          title: p.title,
          slug: p.slug,
          promptText: p.promptText,
          type: p.type as PromptType,
          thumbnailUrl: p.thumbnailUrl,
          blurhash: p.blurhash,
          tags: p.promptTags.map((pt) => pt.tag.name),
          author: p.author
            ? {
                id: p.author.id,
                name: p.author.name,
                username: p.author.username,
                image: p.author.avatarUrl,
              }
            : null,
          copyCount: p.copyCount,
          likeCount: p.likeCount,
          isPublic: p.isPublic,
          createdAt: p.createdAt.toISOString(),
        }));
      },
      { ttl: cacheTTL.trending }
    );
  }

  /**
   * Build orderBy clause from sort option
   */
  private buildOrderBy(sortBy: SortOption): Prisma.PromptOrderByWithRelationInput {
    switch (sortBy) {
      case "oldest":
        return { createdAt: "asc" };
      case "popular":
      case "most_copied":
        return { copyCount: "desc" };
      case "most_liked":
        return { likeCount: "desc" };
      case "alphabetical":
        return { title: "asc" };
      case "newest":
      default:
        return { createdAt: "desc" };
    }
  }
}

// Export singleton instance
export const promptRepository = new PromptRepository();

// Export default for convenience
export default promptRepository;
