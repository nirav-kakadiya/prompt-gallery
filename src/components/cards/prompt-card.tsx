"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Copy, Heart, Eye, MoreHorizontal, ExternalLink, Share2 } from "lucide-react";
import { cn, formatNumber, copyToClipboard, PROMPT_TYPES, type PromptType } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface PromptCardProps {
  prompt: {
    id: string;
    title: string;
    slug: string;
    promptText: string;
    type: PromptType;
    thumbnailUrl: string | null;
    imageUrl?: string | null; // Fallback if thumbnailUrl is not set
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
    viewCount?: number;
    isLiked?: boolean;
    createdAt: string;
  };
  onCopy?: (promptId: string) => void;
  onLike?: (promptId: string) => void;
  onClick?: (promptId: string) => void;
  priority?: boolean;
}

export function PromptCard({
  prompt,
  onCopy,
  onLike,
  onClick,
  priority = false,
}: PromptCardProps) {
  const [isLiked, setIsLiked] = React.useState(prompt.isLiked || false);
  const [, setLikeCount] = React.useState(prompt.likeCount);
  const [copyCount, setCopyCount] = React.useState(prompt.copyCount);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isCopying, setIsCopying] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  // Reset image states when prompt changes
  React.useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [prompt.id, prompt.thumbnailUrl, prompt.imageUrl]);

  const typeConfig = PROMPT_TYPES[prompt.type];

  // Use thumbnailUrl with fallback to imageUrl
  const displayImageUrl = prompt.thumbnailUrl || prompt.imageUrl || null;

  // Handle tags that might be a string (JSON) or array
  const tags: string[] = React.useMemo(() => {
    if (Array.isArray(prompt.tags)) return prompt.tags;
    if (typeof prompt.tags === 'string') {
      try {
        const parsed = JSON.parse(prompt.tags || '[]');
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  }, [prompt.tags]);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsCopying(true);
    const success = await copyToClipboard(prompt.promptText);

    if (success) {
      setCopyCount((prev) => prev + 1);
      toast.success("Prompt copied to clipboard!", {
        description: "Paste it in your favorite AI tool",
        duration: 2000,
      });
      onCopy?.(prompt.id);
    } else {
      toast.error("Failed to copy", {
        description: "Please try again",
      });
    }

    setTimeout(() => setIsCopying(false), 500);
  };

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLiked(!isLiked);
    setLikeCount((prev) => (isLiked ? prev - 1 : prev + 1));
    onLike?.(prompt.id);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const url = `${window.location.origin}/prompts/${prompt.slug}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: prompt.title,
          text: prompt.promptText.slice(0, 100) + "...",
          url,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      await copyToClipboard(url);
      toast.success("Link copied to clipboard!");
    }
  };

  return (
    <TooltipProvider>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ y: -4 }}
        className="group relative"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Link
          href={`/prompts/${prompt.slug}`}
          onClick={(e) => {
            if (onClick) {
              e.preventDefault();
              onClick(prompt.id);
            }
          }}
          className="block"
        >
          <div
            className={cn(
              "relative overflow-hidden rounded-2xl border border-neutral-200/60 bg-white",
              "shadow-sm transition-all duration-300",
              "hover:shadow-xl hover:shadow-neutral-200/40 hover:border-neutral-300/60",
              "dark:border-neutral-800/60 dark:bg-neutral-900",
              "dark:hover:shadow-neutral-900/40 dark:hover:border-neutral-700/60"
            )}
          >
            {/* Image Container */}
            <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100 dark:bg-neutral-800">
              {displayImageUrl && !imageError ? (
                <>
                  {/* Loading placeholder */}
                  {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900 animate-pulse">
                      <div className="text-4xl opacity-30">
                        {typeConfig.icon === "Image" && "🖼️"}
                        {typeConfig.icon === "Video" && "🎬"}
                        {typeConfig.icon === "RefreshCw" && "🔄"}
                        {typeConfig.icon === "Play" && "▶️"}
                      </div>
                    </div>
                  )}
                  {/* Use regular img for external images to avoid CORS/optimization issues */}
                  {displayImageUrl.includes("pbs.twimg.com") ||
                   displayImageUrl.includes("i.redd.it") ||
                   displayImageUrl.includes("preview.redd.it") ||
                   displayImageUrl.includes("imgur.com") ? (
                    <img
                      src={displayImageUrl}
                      alt={prompt.title}
                      className={cn(
                        "absolute inset-0 w-full h-full object-contain transition-all duration-500",
                        isHovered && "scale-105",
                        !imageLoaded && "opacity-0"
                      )}
                      onLoad={() => setImageLoaded(true)}
                      onError={() => {
                        console.error("Failed to load image:", displayImageUrl);
                        setImageError(true);
                      }}
                      loading={priority ? "eager" : "lazy"}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <Image
                      src={displayImageUrl}
                      alt={prompt.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className={cn(
                        "object-contain transition-all duration-500",
                        isHovered && "scale-105",
                        !imageLoaded && "opacity-0"
                      )}
                      priority={priority}
                      onLoad={() => setImageLoaded(true)}
                      onError={() => {
                        console.error("Failed to load image:", displayImageUrl);
                        setImageError(true);
                      }}
                    />
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 dark:from-neutral-800 dark:to-neutral-900">
                  <div className="text-4xl opacity-30">
                    {typeConfig.icon === "Image" && "🖼️"}
                    {typeConfig.icon === "Video" && "🎬"}
                    {typeConfig.icon === "RefreshCw" && "🔄"}
                    {typeConfig.icon === "Play" && "▶️"}
                  </div>
                </div>
              )}

              {/* Overlay gradient */}
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent",
                  "opacity-0 transition-opacity duration-300",
                  isHovered && "opacity-100"
                )}
              />

              {/* Type Badge */}
              <div className="absolute left-3 top-3">
                <Badge
                  variant={prompt.type as PromptType}
                  className="backdrop-blur-md bg-white/90 dark:bg-neutral-900/90 shadow-sm"
                >
                  {typeConfig.label}
                </Badge>
              </div>

              {/* Action buttons overlay */}
              <div
                className={cn(
                  "absolute right-3 top-3 flex items-center gap-1.5",
                  "opacity-0 transition-all duration-300",
                  isHovered && "opacity-100"
                )}
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon-sm"
                      className="bg-white/90 backdrop-blur-md hover:bg-white shadow-sm"
                      onClick={handleCopy}
                    >
                      <Copy
                        className={cn(
                          "h-4 w-4 transition-transform",
                          isCopying && "scale-110"
                        )}
                      />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy prompt</TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="secondary"
                      size="icon-sm"
                      className="bg-white/90 backdrop-blur-md hover:bg-white shadow-sm"
                      onClick={(e) => e.preventDefault()}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={handleCopy}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy prompt
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleShare}>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link href={`/prompts/${prompt.slug}`}>
                        <ExternalLink className="mr-2 h-4 w-4" />
                        View details
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Bottom stats overlay */}
              <div
                className={cn(
                  "absolute bottom-3 left-3 right-3 flex items-center justify-between",
                  "opacity-0 transition-all duration-300",
                  isHovered && "opacity-100"
                )}
              >
                <div className="flex items-center gap-3 text-white text-sm">
                  <span className="flex items-center gap-1">
                    <Copy className="h-3.5 w-3.5" />
                    {formatNumber(copyCount)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {formatNumber(prompt.viewCount || 0)}
                  </span>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
              {/* Title */}
              <h3 className="font-semibold text-neutral-900 dark:text-neutral-50 line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {prompt.title}
              </h3>

              {/* Author and like */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  {prompt.author ? (
                    <>
                      <UserAvatar
                        user={{
                          name: prompt.author.name,
                          image: prompt.author.image,
                        }}
                        size="sm"
                      />
                      <span className="text-sm text-neutral-600 dark:text-neutral-400 truncate">
                        {prompt.author.name || prompt.author.username || "Anonymous"}
                      </span>
                    </>
                  ) : (
                    <span className="text-sm text-neutral-500 dark:text-neutral-500">
                      Anonymous
                    </span>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon-sm"
                  className={cn(
                    "shrink-0 transition-all",
                    isLiked && "text-red-500 hover:text-red-600"
                  )}
                  onClick={handleLike}
                >
                  <Heart
                    className={cn("h-4 w-4", isLiked && "fill-current")}
                  />
                  <span className="sr-only">
                    {isLiked ? "Unlike" : "Like"}
                  </span>
                </Button>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.slice(0, 3).map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      size="sm"
                      className="cursor-pointer hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {tags.length > 3 && (
                    <Badge variant="outline" size="sm">
                      +{tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </Link>
      </motion.article>
    </TooltipProvider>
  );
}

// Skeleton component for loading state
export function PromptCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-neutral-200/60 bg-white dark:border-neutral-800/60 dark:bg-neutral-900">
      {/* Image skeleton */}
      <div className="relative aspect-[4/3] overflow-hidden bg-neutral-100 dark:bg-neutral-800 animate-pulse" />

      {/* Content skeleton */}
      <div className="p-4 space-y-3">
        {/* Title skeleton */}
        <div className="h-5 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />

        {/* Author skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-neutral-200 dark:bg-neutral-700 animate-pulse" />
            <div className="h-4 w-24 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
          </div>
          <div className="w-8 h-8 bg-neutral-200 dark:bg-neutral-700 rounded animate-pulse" />
        </div>

        {/* Tags skeleton */}
        <div className="flex gap-1.5">
          <div className="h-5 w-16 bg-neutral-200 dark:bg-neutral-700 rounded-full animate-pulse" />
          <div className="h-5 w-14 bg-neutral-200 dark:bg-neutral-700 rounded-full animate-pulse" />
          <div className="h-5 w-18 bg-neutral-200 dark:bg-neutral-700 rounded-full animate-pulse" />
        </div>
      </div>
    </div>
  );
}
