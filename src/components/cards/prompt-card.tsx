"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { Copy, Heart, Eye, MoreHorizontal, ExternalLink, Share2, Trash2, Pencil, FolderPlus } from "lucide-react";
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
import { useAuthStore } from "@/hooks/use-auth";
import { useDeletePrompt } from "@/hooks/use-prompts";
import { EditPromptModal } from "@/components/prompts/edit-prompt-modal";
import { AddToCollectionModal } from "@/components/collections/add-to-collection-modal";

interface PromptCardProps {
  prompt: {
    id: string;
    title: string;
    slug: string;
    promptText: string;
    type: PromptType;
    thumbnailUrl: string | null;
    imageUrl?: string | null;
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
  viewMode?: "grid" | "list" | "compact" | "masonry";
}

export function PromptCard({
  prompt,
  onCopy,
  onLike,
  onClick,
  priority = false,
  viewMode = "grid",
}: PromptCardProps) {
  const { user } = useAuthStore();
  const deletePromptMutation = useDeletePrompt();
  const [isLiked, setIsLiked] = React.useState(prompt.isLiked || false);
  const [, setLikeCount] = React.useState(prompt.likeCount);
  const [copyCount, setCopyCount] = React.useState(prompt.copyCount);
  const [isHovered, setIsHovered] = React.useState(false);
  const [isCopying, setIsCopying] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showAddToCollectionModal, setShowAddToCollectionModal] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  const isOwner = user?.id === prompt.author?.id;

