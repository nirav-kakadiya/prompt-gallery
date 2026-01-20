import { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PromptDetailClient } from "./client";

interface PageProps {
  params: Promise<{ slug: string }>;
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const prompt = await prisma.prompt.findUnique({
    where: { slug },
    select: { title: true, promptText: true, thumbnailUrl: true },
  });

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

async function getPrompt(slug: string) {
  const prompt = await prisma.prompt.findUnique({
    where: { slug },
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

  if (!prompt) return null;

  // Increment view count
  await prisma.prompt.update({
    where: { id: prompt.id },
    data: { viewCount: { increment: 1 } },
  });

  // Parse tags from JSON string
  let tags: string[] = [];
  try {
    tags = JSON.parse(prompt.tags);
  } catch {
    tags = [];
  }

  return {
    ...prompt,
    tags,
    type: prompt.type as "text-to-image" | "text-to-video" | "image-to-image" | "image-to-video",
  };
}

async function getRelatedPrompts(prompt: {
  id: string;
  category: string | null;
  type: string;
  tags: string[];
  style: string | null;
  authorId?: string | null;
}) {
  // Cost-optimized: Only fetch prompts that have at least one matching attribute
  // This reduces DB load significantly compared to fetching all prompts
  const candidates = await prisma.prompt.findMany({
    where: {
      id: { not: prompt.id },
      status: "published",
      OR: [
        ...(prompt.category ? [{ category: prompt.category }] : []),
        { type: prompt.type },
        ...(prompt.style ? [{ style: prompt.style }] : []),
        ...(prompt.authorId ? [{ authorId: prompt.authorId }] : []),
      ],
    },
    take: 20, // Reduced from 50 - enough for good selection while saving resources
    orderBy: { copyCount: "desc" },
    select: {
      // Only select needed fields to reduce memory/transfer
      id: true,
      title: true,
      slug: true,
      promptText: true,
      type: true,
      thumbnailUrl: true,
      blurhash: true,
      tags: true,
      category: true,
      style: true,
      authorId: true,
      copyCount: true,
      likeCount: true,
      viewCount: true,
      createdAt: true,
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

  // Early return if no candidates
  if (candidates.length === 0) {
    return [];
  }

  // Prepare lowercase tags once for efficient comparison
  const promptTagsLower = prompt.tags.map(t => t.toLowerCase());

  // Score and sort candidates by relevance
  const scored = candidates.map((candidate) => {
    let candidateTags: string[] = [];
    try {
      candidateTags = JSON.parse(candidate.tags);
    } catch {
      candidateTags = [];
    }

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

    return { ...candidate, tags: candidateTags, score };
  });

  // Sort by score and return top 4
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(({ score, ...rest }) => ({
      ...rest,
      type: rest.type as "text-to-image" | "text-to-video" | "image-to-image" | "image-to-video",
    }));
}

export default async function PromptDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const prompt = await getPrompt(slug);

  if (!prompt) {
    notFound();
  }

  const relatedPrompts = await getRelatedPrompts(prompt);

  return <PromptDetailClient prompt={prompt} relatedPrompts={relatedPrompts} />;
}
