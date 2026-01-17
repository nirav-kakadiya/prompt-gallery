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

async function getRelatedPrompts(prompt: { id: string; category: string | null; type: string }) {
  const related = await prisma.prompt.findMany({
    where: {
      id: { not: prompt.id },
      status: "published",
      OR: [
        { category: prompt.category },
        { type: prompt.type },
      ],
    },
    take: 4,
    orderBy: { copyCount: "desc" },
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

  return related.map((p) => {
    let tags: string[] = [];
    try {
      tags = JSON.parse(p.tags);
    } catch {
      tags = [];
    }
    return {
      ...p,
      tags,
      type: p.type as "text-to-image" | "text-to-video" | "image-to-image" | "image-to-video",
    };
  });
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