  React.useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [prompt.id, prompt.thumbnailUrl, prompt.imageUrl]);

  const typeConfig = PROMPT_TYPES[prompt.type] || PROMPT_TYPES["text-to-image"];
  const displayImageUrl = prompt.thumbnailUrl || prompt.imageUrl || null;

  const tags: string[] = React.useMemo(() => {
    if (Array.isArray(prompt.tags)) {
      return prompt.tags.map((tag) => {
        if (typeof tag === 'string') return tag;
        if (typeof tag === 'object' && tag !== null) {
          return (tag as { name?: string; id?: string; slug?: string }).name ||
                 (tag as { id?: string }).id ||
                 String(tag);
        }
        return String(tag);
      });
    }
    if (typeof prompt.tags === 'string') {
      try {
        const parsed = JSON.parse(prompt.tags || '[]');
        if (Array.isArray(parsed)) {
          return parsed.map((tag) => {
            if (typeof tag === 'string') return tag;
            if (typeof tag === 'object' && tag !== null) {
              return (tag as { name?: string; id?: string }).name ||
                     (tag as { id?: string }).id ||
                     String(tag);
            }
            return String(tag);
          });
        }
        return [];
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
      toast.error("Failed to copy", { description: "Please try again" });
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
      } catch {}
    } else {
      await copyToClipboard(url);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const confirmed = window.confirm(
      `Are you sure you want to delete "${prompt.title}"? This action cannot be undone.`
    );
    if (!confirmed) return;
    setIsDeleting(true);
    try {
      await deletePromptMutation.mutateAsync(prompt.id);
      toast.success("Prompt deleted successfully", {
        description: `"${prompt.title}" has been removed`,
        duration: 3000,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to delete prompt";
      if (errorMessage.includes("UNAUTHORIZED")) {
        toast.error("Authentication required", { description: "Please log in to delete prompts" });
      } else if (errorMessage.includes("FORBIDDEN")) {
        toast.error("Permission denied", { description: "You can only delete your own prompts" });
      } else if (errorMessage.includes("NOT_FOUND")) {
        toast.error("Prompt not found", { description: "This prompt may have already been deleted" });
      } else {
        toast.error("Failed to delete prompt", { description: errorMessage.replace(/^[^:]+:\s*/, "") });
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const isList = viewMode === "list";
  const isCompact = viewMode === "compact";
  const isMasonry = viewMode === "masonry";

  return (
    <TooltipProvider>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={{ y: -4 }}
        className={cn("group relative", isList && "w-full")}
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
              "relative overflow-hidden rounded-2xl border bg-card",
              "shadow-sm transition-all duration-300",
              "hover:shadow-lg hover:border-border/80",
              isList && "flex flex-row items-stretch"
            )}
          >
            {/* Image Container */}
            <div className={cn(
              "relative overflow-hidden bg-muted",
              isList ? "w-48 sm:w-64 shrink-0" : isMasonry ? "h-auto min-h-[150px]" : "aspect-4/3"
            )}>
              {displayImageUrl && !imageError ? (
                <>
                  {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-muted animate-pulse">
                      <div className="text-4xl opacity-30">
                        {typeConfig?.icon === "Image" && "🖼️"}
                        {typeConfig?.icon === "Video" && "🎬"}
                        {typeConfig?.icon === "RefreshCw" && "🔄"}
                        {typeConfig?.icon === "Play" && "▶️"}
                      </div>
                    </div>
                  )}
                  {displayImageUrl.includes("pbs.twimg.com") ||
                   displayImageUrl.includes("i.redd.it") ||
                   displayImageUrl.includes("preview.redd.it") ||
                   displayImageUrl.includes("imgur.com") ? (
                    <img
                      src={displayImageUrl}
                      alt={prompt.title}
                      className={cn(
                        isMasonry ? "w-full h-auto" : "absolute inset-0 w-full h-full object-cover",
                        "transition-all duration-500",
                        isHovered && "scale-105",
                        !imageLoaded && "opacity-0"
                      )}
                      onLoad={() => setImageLoaded(true)}
                      onError={() => setImageError(true)}
                      loading={priority ? "eager" : "lazy"}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className={cn(isMasonry ? "relative" : "absolute inset-0")}>
                      <Image
                        src={displayImageUrl}
                        alt={prompt.title}
                        {...(isMasonry ? { width: 500, height: 500, style: { width: '100%', height: 'auto' } } : { fill: true })}
                        sizes={isList ? "256px" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
                        className={cn(
                          "object-cover transition-all duration-500",
                          isHovered && "scale-105",
                          !imageLoaded && "opacity-0"
                        )}
                        priority={priority}
                        onLoad={() => setImageLoaded(true)}
                        onError={() => setImageError(true)}
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className={cn("flex items-center justify-center bg-muted", isMasonry ? "h-40" : "absolute inset-0")}>
                  <div className="text-4xl opacity-30">
                    {typeConfig?.icon === "Image" && "🖼️"}
                    {typeConfig?.icon === "Video" && "🎬"}
                    {typeConfig?.icon === "RefreshCw" && "🔄"}
                    {typeConfig?.icon === "Play" && "▶️"}
                  </div>
                </div>
              )}

              {/* Overlay gradient */}
              <div
                className={cn(
                  "absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent",
                  "opacity-0 transition-opacity duration-300",
                  isHovered && "opacity-100"
                )}
              />

              {/* Type Badge */}
              <div className="absolute left-3 top-3">
                <Badge
                  variant={prompt.type as PromptType}
                  className="backdrop-blur-md bg-background/90 shadow-sm"
                  size={isCompact ? "sm" : "default"}
                >
                  {typeConfig?.label || "Prompt"}
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
                      className="bg-background/90 backdrop-blur-md hover:bg-background shadow-sm"
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
                      className="bg-background/90 backdrop-blur-md hover:bg-background shadow-sm"
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
                    {user && (
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowAddToCollectionModal(true);
                        }}
                      >
                        <FolderPlus className="mr-2 h-4 w-4" />
                        Save to collection
                      </DropdownMenuItem>
                    )}
                    {isOwner && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setShowEditModal(true);
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          Edit prompt
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {isDeleting ? "Deleting..." : "Delete prompt"}
                        </DropdownMenuItem>
                      </>
                    )}
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
            <div className={cn(
              "flex flex-col flex-1",
              isCompact ? "p-2.5 pb-2 gap-2" : "p-4 space-y-3"
            )}>
              <div className={cn("flex flex-col", isCompact ? "gap-1.5" : "gap-2")}>
                {/* Title */}
                <h3 className={cn(
                  "font-bold transition-colors group-hover:text-primary leading-[1.2]",
                  isCompact ? "text-[13px] line-clamp-2 min-h-[2.1rem]" : "text-base line-clamp-1"
                )}>
                  {prompt.title}
                </h3>

                {/* Author */}
                <div className="flex items-center gap-1.5 min-w-0">
                  {prompt.author ? (
                    <>
                      <UserAvatar
                        user={{
                          name: prompt.author.name,
                          image: prompt.author.image,
                        }}
                        size={isCompact ? "xs" : "sm"}
                        className="shrink-0"
                      />
                      <span className={cn(
                        "text-muted-foreground truncate font-medium",
                        isCompact ? "text-[10px]" : "text-sm"
                      )}>
                        {prompt.author.name || prompt.author.username || "Anonymous"}
                      </span>
                    </>
                  ) : (
                    <span className={cn(
                      "text-muted-foreground font-medium",
                      isCompact ? "text-[10px]" : "text-sm"
                    )}>
                      Anonymous
                    </span>
                  )}
                </div>
              </div>

              {/* Tags */}
              {tags.length > 0 && !isCompact && (
                <div className="flex flex-wrap gap-1.5">
                  {tags.slice(0, isList ? 6 : 2).map((tag, index) => (
                    <Badge
                      key={`${tag}-${index}`}
                      variant="secondary"
                      size="sm"
                      className="cursor-pointer hover:bg-accent transition-colors"
                    >
                      {tag}
                    </Badge>
                  ))}
                  {tags.length > (isList ? 6 : 2) && (
                    <Badge variant="outline" size="sm">
                      +{tags.length - (isList ? 6 : 2)}
                    </Badge>
                  )}
                </div>
              )}
              
              <div className="mt-auto">
                {!isCompact && (
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground/60">
                      <span className="flex items-center gap-1">
                        <Heart className={cn("h-3.5 w-3.5", isLiked && "fill-current text-destructive")} />
                        {formatNumber(prompt.likeCount)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Copy className="h-3.5 w-3.5" />
                        {formatNumber(copyCount)}
                      </span>
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
                      <Heart className={cn("h-4 w-4", isLiked && "fill-current")} />
                      <span className="sr-only">{isLiked ? "Unlike" : "Like"}</span>
                    </Button>
                  </div>
                )}

                {isCompact && (
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground/50 font-bold border-t border-border/40 pt-2 mt-1">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-0.5">
                        <Heart className={cn("h-2.5 w-2.5", isLiked && "fill-current text-destructive")} />
                        {formatNumber(prompt.likeCount)}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Eye className="h-2.5 w-2.5" />
                        {formatNumber(prompt.viewCount || 0)}
                      </span>
                    </div>
                    <span className="flex items-center gap-0.5">
                      <Copy className="h-2.5 w-2.5" />
                      {formatNumber(copyCount)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Link>
      </motion.article>

      {/* Edit Modal */}
      {isOwner && (
        <EditPromptModal
          open={showEditModal}
          onOpenChange={setShowEditModal}
          prompt={{
            id: prompt.id,
            title: prompt.title,
            promptText: prompt.promptText,
            type: prompt.type,
            tags,
          }}
        />
      )}

      {/* Add to Collection Modal */}
      {user && (
        <AddToCollectionModal
          open={showAddToCollectionModal}
          onOpenChange={setShowAddToCollectionModal}
          promptId={prompt.id}
          promptTitle={prompt.title}
        />
      )}
    </TooltipProvider>
  );
}

// Skeleton component for loading state
export function PromptCardSkeleton({ viewMode = "grid" }: { viewMode?: "grid" | "list" | "compact" | "masonry" }) {
  const isList = viewMode === "list";
  const isCompact = viewMode === "compact";

  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border bg-card",
      isList && "flex flex-row items-stretch h-32"
    )}>
      {/* Image skeleton */}
      <div className={cn(
        "relative overflow-hidden bg-muted animate-pulse",
        isList ? "w-48 sm:w-64 shrink-0" : "aspect-4/3"
      )} />

      {/* Content skeleton */}
      <div className={cn(
        "flex-1",
        isCompact ? "p-2.5 space-y-2" : "p-4 space-y-3"
      )}>
        {/* Title skeleton */}
        <div className="space-y-1">
          <div className={cn("bg-muted rounded animate-pulse", isCompact ? "h-3.5 w-full" : "h-5 w-3/4")} />
          {isCompact && <div className="bg-muted rounded animate-pulse h-3.5 w-2/3" />}
        </div>

        {/* Author skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("rounded-full bg-muted animate-pulse", isCompact ? "w-4 h-4" : "w-6 h-6")} />
            <div className={cn("bg-muted rounded animate-pulse", isCompact ? "h-3 w-12" : "h-4 w-24")} />
          </div>
          {!isCompact && <div className="w-8 h-8 bg-muted rounded animate-pulse" />}
        </div>

        {/* Tags/Footer skeleton */}
        {isCompact ? (
          <div className="flex items-center justify-between pt-2 border-t border-border/40">
            <div className="flex gap-2">
              <div className="h-2 w-6 bg-muted rounded animate-pulse" />
              <div className="h-2 w-6 bg-muted rounded animate-pulse" />
            </div>
            <div className="h-2 w-6 bg-muted rounded animate-pulse" />
          </div>
        ) : (
          <div className="flex gap-1.5">
            <div className="h-5 w-16 bg-muted rounded-full animate-pulse" />
            <div className="h-5 w-14 bg-muted rounded-full animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}
