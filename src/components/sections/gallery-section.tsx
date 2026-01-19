"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Filter, LayoutGrid, List, SlidersHorizontal, Columns2, Grid3X3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PromptCard, PromptCardSkeleton } from "@/components/cards/prompt-card";
import { FiltersSidebar } from "@/components/layout/filters-sidebar";
import { useInfinitePrompts } from "@/hooks/use-prompts";
import { useFilterStore, useUIStore, usePreferencesStore } from "@/store";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { Magnetic } from "@/components/landing/magnetic";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const { viewMode, setViewMode, gridColumns, setGridColumns } = usePreferencesStore();

  const hasActiveFilters = query || types.length > 0 || tags.length > 0;

  // Flatten all pages into a single array of prompts
  const prompts = data?.pages.flatMap((page) => page.data) || [];

  return (
    <section className="py-8 lg:py-12" id="gallery">
      <div className="w-full px-4 sm:px-6 lg:px-8 xl:px-12">
        {/* Sidebar (mobile) */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
                onClick={toggleSidebar}
              />
              <motion.aside
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed inset-y-0 left-0 w-80 bg-background z-50 lg:hidden overflow-y-auto border-r shadow-xl"
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-[12px] font-black uppercase tracking-widest">Filters</h3>
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

        <div className="flex gap-8 xl:gap-16">
          {/* Sidebar (desktop) */}
          <aside className="hidden lg:block w-60 shrink-0">
            <div className="sticky top-32 h-[calc(100vh-8rem)] overflow-y-auto pr-4 no-scrollbar">
              <FiltersSidebar />
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Content header - matches Filters sidebar header height */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
              <div className="order-2 sm:order-1 overflow-hidden">
                <motion.p 
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40"
                >
                  {isLoading
                    ? "Initializing Lab..."
                    : `${prompts.length} verified results`}
                </motion.p>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-3 order-1 sm:order-2 w-full sm:w-auto">
                {/* View mode toggle */}
                <div className="flex items-center gap-1.5 p-1.5 rounded-2xl bg-muted/30 border border-border/40 backdrop-blur-md overflow-hidden shrink-0">
                  <div className="flex items-center gap-1 px-1">
                    {[
                      { mode: "grid", icon: LayoutGrid, label: "Grid" },
                      { mode: "masonry", icon: Columns2, label: "Masonry" },
                      { mode: "compact", icon: Grid3X3, label: "Compact" },
                      { mode: "list", icon: List, label: "List" },
                    ].map((item) => (
                      <Tooltip key={item.mode}>
                        <TooltipTrigger asChild>
                          <Magnetic>
                            <button
                              onClick={() => setViewMode(item.mode as any)}
                              className={cn(
                                "p-2 rounded-xl transition-all duration-300 relative",
                                viewMode === item.mode
                                  ? "text-primary bg-background shadow-lg shadow-primary/5"
                                  : "text-muted-foreground/60 hover:text-foreground"
                              )}
                              aria-label={`${item.label} view`}
                            >
                              <item.icon className="w-4 h-4" />
                            </button>
                          </Magnetic>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[10px] font-black uppercase tracking-widest">{item.label}</TooltipContent>
                      </Tooltip>
                    ))}
                  </div>

                  <AnimatePresence>
                    {viewMode === "grid" && (
                      <motion.div
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: "auto" }}
                        exit={{ opacity: 0, width: 0 }}
                        className="flex items-center gap-4 px-4 border-l border-border/40 ml-1 h-6 overflow-hidden"
                      >
                        <span className="hidden min-[450px]:inline text-[9px] font-black uppercase tracking-widest text-muted-foreground/30 whitespace-nowrap">
                          Grid Size
                        </span>
                        <input
                          type="range"
                          min="2"
                          max="6"
                          step="1"
                          value={gridColumns}
                          onChange={(e) => setGridColumns(parseInt(e.target.value))}
                          className="w-16 min-[400px]:w-20 sm:w-24 h-1 bg-muted-foreground/10 rounded-full appearance-none cursor-pointer accent-primary"
                        />
                        <div className="flex items-center justify-center w-6 h-6 rounded-lg bg-primary/5 text-[10px] font-black text-primary">
                          {gridColumns}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Filter toggle (mobile) */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleSidebar}
                    className="lg:hidden h-11 px-4 rounded-xl border-border/40 font-bold text-xs"
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                    <span className="hidden min-[450px]:inline ml-2">Filters</span>
                    {hasActiveFilters && (
                      <span className="ml-2 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-black">
                        {types.length + tags.length + (query ? 1 : 0)}
                      </span>
                    )}
                  </Button>

                  {/* Clear filters */}
                  {hasActiveFilters && (
                    <button 
                      onClick={clearFilters} 
                      className="hidden sm:block text-[10px] font-black uppercase tracking-widest text-muted-foreground/40 hover:text-primary transition-colors px-4"
                    >
                      Reset
                    </button>
                  )}
                </div>
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
                  viewMode === "masonry"
                    ? "columns-1 sm:columns-2 xl:columns-3 2xl:columns-4 gap-6 space-y-6 block"
                    : "grid gap-6",
                  viewMode === "grid" && (
                    gridColumns === 2 ? "grid-cols-1 sm:grid-cols-2" :
                    gridColumns === 3 ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" :
                    gridColumns === 4 ? "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" :
                    gridColumns === 5 ? "grid-cols-2 lg:grid-cols-4 xl:grid-cols-5" :
                    "grid-cols-3 lg:grid-cols-5 xl:grid-cols-6"
                  ),
                  viewMode === "compact" && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4",
                  viewMode === "list" && "grid-cols-1"
                )}
              >
                {Array.from({ length: viewMode === "compact" || gridColumns > 4 ? 16 : 12 }).map((_, i) => (
                  <PromptCardSkeleton key={i} viewMode={viewMode} />
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
              <TooltipProvider>
                <motion.div
                  layout
                  className={cn(
                    viewMode === "masonry"
                      ? "columns-1 sm:columns-2 xl:columns-3 2xl:columns-4 gap-6 space-y-6 block"
                      : "grid gap-6",
                    viewMode === "grid" && (
                      gridColumns === 2 ? "grid-cols-1 sm:grid-cols-2" :
                      gridColumns === 3 ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" :
                      gridColumns === 4 ? "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" :
                      gridColumns === 5 ? "grid-cols-2 lg:grid-cols-4 xl:grid-cols-5" :
                      "grid-cols-3 lg:grid-cols-5 xl:grid-cols-6"
                    ),
                    viewMode === "compact" && "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4",
                    viewMode === "list" && "grid-cols-1"
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
                        transition={{ duration: 0.3, delay: index * 0.02 }}
                        className={cn(viewMode === "masonry" && "break-inside-avoid mb-6")}
                      >
                        <PromptCard prompt={prompt} viewMode={viewMode} />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </motion.div>
              </TooltipProvider>
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
