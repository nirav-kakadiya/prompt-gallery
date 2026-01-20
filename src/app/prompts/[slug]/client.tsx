"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { PageLayout } from "@/components/layout/page-layout";
import { PromptDetail } from "@/components/prompts/prompt-detail";
import { RelatedPrompts } from "@/components/prompts/related-prompts";
import { useCopyPrompt, useLikePrompt } from "@/hooks/use-prompts";
import { useAuthStore } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { PromptType } from "@/lib/utils";

interface PromptData {
  id: string;
  title: string;
  slug: string;
  promptText: string;
  type: PromptType;
  thumbnailUrl: string | null;
  imageUrl: string | null;
  blurhash: string | null;
  tags: string[];
  category: string | null;
  style: string | null;
  author: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  } | null;
  copyCount: number;
  likeCount: number;
  viewCount: number;
  createdAt: Date | string;
  metadata?: string | null;
}

interface RelatedPromptData {
  id: string;
  title: string;
  slug: string;
  promptText: string;
  type: PromptType;
  thumbnailUrl: string | null;
  blurhash: string | null;
  tags: string[];
  author: {
    id: string;
    name: string | null;
    username: string | null;
    image: string | null;
  } | null;
  copyCount: number;
  likeCount: number;
  viewCount: number;
  createdAt: Date | string;
}

interface PromptDetailClientProps {
  prompt: PromptData;
  relatedPrompts: RelatedPromptData[];
}

export function PromptDetailClient({ prompt, relatedPrompts }: PromptDetailClientProps) {
  const pathname = usePathname();
  const copyMutation = useCopyPrompt();
  const likeMutation = useLikePrompt();
  const { isAuthenticated } = useAuthStore();
  const [likeCount, setLikeCount] = React.useState(prompt.likeCount);
  const [isLiked, setIsLiked] = React.useState(false);

  // Check if user has liked this prompt
  React.useEffect(() => {
    if (isAuthenticated) {
      fetch(`/api/prompts/${prompt.id}/like`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success) {
            setIsLiked(data.data.liked);
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated, prompt.id]);

  // Parse metadata if it's a JSON string
  let metadata = undefined;
  if (prompt.metadata) {
    try {
      metadata = JSON.parse(prompt.metadata);
    } catch {
      metadata = undefined;
    }
  }

  const handleCopy = () => {
    copyMutation.mutate(prompt.id);
  };

  const handleLike = () => {
    if (!isAuthenticated) {
      toast.error("Please log in to like prompts");
      return;
    }

    // Optimistic update
    const newIsLiked = !isLiked;
    setIsLiked(newIsLiked);
    setLikeCount((prev) => (newIsLiked ? prev + 1 : prev - 1));

    likeMutation.mutate(prompt.id, {
      onSuccess: (data) => {
        setIsLiked(data.liked);
        setLikeCount(data.likeCount);
      },
      onError: () => {
        // Revert on error
        setIsLiked(!newIsLiked);
        setLikeCount((prev) => (newIsLiked ? prev - 1 : prev + 1));
        toast.error("Failed to update like");
      },
    });
  };

  return (
    <PageLayout>
      <div className="pb-8">
        <PromptDetail
          prompt={{
            ...prompt,
            likeCount,
            createdAt: typeof prompt.createdAt === 'string' ? prompt.createdAt : prompt.createdAt.toISOString(),
            metadata,
          }}
          isLiked={isLiked}
          onCopy={handleCopy}
          onLike={handleLike}
        />
        <RelatedPrompts
          prompts={relatedPrompts.map((p) => ({
            ...p,
            createdAt: typeof p.createdAt === 'string' ? p.createdAt : p.createdAt.toISOString(),
          }))}
          viewAllHref={`/gallery?category=${prompt.category}`}
        />
      </div>
    </PageLayout>
  );
}
