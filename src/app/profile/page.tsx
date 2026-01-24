"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Edit, Settings, LayoutGrid, List, Columns2, Grid3X3, Globe, Lock, Search, X, CheckSquare, Square, Trash2, Eye, EyeOff, Download, FileJson, FileText, FileDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDeletePrompt, useUpdatePrompt } from "@/hooks/use-prompts";
import { exportAsJSON, exportAsCSV, exportAsMarkdown, type ExportablePrompt } from "@/lib/export";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
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
import { useKeyboardNavigation } from "@/hooks/use-keyboard-navigation";

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
  const [searchQuery, setSearchQuery] = React.useState("");

  // Bulk select state
  const [isSelectMode, setIsSelectMode] = React.useState(false);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const deletePromptMutation = useDeletePrompt();
  const updatePromptMutation = useUpdatePrompt();
  const [isBulkProcessing, setIsBulkProcessing] = React.useState(false);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(prompts.map((p: { id: string }) => p.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const exitSelectMode = () => {
    setIsSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = window.confirm(`Delete ${selectedIds.size} prompt${selectedIds.size > 1 ? "s" : ""}? This cannot be undone.`);
    if (!confirmed) return;

    setIsBulkProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) => deletePromptMutation.mutateAsync(id))
      );
      toast.success(`${selectedIds.size} prompt${selectedIds.size > 1 ? "s" : ""} deleted`);
      exitSelectMode();
    } catch {
      toast.error("Failed to delete some prompts");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  const handleBulkVisibility = async (isPublic: boolean) => {
    if (selectedIds.size === 0) return;

    setIsBulkProcessing(true);
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          updatePromptMutation.mutateAsync({ id, data: { isPublic } as Parameters<typeof updatePromptMutation.mutateAsync>[0]["data"] })
        )
      );
      toast.success(`${selectedIds.size} prompt${selectedIds.size > 1 ? "s" : ""} made ${isPublic ? "public" : "private"}`);
      exitSelectMode();
    } catch {
      toast.error("Failed to update some prompts");
    } finally {
      setIsBulkProcessing(false);
    }
  };

  // Export handlers
  const getExportablePrompts = (): ExportablePrompt[] => {
    const promptsToExport = selectedIds.size > 0
      ? prompts.filter((p: { id: string }) => selectedIds.has(p.id))
      : prompts;

    return promptsToExport.map((p: { id: string; title: string; promptText: string; type: string; tags?: string[]; isPublic?: boolean; createdAt: string; copyCount?: number; likeCount?: number }) => ({
      id: p.id,
      title: p.title,
      promptText: p.promptText,
      type: p.type,
      tags: p.tags || [],
      isPublic: p.isPublic ?? true,
      createdAt: p.createdAt,
      copyCount: p.copyCount,
      likeCount: p.likeCount,
    }));
  };

  const handleExportJSON = () => {
    const exportData = getExportablePrompts();
    if (exportData.length === 0) {
      toast.error("No prompts to export");
      return;
    }
    exportAsJSON(exportData);
    toast.success(`Exported ${exportData.length} prompt${exportData.length > 1 ? "s" : ""} as JSON`);
  };

  const handleExportCSV = () => {
    const exportData = getExportablePrompts();
    if (exportData.length === 0) {
      toast.error("No prompts to export");
      return;
    }
    exportAsCSV(exportData);
    toast.success(`Exported ${exportData.length} prompt${exportData.length > 1 ? "s" : ""} as CSV`);
  };

  const handleExportMarkdown = () => {
    const exportData = getExportablePrompts();
    if (exportData.length === 0) {
      toast.error("No prompts to export");
      return;
    }
    exportAsMarkdown(exportData);
    toast.success(`Exported ${exportData.length} prompt${exportData.length > 1 ? "s" : ""} as Markdown`);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["user-prompts", user?.id],
    queryFn: () => fetchUserPrompts(user!.id),
    enabled: !!user?.id,
  });

  const allPrompts = data?.prompts || [];
  const totalCount = data?.total || 0;

  // Filter prompts based on visibility and search
  const prompts = React.useMemo(() => {
    let filtered = allPrompts;

    // Filter by visibility
    if (visibilityFilter === "private") {
      filtered = filtered.filter((p: { isPublic?: boolean }) => p.isPublic === false);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter((p: { title: string; promptText: string; tags?: string[] }) =>
        p.title.toLowerCase().includes(query) ||
        p.promptText.toLowerCase().includes(query) ||
        (p.tags && p.tags.some((tag: string) => tag.toLowerCase().includes(query)))
      );
    }

    return filtered;
  }, [allPrompts, visibilityFilter, searchQuery]);

  const privateCount = React.useMemo(() => {
    return allPrompts.filter((p: { isPublic?: boolean }) => p.isPublic === false).length;
  }, [allPrompts]);

  // Calculate columns for keyboard navigation
  const getNavigationColumns = () => {
    if (viewMode === "list") return 1;
    if (viewMode === "compact") return 5; // approximate for compact
    if (viewMode === "masonry") return 3; // approximate for masonry
    return gridColumns;
  };

  // Keyboard navigation
  const { focusedIndex, isFocused, resetFocus } = useKeyboardNavigation({
    itemCount: prompts.length,
    columns: getNavigationColumns(),
    enabled: !isSelectMode && prompts.length > 0,
    onSelect: (index) => {
      const prompt = prompts[index];
      if (prompt) {
        router.push(`/prompt/${prompt.id}`);
      }
    },
  });

  // Reset focus when prompts change
  React.useEffect(() => {
    resetFocus();
  }, [prompts.length, visibilityFilter, searchQuery, resetFocus]);

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
          className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6 mb-8 sm:mb-12"
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
            <div className="grid grid-cols-3 gap-4 sm:flex sm:gap-6 mt-6">
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold">{totalCount}</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Prompts</p>
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold">0</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Followers</p>
              </div>
              <div className="text-center">
                <p className="text-xl sm:text-2xl font-bold">0</p>
                <p className="text-xs sm:text-sm text-muted-foreground">Following</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* User's Prompts */}
        <div>
          {/* Header Row - Title and Visibility Tabs */}
          <div className="flex flex-col gap-4 mb-6">
            {/* Row 1: Title + Visibility Filter */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <h2 className="text-xl font-semibold whitespace-nowrap">Your Prompts</h2>

                {/* Visibility Filter Tabs */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-secondary/50 border backdrop-blur-sm">
                  <button
                    onClick={() => setVisibilityFilter("all")}
                    className={cn(
                      "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200",
                      visibilityFilter === "all"
                        ? "bg-background shadow-sm text-primary"
                        : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                    )}
                  >
                    <Globe className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    All
                    <span className="text-[10px] sm:text-xs opacity-60">({totalCount})</span>
                  </button>
                  <button
                    onClick={() => setVisibilityFilter("private")}
                    className={cn(
                      "flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200",
                      visibilityFilter === "private"
                        ? "bg-amber-500/20 shadow-sm text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                    )}
                  >
                    <Lock className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    <span className="hidden min-[400px]:inline">Private</span>
                    <span className="text-[10px] sm:text-xs opacity-60">({privateCount})</span>
                  </button>
                </div>
              </div>

              {/* Layout Controls - Desktop */}
              <TooltipProvider>
                <div className="hidden md:flex items-center gap-1 p-1 rounded-xl bg-secondary/50 border backdrop-blur-sm">
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
                        className="flex items-center gap-3 px-3 border-l ml-1 h-6 overflow-hidden"
                      >
                        <span className="text-[10px] font-black uppercase tracking-tighter text-muted-foreground/40 whitespace-nowrap">
                          Size
                        </span>
                        <input
                          type="range"
                          min="2"
                          max="6"
                          step="1"
                          value={gridColumns}
                          onChange={(e) => setGridColumns(parseInt(e.target.value))}
                          className="w-20 h-1.5 bg-muted rounded-full appearance-none cursor-pointer accent-primary hover:accent-primary/80 transition-all"
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

            {/* Row 2: Search + Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Search Input */}
              <div className="relative flex-1 sm:flex-initial sm:w-64 lg:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search your prompts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-8 w-full h-9 rounded-xl bg-secondary/50 border"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-background/80 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Clear search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Select Mode Toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={isSelectMode ? "default" : "outline"}
                      size="sm"
                      onClick={() => isSelectMode ? exitSelectMode() : setIsSelectMode(true)}
                      className="h-9 rounded-xl flex-1 sm:flex-initial"
                    >
                      <CheckSquare className="w-4 h-4 sm:mr-1.5" />
                      <span className="hidden sm:inline">{isSelectMode ? "Cancel" : "Select"}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Bulk select prompts</TooltipContent>
                </Tooltip>

                {/* Export Dropdown */}
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 rounded-xl flex-1 sm:flex-initial"
                          disabled={prompts.length === 0}
                        >
                          <Download className="w-4 h-4 sm:mr-1.5" />
                          <span className="hidden sm:inline">Export</span>
                          {selectedIds.size > 0 && (
                            <span className="ml-1.5 text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded-md">
                              {selectedIds.size}
                            </span>
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      {selectedIds.size > 0
                        ? `Export ${selectedIds.size} selected prompt${selectedIds.size > 1 ? "s" : ""}`
                        : "Export all your prompts"}
                    </TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuLabel>
                      Export {selectedIds.size > 0 ? `${selectedIds.size} selected` : `${prompts.length} prompts`}
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleExportJSON}>
                      <FileJson className="w-4 h-4 mr-2" />
                      JSON
                      <span className="ml-auto text-xs text-muted-foreground">.json</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportCSV}>
                      <FileText className="w-4 h-4 mr-2" />
                      CSV
                      <span className="ml-auto text-xs text-muted-foreground">.csv</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleExportMarkdown}>
                      <FileDown className="w-4 h-4 mr-2" />
                      Markdown
                      <span className="ml-auto text-xs text-muted-foreground">.md</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Layout Controls - Mobile */}
                <div className="md:hidden flex items-center gap-1 p-1 rounded-xl bg-secondary/50 border backdrop-blur-sm">
                  {[
                    { mode: "grid", icon: LayoutGrid, label: "Grid" },
                    { mode: "masonry", icon: Columns2, label: "Masonry" },
                    { mode: "compact", icon: Grid3X3, label: "Compact" },
                    { mode: "list", icon: List, label: "List" },
                  ].map((item) => (
                    <button
                      key={item.mode}
                      onClick={() => setViewMode(item.mode as "grid" | "masonry" | "compact" | "list")}
                      className={cn(
                        "p-1.5 rounded-lg transition-all duration-200",
                        viewMode === item.mode
                          ? "bg-background shadow-sm text-primary"
                          : "text-muted-foreground hover:bg-background/50 hover:text-foreground"
                      )}
                      aria-label={`${item.label} view`}
                    >
                      <item.icon className="w-3.5 h-3.5" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Bulk Action Bar */}
          <AnimatePresence>
            {isSelectMode && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 mb-4 rounded-xl bg-primary/5 border border-primary/20"
              >
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => selectedIds.size === prompts.length ? deselectAll() : selectAll()}
                    className="flex items-center gap-2 text-xs sm:text-sm font-medium hover:text-primary transition-colors"
                  >
                    {selectedIds.size === prompts.length ? (
                      <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    <span className="hidden min-[400px]:inline">
                      {selectedIds.size === prompts.length ? "Deselect All" : "Select All"}
                    </span>
                  </button>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {selectedIds.size} selected
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkVisibility(true)}
                        disabled={selectedIds.size === 0 || isBulkProcessing}
                        className="h-8 px-2 sm:px-3"
                      >
                        <Eye className="w-3.5 h-3.5 sm:mr-1.5" />
                        <span className="hidden sm:inline">Make Public</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Make selected prompts public</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkVisibility(false)}
                        disabled={selectedIds.size === 0 || isBulkProcessing}
                        className="h-8 px-2 sm:px-3"
                      >
                        <EyeOff className="w-3.5 h-3.5 sm:mr-1.5" />
                        <span className="hidden sm:inline">Make Private</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Make selected prompts private</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleBulkDelete}
                        disabled={selectedIds.size === 0 || isBulkProcessing}
                        className="h-8 px-2 sm:px-3"
                      >
                        <Trash2 className="w-3.5 h-3.5 sm:mr-1.5" />
                        <span className="hidden sm:inline">Delete</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Delete selected prompts</TooltipContent>
                  </Tooltip>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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

          {!isLoading && prompts.length === 0 && !searchQuery && allPrompts.length === 0 && (
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

          {!isLoading && prompts.length === 0 && (searchQuery || visibilityFilter === "private") && (
            <EmptyState
              icon={<Search className="w-8 h-8 text-muted-foreground" />}
              title="No prompts found"
              description={
                searchQuery
                  ? `No prompts match "${searchQuery}"`
                  : "You don't have any private prompts"
              }
              action={
                <Button variant="outline" onClick={() => { setSearchQuery(""); setVisibilityFilter("all"); }}>
                  Clear Filters
                </Button>
              }
            />
          )}

          {/* Keyboard navigation hint */}
          {!isLoading && prompts.length > 0 && focusedIndex >= 0 && (
            <div className="mb-4 text-xs text-muted-foreground flex items-center gap-2">
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Arrow keys</kbd>
              <span>to navigate</span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Enter</kbd>
              <span>to open</span>
              <kbd className="px-1.5 py-0.5 rounded bg-muted font-mono">Esc</kbd>
              <span>to cancel</span>
            </div>
          )}

          {!isLoading && prompts.length > 0 && viewMode === "masonry" && (
            <MasonryGrid>
              {(prompts as Array<Parameters<typeof PromptCard>[0]["prompt"]>).map((prompt, index) => (
                <motion.div
                  key={prompt.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.02, 0.5) }}
                  className={cn(
                    "mb-6 relative rounded-xl transition-all",
                    isFocused(index) && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                  role="article"
                  aria-label={`Prompt: ${prompt.title}`}
                  tabIndex={isFocused(index) ? 0 : -1}
                >
                  {isSelectMode && (
                    <button
                      onClick={() => toggleSelect(prompt.id)}
                      className={cn(
                        "absolute -top-2 -left-2 z-10 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                        selectedIds.has(prompt.id)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-background border-muted-foreground/30 hover:border-primary"
                      )}
                      aria-label={selectedIds.has(prompt.id) ? "Deselect prompt" : "Select prompt"}
                    >
                      {selectedIds.has(prompt.id) && <CheckSquare className="w-4 h-4" />}
                    </button>
                  )}
                  <div className={cn(isSelectMode && "cursor-pointer")} onClick={() => isSelectMode && toggleSelect(prompt.id)}>
                    <PromptCard prompt={prompt} viewMode={viewMode} />
                  </div>
                </motion.div>
              ))}
            </MasonryGrid>
          )}
          {!isLoading && prompts.length > 0 && viewMode !== "masonry" && (
            <div className={getGridClasses()} role="list" aria-label="Your prompts">
              {(prompts as Array<Parameters<typeof PromptCard>[0]["prompt"]>).map((prompt, index) => (
                <motion.div
                  key={prompt.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.02, 0.5) }}
                  className={cn(
                    "relative rounded-xl transition-all",
                    isFocused(index) && "ring-2 ring-primary ring-offset-2 ring-offset-background"
                  )}
                  role="listitem"
                  aria-label={`Prompt: ${prompt.title}`}
                  tabIndex={isFocused(index) ? 0 : -1}
                >
                  {isSelectMode && (
                    <button
                      onClick={() => toggleSelect(prompt.id)}
                      className={cn(
                        "absolute -top-2 -left-2 z-10 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all",
                        selectedIds.has(prompt.id)
                          ? "bg-primary border-primary text-primary-foreground"
                          : "bg-background border-muted-foreground/30 hover:border-primary"
                      )}
                      aria-label={selectedIds.has(prompt.id) ? "Deselect prompt" : "Select prompt"}
                    >
                      {selectedIds.has(prompt.id) && <CheckSquare className="w-4 h-4" />}
                    </button>
                  )}
                  <div className={cn(isSelectMode && "cursor-pointer")} onClick={() => isSelectMode && toggleSelect(prompt.id)}>
                    <PromptCard prompt={prompt} viewMode={viewMode} />
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
