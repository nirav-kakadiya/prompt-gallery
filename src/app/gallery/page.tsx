"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { PageLayout, EmptyState } from "@/components/layout/page-layout";
import { Button } from "@/components/ui/button";
import { PromptCard, PromptCardSkeleton } from "@/components/cards/prompt-card";
import { FiltersSidebar } from "@/components/layout/filters-sidebar";
import { useInfinitePrompts } from "@/hooks/use-prompts";
import { useFilterStore, useUIStore } from "@/store";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

function GalleryContent() {
  const searchParams = useSearchParams();
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfinitePrompts();
  const { query, types, tags, clearFilters, setQuery, toggleTag } = useFilterStore();
  const { isSidebarOpen, toggleSidebar } = useUIStore();
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");

  // Handle URL parameters
  React.useEffect(() => {
    const urlQuery = searchParams.get("q");
    const urlTag = searchParams.get("tag");
    const urlCategory = searchParams.get("category");

    if (urlQuery) setQuery(urlQuery);
    if (urlTag) toggleTag(urlTag);
    if (urlCategory) setQuery(urlCategory);
  }, [searchParams, setQuery, toggleTag]);

  const hasActiveFilters = query || types.length > 0 || tags.length > 0;

  // Flatten all pages into a single array of prompts
  const prompts = data?.pages.flatMap((page) => page.data) || [];
  const totalCount = data?.pages[0]?.pagination?.total || 0;

  return (
    <PageLayout fullWidth>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        {/* Sidebar (mobile) */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={toggleSidebar}
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed inset-y-0 left-0 w-80 bg-background z-50 lg:hidden overflow-y-auto"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold">Filters</h3>
                    <Button variant="ghost" size="sm" onClick={toggleSidebar}>
                      Close
                    </Button>
                  </div>
                  <FiltersSidebar />
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <div className="flex gap-6 lg:gap-8">
          {/* Sidebar (desktop) */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-28">
              <FiltersSidebar />
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Content header - matches Filters sidebar header height */}
            <div className="flex items-center justify-between mb-5">
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? "Loading prompts..."
                  : `Showing ${prompts.length} of ${totalCount} prompts`}
              </p>

              <div className="flex items-center gap-2">
                {/* View mode toggle */}
                <div className="flex items-center gap-1 p-1 rounded-lg bg-secondary">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      viewMode === "grid"
                        ? "bg-background shadow-sm"
                        : "hover:bg-background/50"
                    )}
                    aria-label="Grid view"
                  >
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "p-1.5 rounded-md transition-colors",
                      viewMode === "list"
                        ? "bg-background shadow-sm"
                        : "hover:bg-background/50"
                    )}
                    aria-label="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Filter toggle (mobile) */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleSidebar}
                  className="lg:hidden"
                >
                  <SlidersHorizontal className="w-4 h-4 mr-2" />
                  Filters
                  {hasActiveFilters && (
                    <span className="ml-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                      {types.length + tags.length + (query ? 1 : 0)}
                    </span>
                  )}
                </Button>

                {/* Clear filters */}
                {hasActiveFilters && (
                  <Button variant="ghost" size="sm" onClick={clearFilters}>
                    Clear all
                  </Button>
                )}
              </div>
            </div>

            {/* Error state */}
            {error && (
              <EmptyState
                icon={<Filter className="w-8 h-8 text-muted-foreground" />}
                title="Failed to load prompts"
                description="Something went wrong. Please try again."
                action={
                  <Button onClick={() => window.location.reload()}>
                    Try again
                  </Button>
                }
              />
            )}

            {/* Loading state */}
            {isLoading && (
              <div
                className={cn(
                  "grid gap-6",
                  viewMode === "grid"
                    ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                    : "grid-cols-1"
                )}
              >
                {Array.from({ length: 9 }).map((_, i) => (
                  <PromptCardSkeleton key={i} />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && prompts.length === 0 && (
              <EmptyState
                icon={<Filter className="w-8 h-8 text-muted-foreground" />}
                title="No prompts found"
                description="Try adjusting your search or filters to find what you're looking for."
                action={
                  <Button onClick={clearFilters}>Clear filters</Button>
                }
              />
            )}

            {/* Prompts grid */}
            {!isLoading && !error && prompts.length > 0 && (
              <motion.div
                layout
                className={cn(
                  "grid gap-6",
                  viewMode === "grid"
                    ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"
                    : "grid-cols-1"
                )}
              >
                <AnimatePresence mode="popLayout">
                  {prompts.map((prompt, index) => (
                    <motion.div
                      key={prompt.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ duration: 0.3, delay: index * 0.03 }}
                    >
                      <PromptCard prompt={prompt} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Load more */}
            {!isLoading && !error && prompts.length > 0 && (
              <div className="mt-12 text-center">
                {hasNextPage ? (
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Loading...
                      </>
                    ) : (
                      "Load more prompts"
                    )}
                  </Button>
                ) : (
                  <p className="text-muted-foreground">
                    You&apos;ve reached the end of the gallery
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}

export default function GalleryPage() {
  return (
    <Suspense fallback={
      <PageLayout fullWidth>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-muted rounded w-48 mb-4" />
            <div className="h-4 bg-muted rounded w-64 mb-8" />
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 9 }).map((_, i) => (
                <PromptCardSkeleton key={i} />
              ))}
            </div>
          </div>
        </div>
      </PageLayout>
    }>
      <GalleryContent />
    </Suspense>
  );
}
