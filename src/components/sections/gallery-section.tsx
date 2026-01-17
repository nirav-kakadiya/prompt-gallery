"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, LayoutGrid, List, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromptCard, PromptCardSkeleton } from "@/components/cards/prompt-card";
import { FiltersSidebar } from "@/components/layout/filters-sidebar";
import { useInfinitePrompts } from "@/hooks/use-prompts";
import { useFilterStore, useUIStore } from "@/store";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function GallerySection() {
  const {
    data,
    isLoading,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfinitePrompts();
  const { query, types, tags, clearFilters } = useFilterStore();
  const { isSidebarOpen, toggleSidebar } = useUIStore();
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("grid");

  const hasActiveFilters = query || types.length > 0 || tags.length > 0;

  // Flatten all pages into a single array of prompts
  const prompts = data?.pages.flatMap((page) => page.data) || [];

  return (
    <section className="py-8 lg:py-12" id="gallery">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
                  : `${prompts.length} prompts found`}
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
              <div className="text-center py-12">
                <p className="text-destructive mb-4">Failed to load prompts</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Try again
                </Button>
              </div>
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
              <div className="text-center py-20">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-6">
                  <Filter className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No prompts found</h3>
                <p className="text-muted-foreground mb-6">
                  Try adjusting your search or filters to find what you&apos;re looking for.
                </p>
                <Button onClick={clearFilters}>Clear filters</Button>
              </div>
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
                      transition={{ duration: 0.3, delay: index * 0.05 }}
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
    </section>
  );
}
