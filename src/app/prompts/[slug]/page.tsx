import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { PromptDetailClient } from "./client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Cache the prompt fetch to avoid duplicate queries between generateMetadata and page
const getPromptData = cache(async (slug: string) => {
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
  };
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

// Get related prompts - matches original algorithm with tag scoring
async function getRelatedPrompts(prompt: {
  id: string;
  type: string;
  category: string | null;
  style: string | null;
  tags: string[];
  authorId?: string | null;
}) {
  // Build OR conditions for relevance
  const orConditions: Array<{ type?: string; category?: string; style?: string; authorId?: string }> = [
    { type: prompt.type },
  ];
  if (prompt.category) orConditions.push({ category: prompt.category });
  if (prompt.style) orConditions.push({ style: prompt.style });
  if (prompt.authorId) orConditions.push({ authorId: prompt.authorId });

  const candidates = await prisma.prompt.findMany({
    where: {
      id: { not: prompt.id },
      status: "published",
      OR: orConditions,
    },
    take: 20,
    orderBy: { copyCount: "desc" },
    select: {
      id: true,
      title: true,
      slug: true,
      promptText: true,
      type: true,
      category: true,
      style: true,
      authorId: true,
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
        select: {
          tag: { select: { name: true } }
        }
      }
    },
  });

  if (candidates.length === 0) return [];

  // Prepare lowercase tags for comparison
  const promptTagsLower = prompt.tags.map(t => t.toLowerCase());

  // Score by relevance (same algorithm as original)
  const scored = candidates.map(candidate => {
    const candidateTags = candidate.promptTags.map(pt => pt.tag.name);
    let score = 0;

    // Score 1: Shared tags (highest weight - 5 points per shared tag)
    if (promptTagsLower.length > 0 && candidateTags.length > 0) {
      const candidateTagsLower = candidateTags.map(t => t.toLowerCase());
      const sharedCount = promptTagsLower.filter(t => candidateTagsLower.includes(t)).length;
      score += sharedCount * 5;
    }

    // Score 2: Same category (3 points)
    if (prompt.category && candidate.category === prompt.category) {
      score += 3;
    }

    // Score 3: Same type (2 points)
    if (candidate.type === prompt.type) {
      score += 2;
    }

    // Score 4: Same style (2 points)
    if (prompt.style && candidate.style === prompt.style) {
      score += 2;
    }

    // Score 5: Same author (1 point)
    if (prompt.authorId && candidate.authorId === prompt.authorId) {
      score += 1;
    }

    return { ...candidate, candidateTags, score };
  });

  // Sort by score, take top 4
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ score, candidateTags, promptTags, ...rest }) => ({
      ...rest,
      tags: candidateTags,
      type: rest.type as "text-to-image" | "text-to-video" | "image-to-image" | "image-to-video",
      author: rest.author ? {
        id: rest.author.id,
        name: rest.author.name,
        username: rest.author.username,
        image: rest.author.avatarUrl,
      } : null,
    }));
}

export default async function PromptDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const prompt = await getPromptData(slug);

  if (!prompt) {
    notFound();
  }

  // Fetch related prompts with full scoring (tags, category, type, style, author)
  const relatedPrompts = await getRelatedPrompts({
    id: prompt.id,
    type: prompt.type,
    category: prompt.category,
    style: prompt.style,
    tags: prompt.tags,
    authorId: prompt.authorId,
  });

  return <PromptDetailClient prompt={prompt} relatedPrompts={relatedPrompts} />;
}
