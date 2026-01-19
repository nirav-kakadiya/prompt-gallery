"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { TrendingUp, Flame, Clock, Calendar } from "lucide-react";
import { PageLayout, PageHeader, EmptyState } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PromptCard, PromptCardSkeleton } from "@/components/cards/prompt-card";
import { cn } from "@/lib/utils";
import type { PromptType } from "@/lib/utils";

interface TrendingPrompt {
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
  createdAt: string;
}

interface TrendingData {
  prompts: TrendingPrompt[];
  trendingTags: Array<{ tag: string; count: number }>;
  period: string;
}

const periods = [
  { value: "today", label: "Today", icon: Clock },
  { value: "week", label: "This Week", icon: Calendar },
  { value: "month", label: "This Month", icon: Calendar },
  { value: "all", label: "All Time", icon: TrendingUp },
];

const sortOptions = [
  { value: "views", label: "Most Viewed" },
  { value: "copies", label: "Most Copied" },
  { value: "likes", label: "Most Liked" },
];

async function fetchTrending(period: string, sortBy: string): Promise<TrendingData> {
  const response = await fetch(`/api/prompts/trending?period=${period}&sortBy=${sortBy}`);
  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error?.message || "Failed to fetch trending prompts");
  }
  return data.data;
}

export default function TrendingPage() {
  const [period, setPeriod] = React.useState("week");
  const [sortBy, setSortBy] = React.useState("views");

  const { data, isLoading, error } = useQuery({
    queryKey: ["trending", period, sortBy],
    queryFn: () => fetchTrending(period, sortBy),
  });

  return (
    <PageLayout fullWidth>
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        <PageHeader
          title="Trending Prompts"
          description="Discover the most popular prompts right now"
        />

        {/* Period and Sort Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          {/* Period selector */}
          <div className="flex items-center gap-2 p-1 rounded-lg bg-muted">
            {periods.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
                  period === p.value
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <p.icon className="w-4 h-4" />
                {p.label}
              </button>
            ))}
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            {sortOptions.map((option) => (
              <Button
                key={option.value}
                variant={sortBy === option.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSortBy(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Trending Tags */}
        {data?.trendingTags && data.trendingTags.length > 0 && (
          <div className="mb-8">
            <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              Trending Tags
            </h3>
            <div className="flex flex-wrap gap-2">
              {data.trendingTags.map(({ tag, count }) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="cursor-pointer hover:bg-secondary/80"
                >
                  {tag}
                  <span className="ml-1 text-xs text-muted-foreground">({count})</span>
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-16">
            {Array.from({ length: 10 }).map((_, i) => (
              <PromptCardSkeleton key={i} />
            ))}
          </div>
        )}

        {/* Error state */}
        {error && (
          <EmptyState
            icon={<TrendingUp className="w-8 h-8 text-muted-foreground" />}
            title="Failed to load trending prompts"
            description="Something went wrong. Please try again."
            action={
              <Button onClick={() => window.location.reload()}>
                Try again
              </Button>
            }
          />
        )}

        {/* Empty state */}
        {!isLoading && !error && data?.prompts.length === 0 && (
          <EmptyState
            icon={<TrendingUp className="w-8 h-8 text-muted-foreground" />}
            title="No trending prompts yet"
            description="Check back later for trending content."
          />
        )}

        {/* Prompts grid */}
        {!isLoading && !error && data?.prompts && data.prompts.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-16">
            {data.prompts.map((prompt, index) => (
              <motion.div
                key={prompt.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
              >
                <PromptCard prompt={prompt} />
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageLayout>
  );
}
