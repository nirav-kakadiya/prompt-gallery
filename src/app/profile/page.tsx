"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Edit, Settings, LayoutGrid, List, Columns2, Grid3X3, Globe, Lock } from "lucide-react";
import { PageLayout, EmptyState } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/ui/avatar";
import { PromptCard, PromptCardSkeleton } from "@/components/cards/prompt-card";
import { useAuthStore } from "@/hooks/use-auth";
import { usePreferencesStore } from "@/store";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MasonryGrid } from "@/components/ui/masonry-grid";
import Link from "next/link";

async function fetchUserPrompts(userId: string) {
  const response = await fetch(`/api/prompts?authorId=${userId}&pageSize=500&sort=newest`);
  const data = await response.json();
  return data.success ? { prompts: data.data, total: data.meta.total } : { prompts: [], total: 0 };
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  React.useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  const { viewMode, setViewMode, gridColumns, setGridColumns } = usePreferencesStore();
  const [visibilityFilter, setVisibilityFilter] = React.useState<"all" | "private">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["user-prompts", user?.id],
    queryFn: () => fetchUserPrompts(user!.id),
    enabled: !!user?.id,
  });

  const allPrompts = data?.prompts || [];
  const totalCount = data?.total || 0;

  // Filter prompts based on visibility
  const prompts = React.useMemo(() => {
    if (visibilityFilter === "private") {
      return allPrompts.filter((p: { isPublic?: boolean }) => p.isPublic === false);
    }
    return allPrompts;
  }, [allPrompts, visibilityFilter]);

  const privateCount = React.useMemo(() => {
    return allPrompts.filter((p: { isPublic?: boolean }) => p.isPublic === false).length;
  }, [allPrompts]);

  const getGridClasses = () => {
    if (viewMode === "list") {
      return "grid grid-cols-1 gap-6";
    }
    if (viewMode === "compact") {
      return "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4";
    }
    // Grid mode with dynamic columns
    const colClasses: Record<number, string> = {
      2: "grid-cols-1 sm:grid-cols-2",
      3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
      5: "grid-cols-2 lg:grid-cols-4 xl:grid-cols-5",
      6: "grid-cols-3 lg:grid-cols-5 xl:grid-cols-6",
    };
    return `grid gap-6 ${colClasses[gridColumns] || colClasses[4]}`;
  };

  if (!isAuthenticated || !user) {
    return null;
  }

  return (
    <PageLayout>
      <div className="py-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start gap-6 mb-12"
        >
          <UserAvatar user={user} size="xl" />
          <div className="flex-1">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">{user.name || "Anonymous"}</h1>
                {user.username && (
                  <p className="text-muted-foreground">@{user.username}</p>
                )}
              </div>
              <Link href="/settings">
                <Button variant="outline">
                  <Settings className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="flex gap-6 mt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-sm text-muted-foreground">Prompts</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">0</p>
                <p className="text-sm text-muted-foreground">Following</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* User's Prompts */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-semibold">Your Prompts</h2>

              {/* Visibility Filter Tabs */}
              <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/50 border backdrop-blur-sm">
                <button
                  onClick={() => setVisibilityFilter("all")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                    visibilityFilter === "all"
                      ? "bg-background shadow-sm text-primary"
                      : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                  )}
                >
                  <Globe className="w-3.5 h-3.5" />
                  All
                  <span className="text-xs opacity-60">({totalCount})</span>
                </button>
                <button
                  onClick={() => setVisibilityFilter("private")}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                    visibilityFilter === "private"
                      ? "bg-amber-500/20 shadow-sm text-amber-600 dark:text-amber-400"
                      : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                  )}
                >
                  <Lock className="w-3.5 h-3.5" />
                  Private
                  <span className="text-xs opacity-60">({privateCount})</span>
                </button>
              </div>
            </div>

            {/* Layout Controls */}
            <TooltipProvider>
              <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/50 border backdrop-blur-sm">
                {[
                  { mode: "grid", icon: LayoutGrid, label: "Grid" },
                  { mode: "masonry", icon: Columns2, label: "Masonry" },
                  { mode: "compact", icon: Grid3X3, label: "Compact" },
                  { mode: "list", icon: List, label: "List" },
                ].map((item) => (
                  <Tooltip key={item.mode}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setViewMode(item.mode as "grid" | "masonry" | "compact" | "list")}
                        className={cn(
                          "p-2 rounded-lg transition-all duration-200",
                          viewMode === item.mode
                            ? "bg-background shadow-sm text-primary scale-110"
                            : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                        )}
                        aria-label={`${item.label} view`}
                      >
                        <item.icon className="w-4 h-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">{item.label} view</TooltipContent>
                  </Tooltip>
                ))}

                <AnimatePresence>
                  {viewMode === "grid" && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 border-l ml-1 h-6 overflow-hidden"
                    >
                      <span className="hidden min-[450px]:inline text-[10px] font-black uppercase tracking-tighter text-muted-foreground/40 whitespace-nowrap">
                        Size
                      </span>
                      <input
                        type="range"
                        min="2"
                        max="6"
                        step="1"
                        value={gridColumns}
                        onChange={(e) => setGridColumns(parseInt(e.target.value))}
                        className="w-12 min-[400px]:w-16 sm:w-20 h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary hover:accent-primary/80 transition-all"
                      />
                      <div className="flex items-center justify-center w-5 h-5 rounded bg-primary/10 text-[11px] font-bold text-primary shrink-0">
                        {gridColumns}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </TooltipProvider>
          </div>

          {isLoading && viewMode === "masonry" && (
            <MasonryGrid>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="mb-6">
                  <PromptCardSkeleton viewMode={viewMode} />
                </div>
              ))}
            </MasonryGrid>
          )}
          {isLoading && viewMode !== "masonry" && (
            <div className={getGridClasses()}>
              {Array.from({ length: 6 }).map((_, i) => (
                <PromptCardSkeleton key={i} viewMode={viewMode} />
              ))}
            </div>
          )}

          {!isLoading && prompts.length === 0 && (
            <EmptyState
              icon={<Edit className="w-8 h-8 text-muted-foreground" />}
              title="No prompts yet"
              description="Start sharing your creative prompts with the community"
              action={
                <Link href="/submit">
                  <Button>Submit Your First Prompt</Button>
                </Link>
              }
            />
          )}

          {!isLoading && prompts.length > 0 && viewMode === "masonry" && (
            <MasonryGrid>
              {(prompts as Array<Parameters<typeof PromptCard>[0]["prompt"]>).map((prompt, index) => (
                <motion.div
                  key={prompt.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.02, 0.5) }}
                  className="mb-6"
                >
                  <PromptCard prompt={prompt} viewMode={viewMode} />
                </motion.div>
              ))}
            </MasonryGrid>
          )}
          {!isLoading && prompts.length > 0 && viewMode !== "masonry" && (
            <div className={getGridClasses()}>
              {(prompts as Array<Parameters<typeof PromptCard>[0]["prompt"]>).map((prompt, index) => (
                <motion.div
                  key={prompt.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.02, 0.5) }}
                >
                  <PromptCard prompt={prompt} viewMode={viewMode} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
