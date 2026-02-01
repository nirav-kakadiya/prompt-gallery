"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { useLenis } from "lenis/react";
import { PageLayout } from "@/components/layout/page-layout";
import { PromptDetail } from "@/components/prompts/prompt-detail";
import { RelatedPrompts } from "@/components/prompts/related-prompts";
import { useCopyPrompt, useLikePrompt } from "@/hooks/use-prompts";
import { useAuthStore } from "@/hooks/use-auth";
import { toast } from "sonner";
import type { PromptType } from "@/lib/utils";

interface PromptImage {
  id: string;
  imageUrl: string;
  thumbnailUrl: string | null;
  displayOrder: number;
  caption: string | null;
}

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
  images?: PromptImage[];
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
  const lenis = useLenis();
  const copyMutation = useCopyPrompt();
  const likeMutation = useLikePrompt();
  const { isAuthenticated } = useAuthStore();
  const [likeCount, setLikeCount] = React.useState(prompt.likeCount);
  const [isLiked, setIsLiked] = React.useState(false);

  // Scroll to top when navigating to this page or when prompt changes
  React.useEffect(() => {
    // Disable browser scroll restoration
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }

    const scrollToTop = () => {
      // Use Lenis scrollTo for smooth scroll
      if (lenis) {
        lenis.scrollTo(0, {
          duration: 0.8,
          easing: (t) => 1 - Math.pow(1 - t, 3), // easeOutCubic
        });
      } else {
        // Fallback for native smooth scroll
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    // Small delay to let the page render first, then smooth scroll
    const t = setTimeout(scrollToTop, 50);

    return () => clearTimeout(t);
  }, [pathname, prompt.id, lenis]);

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
        .catch(() => { });
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
            images: prompt.images,
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
