import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { PromptDetailClient } from "./client";
import { memoryCache, cacheTTL } from "@/lib/cache/memory-cache";

// ISR: Revalidate pages every 60 seconds for fresh data with edge caching
export const revalidate = 60;

// Generate static params for the most popular prompts (pre-render at build time)
export async function generateStaticParams() {
  try {
    const prompts = await prisma.prompt.findMany({
      where: { status: "published" },
      orderBy: { copyCount: "desc" },
      take: 50, // Pre-generate top 50 most popular prompts
      select: { slug: true },
    });
    return prompts.map((prompt) => ({ slug: prompt.slug }));
  } catch {
    return [];
  }
}

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Cache the prompt fetch to avoid duplicate queries between generateMetadata and page
const getPromptData = cache(async (slug: string) => {
  // Try memory cache first
  const cacheKey = `prompt:${slug}`;

  return memoryCache.getOrFetch(
    cacheKey,
    async () => {
      const prompt = await prisma.prompt.findUnique({
        where: { slug },
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
                select: { name: true }
              }
            }
          },
          images: {
            orderBy: { displayOrder: "asc" },
            select: {
              id: true,
              imageUrl: true,
              thumbnailUrl: true,
              displayOrder: true,
              caption: true,
            }
          }
        },
      });

      if (!prompt) return null;

      // Increment view count - fire and forget (don't await)
      prisma.prompt.update({
        where: { id: prompt.id },
        data: { viewCount: { increment: 1 } },
      }).catch(() => {});

      const tags = prompt.promptTags.map(pt => pt.tag.name);

      return {
        ...prompt,
        tags,
        type: prompt.type as "text-to-image" | "text-to-video" | "image-to-image" | "image-to-video",
        author: prompt.author ? {
          id: prompt.author.id,
          name: prompt.author.name,
          username: prompt.author.username,
          image: prompt.author.avatarUrl,
        } : null,
        metadata: prompt.metadata ? JSON.stringify(prompt.metadata) : null,
        images: prompt.images || [],
      };
    },
    cacheTTL.prompts
  );
});

// Generate metadata for SEO - uses cached prompt data
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const prompt = await getPromptData(slug);

  if (!prompt) {
    return { title: "Prompt Not Found" };
  }

  return {
    title: prompt.title,
    description: prompt.promptText.slice(0, 160),
    openGraph: {
      title: prompt.title,
      description: prompt.promptText.slice(0, 160),
      images: prompt.thumbnailUrl ? [prompt.thumbnailUrl] : [],
    },
  };
}

// Get related prompts - simplified for performance
async function getRelatedPrompts(prompt: {
  id: string;
  type: string;
  category: string | null;
}) {
  const cacheKey = `related:${prompt.id}`;

  return memoryCache.getOrFetch(
    cacheKey,
    async () => {
      // Simple query: same type or category, ordered by popularity
      const candidates = await prisma.prompt.findMany({
        where: {
          id: { not: prompt.id },
          status: "published",
          OR: [
            { type: prompt.type },
            ...(prompt.category ? [{ category: prompt.category }] : []),
          ],
        },
        take: 4,
        orderBy: { copyCount: "desc" },
        select: {
          id: true,
          title: true,
          slug: true,
          promptText: true,
          type: true,
          thumbnailUrl: true,
          blurhash: true,
          copyCount: true,
          likeCount: true,
          viewCount: true,
          createdAt: true,
          author: {
            select: {
              id: true,
              name: true,
              username: true,
              avatarUrl: true,
            },
          },
          promptTags: {
            take: 5,
            select: {
              tag: { select: { name: true } }
            }
          }
        },
      });

      return candidates.map(candidate => ({
        ...candidate,
        tags: candidate.promptTags.map(pt => pt.tag.name),
        type: candidate.type as "text-to-image" | "text-to-video" | "image-to-image" | "image-to-video",
        author: candidate.author ? {
          id: candidate.author.id,
          name: candidate.author.name,
          username: candidate.author.username,
          image: candidate.author.avatarUrl,
        } : null,
      }));
    },
    cacheTTL.prompts
  );
}

export default async function PromptDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const prompt = await getPromptData(slug);

  if (!prompt) {
    notFound();
  }

  // Fetch related prompts (simplified query for performance)
  const relatedPrompts = await getRelatedPrompts({
    id: prompt.id,
    type: prompt.type,
    category: prompt.category,
  });

  return <PromptDetailClient prompt={prompt} relatedPrompts={relatedPrompts} />;
}
