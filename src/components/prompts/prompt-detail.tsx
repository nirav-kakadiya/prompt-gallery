"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Heart,
  Eye,
  Share2,
  Flag,
  Calendar,
  Tag,
  CheckCircle,
  X,
  Loader2,
  AlertTriangle,
} from "lucide-react";
import { cn, formatNumber, copyToClipboard, PROMPT_TYPES, type PromptType } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/ui/avatar";
import { toast } from "sonner";

interface PromptDetailProps {
  prompt: {
    id: string;
    title: string;
    slug: string;
    promptText: string;
    type: PromptType;
    thumbnailUrl: string | null;
    imageUrl: string | null;
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
    createdAt: string;
    metadata?: {
      model?: string;
      negativePrompt?: string;
      parameters?: Record<string, unknown>;
    };
  };
  isLiked?: boolean;
  onCopy?: () => void;
  onLike?: () => void;
}

const REPORT_REASONS = [
  { value: "spam", label: "Spam or misleading" },
  { value: "inappropriate", label: "Inappropriate content" },
  { value: "copyright", label: "Copyright violation" },
  { value: "other", label: "Other" },
];

export function PromptDetail({ prompt, isLiked = false, onCopy, onLike }: PromptDetailProps) {
  const [copyCount, setCopyCount] = React.useState(prompt.copyCount);
  const [isCopied, setIsCopied] = React.useState(false);
  const [showReportModal, setShowReportModal] = React.useState(false);
  const [reportReason, setReportReason] = React.useState("");
  const [reportDetails, setReportDetails] = React.useState("");
  const [isReporting, setIsReporting] = React.useState(false);
  const [imageError, setImageError] = React.useState(false);
  const [imageLoaded, setImageLoaded] = React.useState(false);

  const typeConfig = PROMPT_TYPES[prompt.type];
  const imageUrl = prompt.imageUrl || prompt.thumbnailUrl;
  const isExternalImage = imageUrl?.includes("pbs.twimg.com") || imageUrl?.includes("i.redd.it") || imageUrl?.includes("preview.redd.it") || imageUrl?.includes("imgur.com");

  const handleCopy = async () => {
    const success = await copyToClipboard(prompt.promptText);
    if (success) {
      setIsCopied(true);
      setCopyCount((prev) => prev + 1);
      toast.success("Prompt copied to clipboard!", {
        description: "Paste it in your favorite AI tool",
      });
      onCopy?.();
      setTimeout(() => setIsCopied(false), 2000);
    } else {
      toast.error("Failed to copy");
    }
  };

  const handleLike = () => {
    onLike?.();
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: prompt.title,
          text: prompt.promptText.slice(0, 100) + "...",
          url,
        });
      } catch {
        // User cancelled
      }
    } else {
      await copyToClipboard(url);
      toast.success("Link copied to clipboard!");
    }
  };

  const handleReport = async () => {
    if (!reportReason) {
      toast.error("Please select a reason for your report");
      return;
    }

    setIsReporting(true);
    try {
      const response = await fetch(`/api/prompts/${prompt.id}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reportReason, details: reportDetails }),
      });

      const result = await response.json();

      if (result.success) {
        toast.success("Report submitted", {
          description: "Thank you for helping keep our community safe",
        });
        setShowReportModal(false);
        setReportReason("");
        setReportDetails("");
      } else {
        toast.error(result.error?.message || "Failed to submit report");
      }
    } catch {
      toast.error("Failed to submit report");
    } finally {
      setIsReporting(false);
    }
  };

  const formattedDate = new Date(prompt.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
      {/* Image Section - The Height Master */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="space-y-4"
      >
        <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted">
          {imageUrl && !imageError ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-muted to-muted/50 animate-pulse">
                  <div className="text-6xl opacity-30">
                    {typeConfig.icon === "Image" && "🖼️"}
                    {typeConfig.icon === "Video" && "🎬"}
                    {typeConfig.icon === "RefreshCw" && "🔄"}
                    {typeConfig.icon === "Play" && "▶️"}
                  </div>
                </div>
              )}
              {isExternalImage ? (
                <img
                  src={imageUrl}
                  alt={prompt.title}
                  className={cn(
                    "absolute inset-0 w-full h-full object-contain transition-opacity duration-300",
                    !imageLoaded && "opacity-0"
                  )}
                  onLoad={() => setImageLoaded(true)}
                  onError={() => {
                    console.error("Failed to load image:", imageUrl);
                    setImageError(true);
                  }}
                  loading="eager"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Image
                  src={imageUrl}
                  alt={prompt.title}
                  fill
                  className={cn(
                    "object-contain transition-opacity duration-300",
                    !imageLoaded && "opacity-0"
                  )}
                  priority
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  onLoad={() => setImageLoaded(true)}
                  onError={() => {
                    console.error("Failed to load image:", imageUrl);
                    setImageError(true);
                  }}
                />
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-muted to-muted/50">
              <div className="text-6xl opacity-30">
                {typeConfig.icon === "Image" && "🖼️"}
                {typeConfig.icon === "Video" && "🎬"}
                {typeConfig.icon === "RefreshCw" && "🔄"}
                {typeConfig.icon === "Play" && "▶️"}
              </div>
            </div>
          )}
          <Badge
            variant={prompt.type}
            className="absolute top-4 left-4 backdrop-blur-md"
          >
            {typeConfig.label}
          </Badge>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/50">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Eye className="h-4 w-4" />
              <span className="text-sm font-medium">{formatNumber(prompt.viewCount)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Copy className="h-4 w-4" />
              <span className="text-sm font-medium">{formatNumber(copyCount)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Heart className={cn("h-4 w-4", isLiked && "fill-destructive text-destructive")} />
              <span className="text-sm font-medium">{formatNumber(prompt.likeCount)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm">
            <Calendar className="h-4 w-4" />
            {formattedDate}
          </div>
        </div>
      </motion.div>

      {/* Content Section - Matches height of image section on desktop */}
      <div className="relative min-h-[500px]">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-4 lg:absolute lg:inset-0 lg:flex lg:flex-col lg:overflow-hidden"
        >
          {/* Header Area (Optimized for Mobile/Desktop) */}
          <div className="space-y-4 shrink-0">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl font-bold leading-tight">{prompt.title}</h1>
                
                {/* Mobile Author Info - Extremely Compact Line */}
                {prompt.author && (
                  <Link
                    href={`/profile/${prompt.author.username || prompt.author.id}`}
                    className="sm:hidden flex items-center gap-2 mt-2 hover:opacity-80 transition-opacity"
                  >
                    <UserAvatar
                      user={{
                        name: prompt.author.name,
                        image: prompt.author.image,
                      }}
                      className="h-6 w-6"
                    />
                    <span className="text-sm font-medium">
                      {prompt.author.name || prompt.author.username || "Anonymous"}
                    </span>
                    {prompt.author.username && (
                      <span className="text-xs text-muted-foreground">
                        @{prompt.author.username}
                      </span>
                    )}
                  </Link>
                )}
              </div>
              
              {/* Desktop Author View - Side Aligned */}
              {prompt.author && (
                <Link
                  href={`/profile/${prompt.author.username || prompt.author.id}`}
                  className="hidden sm:flex items-center gap-3 hover:opacity-80 transition-opacity shrink-0"
                >
                  <div className="text-right">
                    <p className="text-sm font-semibold leading-none">
                      {prompt.author.name || prompt.author.username || "Anonymous"}
                    </p>
                    {prompt.author.username && (
                      <p className="text-xs text-muted-foreground mt-1">
                        @{prompt.author.username}
                      </p>
                    )}
                  </div>
                  <UserAvatar
                    user={{
                      name: prompt.author.name,
                      image: prompt.author.image,
                    }}
                    className="h-11 w-11"
                  />
                </Link>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button onClick={handleCopy} className="flex-[2] h-10">
                {isCopied ? (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Prompt
                  </>
                )}
              </Button>
              <Button
                variant={isLiked ? "default" : "outline"}
                onClick={handleLike}
                className={cn("flex-1 h-10 px-3", isLiked && "bg-destructive text-destructive-foreground hover:bg-destructive/90")}
              >
                <Heart className={cn("h-4 w-4 sm:mr-2", isLiked && "fill-current")} />
                <span className="hidden sm:inline">{isLiked ? "Liked" : "Like"}</span>
              </Button>
              <Button variant="outline" className="flex-1 h-10 px-3" onClick={handleShare}>
                <Share2 className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">Share</span>
              </Button>
            </div>
          </div>

          {/* Flexible Prompt Section */}
          <div className="space-y-3 flex-1 min-h-0 flex flex-col">
            <h2 className="text-lg font-semibold shrink-0">Prompt</h2>
            <div className="relative flex-1 min-h-0">
              <div className="p-4 rounded-xl bg-muted/50 border h-full overflow-y-auto custom-scrollbar">
                <p className="text-sm sm:text-base whitespace-pre-wrap leading-relaxed break-all wrap-anywhere">
                  {prompt.promptText}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-2 right-2 bg-muted/50 hover:bg-muted backdrop-blur-sm"
                onClick={handleCopy}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Tags & Details Area (Fixed) */}
          <div className="space-y-6 shrink-0 pt-2 lg:overflow-y-auto lg:max-h-[30%] custom-scrollbar">
            {/* Tags */}
            {prompt.tags.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Tags
                </h2>
                <div className="flex flex-wrap gap-2">
                  {prompt.tags.map((tag) => (
                    <Link key={tag} href={`/gallery?tag=${tag}`}>
                      <Badge
                        variant="secondary"
                        className="cursor-pointer hover:bg-secondary/80 transition-colors"
                      >
                        {tag}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Metadata */}
            {prompt.metadata && (prompt.metadata.model || prompt.metadata.negativePrompt) && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Details</h2>
                <div className="p-4 rounded-xl bg-muted/50 border space-y-3">
                  {prompt.metadata.model && (
                    <div>
                      <span className="text-sm text-muted-foreground">Model: </span>
                      <span className="text-sm font-medium">{prompt.metadata.model}</span>
                    </div>
                  )}
                  {prompt.category && (
                    <div>
                      <span className="text-sm text-muted-foreground">Category: </span>
                      <span className="text-sm font-medium capitalize">{prompt.category}</span>
                    </div>
                  )}
                  {prompt.style && (
                    <div>
                      <span className="text-sm text-muted-foreground">Style: </span>
                      <span className="text-sm font-medium capitalize">{prompt.style}</span>
                    </div>
                  )}
                  {prompt.metadata.negativePrompt && (
                    <div>
                      <span className="text-sm text-muted-foreground block mb-1">
                        Negative Prompt:
                      </span>
                      <span className="text-sm">{prompt.metadata.negativePrompt}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer Area (Fixed) */}
          <div className="pt-4 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={() => setShowReportModal(true)}
            >
              <Flag className="h-4 w-4 mr-2" />
              Report this prompt
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
              onClick={() => setShowReportModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-background rounded-2xl p-6 z-50 shadow-xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-destructive/10">
                    <AlertTriangle className="w-5 h-5 text-destructive" />
                  </div>
                  <h2 className="text-xl font-semibold">Report Prompt</h2>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-2 hover:bg-muted rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-3">
                    Why are you reporting this prompt?
                  </label>
                  <div className="space-y-2">
                    {REPORT_REASONS.map((reason) => (
                      <label
                        key={reason.value}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                          reportReason === reason.value
                            ? "border-primary bg-primary/10"
                            : "hover:bg-muted"
                        )}
                      >
                        <input
                          type="radio"
                          name="reportReason"
                          value={reason.value}
                          checked={reportReason === reason.value}
                          onChange={(e) => setReportReason(e.target.value)}
                          className="sr-only"
                        />
                        <div
                          className={cn(
                            "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                            reportReason === reason.value
                              ? "border-primary"
                              : "border-muted-foreground"
                          )}
                        >
                          {reportReason === reason.value && (
                            <div className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>
                        <span className="text-sm">{reason.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Additional details (optional)
                  </label>
                  <textarea
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Provide any additional context..."
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border bg-background resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowReportModal(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleReport}
                    disabled={isReporting || !reportReason}
                  >
                    {isReporting ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Flag className="w-4 h-4 mr-2" />
                    )}
                    Submit Report
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
